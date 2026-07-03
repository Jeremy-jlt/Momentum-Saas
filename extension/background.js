importScripts('supabase.js', 'blockedSites.js')

const SYNC_ALARM = 'sync'
const MANUAL_SESSION_ALARM = 'manualSessionEnd'
const MANUAL_SESSION_MINUTES = 25
const RULE_ID_BASE = 1000

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 1 })
  syncWithSupabase()
})

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 1 })
  syncWithSupabase()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) {
    syncWithSupabase()
  } else if (alarm.name === MANUAL_SESSION_ALARM) {
    endManualSession()
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'startManualSession') {
    startManualSession().then(() => sendResponse({ ok: true }))
    return true
  }
  if (message?.type === 'stopSession') {
    stopSession().then(() => sendResponse({ ok: true }))
    return true
  }
  if (message?.type === 'auth-updated') {
    syncWithSupabase().then(() => sendResponse({ ok: true }))
    return true
  }
  return false
})

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function isWithinRange(nowMinutes, debut, fin) {
  const start = timeToMinutes(debut)
  const end = timeToMinutes(fin)
  if (start === end) return false
  if (start < end) {
    return nowMinutes >= start && nowMinutes < end
  }
  // plage traversant minuit
  return nowMinutes >= start || nowMinutes < end
}

// Enlève protocole / chemin / "www." pour obtenir un domaine nu utilisable dans un urlFilter
function sanitizeDomain(domain) {
  return domain
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase()
}

function buildRule(domain, id) {
  return {
    id,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { extensionPath: '/blocked.html' },
    },
    condition: {
      urlFilter: `||${sanitizeDomain(domain)}`,
      resourceTypes: ['main_frame'],
    },
  }
}

// Source de vérité unique pour l'état des règles : toujours passer par ici,
// jamais d'appel direct à updateDynamicRules ailleurs dans le fichier.
async function applyBlockRules(domains) {
  try {
    const existing = await chrome.declarativeNetRequest.getDynamicRules()
    const removeRuleIds = existing.map((r) => r.id)
    const addRules = domains.map((domain, i) => buildRule(domain, RULE_ID_BASE + i))

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    })

    console.log(`[Momentum] Session démarrée, ${addRules.length} règles ajoutées`)
    console.log('[Momentum] Règles mises à jour :', domains)

    const verify = await chrome.declarativeNetRequest.getDynamicRules()
    console.log(`[Momentum] Vérification : ${verify.length} règles actives dans declarativeNetRequest`)
  } catch (err) {
    console.error('[Momentum] Échec de la création des règles de blocage :', err)
  }
}

async function clearBlockRules() {
  try {
    const existing = await chrome.declarativeNetRequest.getDynamicRules()
    const removeRuleIds = existing.map((r) => r.id)
    if (removeRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds })
    }
    console.log('[Momentum] Session terminée, règles supprimées')
  } catch (err) {
    console.error('[Momentum] Échec de la suppression des règles de blocage :', err)
  }
}

async function getActiveManualSession() {
  const { momentum_active_session } = await chrome.storage.local.get('momentum_active_session')
  if (momentum_active_session?.source === 'manual' && momentum_active_session.endsAt > Date.now()) {
    return momentum_active_session
  }
  return null
}

async function syncWithSupabase() {
  // Une session de test manuelle est prioritaire : la synchro Supabase ne doit
  // jamais lui retirer ses règles tant qu'elle n'est pas terminée/arrêtée.
  const manualSession = await getActiveManualSession()
  if (manualSession) {
    console.log(
      `[Momentum] Sync ignorée : session manuelle active jusqu'à ${new Date(manualSession.endsAt).toLocaleTimeString()}`
    )
    return
  }

  const auth = await getAuth()
  if (!auth || !auth.user?.id) {
    await clearBlockRules()
    await chrome.storage.local.set({ momentum_active_session: null })
    return
  }

  let engagements = []
  try {
    engagements = await supabaseGet(
      `engagements?user_id=eq.${auth.user.id}&statut=eq.en_cours&select=*`
    )
  } catch (err) {
    console.error('[Momentum] Échec de récupération des engagements :', err)
    return
  }

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const activeEngagements = engagements.filter((eng) =>
    isWithinRange(nowMinutes, eng.heure_debut, eng.heure_fin)
  )

  if (activeEngagements.length === 0) {
    await clearBlockRules()
    await chrome.storage.local.set({ momentum_active_session: null })
    return
  }

  const allBlockedDomains = new Set()
  activeEngagements.forEach((eng) => {
    domainsForLabels(eng.sites_bloques || []).forEach((d) => allBlockedDomains.add(d))
  })

  await applyBlockRules([...allBlockedDomains])

  const primary = activeEngagements[0]
  const [endH, endM] = primary.heure_fin.split(':').map(Number)
  const endsAt = new Date(now)
  endsAt.setHours(endH, endM, 0, 0)
  if (endsAt <= now) {
    endsAt.setDate(endsAt.getDate() + 1)
  }

  await chrome.storage.local.set({
    momentum_active_session: {
      source: 'engagement',
      nom: primary.nom,
      domains: [...allBlockedDomains],
      endsAt: endsAt.getTime(),
    },
  })
}

async function startManualSession() {
  const domains = allDomains()
  await applyBlockRules(domains)

  const endsAt = Date.now() + MANUAL_SESSION_MINUTES * 60 * 1000

  await chrome.storage.local.set({
    momentum_active_session: {
      source: 'manual',
      nom: 'Session de test',
      domains,
      endsAt,
    },
  })

  chrome.alarms.create(MANUAL_SESSION_ALARM, { delayInMinutes: MANUAL_SESSION_MINUTES })
}

async function endManualSession() {
  await clearBlockRules()
  await chrome.storage.local.set({ momentum_active_session: null })
}

async function stopSession() {
  chrome.alarms.clear(MANUAL_SESSION_ALARM)
  await clearBlockRules()
  await chrome.storage.local.set({ momentum_active_session: null })
}
