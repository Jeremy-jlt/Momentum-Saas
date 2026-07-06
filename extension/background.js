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
    startManualSession(message.session).then(() => sendResponse({ ok: true }))
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
  if (message?.type === 'getSessionInfo') {
    getSessionInfo(message.siteName).then(sendResponse)
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
  const cleanDomain = sanitizeDomain(domain)
  return {
    id,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        extensionPath: `/blocked.html?site=${encodeURIComponent(cleanDomain)}`,
      },
    },
    condition: {
      urlFilter: `||${cleanDomain}`,
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

async function getSessionInfo(siteName) {
  const { momentum_active_session } = await chrome.storage.local.get('momentum_active_session')
  return {
    endsAt: momentum_active_session?.endsAt || null,
    siteName: siteName || null,
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

function currentTimeHHMM() {
  return new Date().toTimeString().slice(0, 5)
}

function currentDateISO() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// sessionInfo (optionnel, envoyé par le formulaire de déclaration de travail
// du popup) : { tache, projet_id, projet_nom, habitude_id, habitude_nom,
// duree_minutes, sites_bloques }. Sans sessionInfo, on retombe sur l'ancien
// comportement (bloque tout, 25 minutes) pour ne rien casser.
async function startManualSession(sessionInfo) {
  const domains = sessionInfo?.sites_bloques?.length
    ? domainsForLabels(sessionInfo.sites_bloques)
    : allDomains()
  await applyBlockRules(domains)

  const dureeMinutes = sessionInfo?.duree_minutes || MANUAL_SESSION_MINUTES
  const endsAt = Date.now() + dureeMinutes * 60 * 1000

  await chrome.storage.local.set({
    momentum_active_session: {
      source: 'manual',
      nom: sessionInfo?.tache || 'Session de test',
      domains,
      endsAt,
    },
  })

  if (sessionInfo) {
    const auth = await getAuth()
    await chrome.storage.local.set({
      sessionActive: {
        tache: sessionInfo.tache,
        projet_id: sessionInfo.projet_id,
        projet_nom: sessionInfo.projet_nom,
        habitude_id: sessionInfo.habitude_id || null,
        habitude_nom: sessionInfo.habitude_nom || null,
        temps_minimum_minutes: sessionInfo.temps_minimum_minutes || 30,
        duree_minutes: dureeMinutes,
        heure_debut: currentTimeHHMM(),
        sites_bloques: sessionInfo.sites_bloques || [],
        user_id: auth?.user?.id,
      },
    })
  } else {
    await chrome.storage.local.remove('sessionActive')
  }

  chrome.alarms.clear(MANUAL_SESSION_ALARM)
  chrome.alarms.create(MANUAL_SESSION_ALARM, { delayInMinutes: dureeMinutes })
}

// Enregistre la session de travail terminée dans Supabase et, si le projet
// est lié à une habitude, coche automatiquement cette habitude pour aujourd'hui.
async function finalizeSessionActive() {
  const { sessionActive } = await chrome.storage.local.get('sessionActive')
  if (!sessionActive) return

  const today = currentDateISO()
  let habitudeCochee = false

  try {
    const [createdSession] = await supabasePost('sessions_travail', {
      user_id: sessionActive.user_id,
      projet_id: sessionActive.projet_id,
      tache: sessionActive.tache,
      duree_minutes: sessionActive.duree_minutes,
      date: today,
      heure_debut: sessionActive.heure_debut,
      heure_fin: currentTimeHHMM(),
      sites_bloques: sessionActive.sites_bloques || [],
      completion_creee: false,
    })

    const tempsMinimum = sessionActive.temps_minimum_minutes || 30
    const dureeSuffisante = sessionActive.duree_minutes >= tempsMinimum

    if (sessionActive.habitude_id && dureeSuffisante) {
      try {
        await supabaseUpsert(
          'completions',
          { habitude_id: sessionActive.habitude_id, date: today, user_id: sessionActive.user_id },
          'habitude_id,date'
        )
        habitudeCochee = true

        if (createdSession?.id) {
          await supabasePatch(`sessions_travail?id=eq.${createdSession.id}`, {
            completion_creee: true,
          })
        }
      } catch (err) {
        console.error('[Momentum] Échec de la completion automatique :', err)
      }
    }
  } catch (err) {
    console.error("[Momentum] Échec de l'enregistrement de la session de travail :", err)
  }

  const tempsMinimumMinutes = sessionActive.temps_minimum_minutes || 30
  const sessionTropCourte =
    !!sessionActive.habitude_id && !habitudeCochee && sessionActive.duree_minutes < tempsMinimumMinutes

  await chrome.storage.local.set({
    momentum_session_summary: {
      duree_minutes: sessionActive.duree_minutes,
      projet_nom: sessionActive.projet_nom,
      habitude_nom: habitudeCochee ? sessionActive.habitude_nom : null,
      habitude_nom_visee: sessionActive.habitude_id ? sessionActive.habitude_nom : null,
      session_trop_courte: sessionTropCourte,
      temps_minimum_minutes: tempsMinimumMinutes,
    },
  })

  await chrome.storage.local.remove('sessionActive')
}

async function endManualSession() {
  await finalizeSessionActive()
  await clearBlockRules()
  await chrome.storage.local.set({ momentum_active_session: null })

  // Prévient le popup s'il est ouvert (chrome.alarms n'étant pas précis à la
  // milliseconde, le popup ne peut pas se fier uniquement à son propre
  // compte à rebours pour savoir quand la session est réellement terminée).
  // Si le popup est fermé, sendMessage rejette silencieusement — c'est attendu.
  chrome.runtime.sendMessage({ type: 'sessionEnded' }).catch(() => {})
}

async function stopSession() {
  chrome.alarms.clear(MANUAL_SESSION_ALARM)
  await clearBlockRules()
  await chrome.storage.local.set({ momentum_active_session: null })
  await chrome.storage.local.remove('sessionActive')
}
