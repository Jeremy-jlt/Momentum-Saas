function siteFromQuery() {
  const params = new URLSearchParams(location.search)
  return params.get('site') || ''
}

function siteFromReferrer() {
  if (!document.referrer) return ''
  try {
    return new URL(document.referrer).hostname.replace(/^www\./, '')
  } catch (err) {
    return ''
  }
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

let countdownInterval = null

function startCountdown(endsAt) {
  const el = document.getElementById('countdown')
  if (!endsAt) {
    el.textContent = '--:--:--'
    return
  }

  if (countdownInterval) clearInterval(countdownInterval)

  const tick = () => {
    el.textContent = formatCountdown(endsAt - Date.now())
  }

  tick()
  countdownInterval = setInterval(tick, 1000)
}

async function init() {
  const site = siteFromQuery() || siteFromReferrer() || 'ce site'
  document.getElementById('site-name').textContent = site

  chrome.runtime.sendMessage({ type: 'getSessionInfo', siteName: site }, (response) => {
    if (chrome.runtime.lastError) {
      startCountdown(null)
      return
    }
    startCountdown(response?.endsAt || null)
    if (response?.siteName) {
      document.getElementById('site-name').textContent = response.siteName
    }
  })
}

document.getElementById('btn-back').addEventListener('click', () => {
  history.back()
})

init()
