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

async function applyBlockRules(domains) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existing.map((r) => r.id)

  const addRules = domains.map((domain, i) => ({
    id: RULE_ID_BASE + i,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: { extensionPath: '/blocked.html' },
    },
    condition: {
      requestDomains: [domain],
      resourceTypes: ['main_frame'],
    },
  }))

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  })
}

async function clearBlockRules() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules()
  const removeRuleIds = existing.map((r) => r.id)
  if (removeRuleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds })
  }
}

async function syncWithSupabase() {
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
