const viewLogin = document.getElementById('view-login')
const viewActive = document.getElementById('view-active')
const viewEmpty = document.getElementById('view-empty')

let countdownInterval = null

function showView(view) {
  viewLogin.classList.add('hidden')
  viewActive.classList.add('hidden')
  viewEmpty.classList.add('hidden')
  view.classList.remove('hidden')
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function startCountdown(endsAt) {
  if (countdownInterval) clearInterval(countdownInterval)
  const el = document.getElementById('active-countdown')

  const tick = () => {
    const remaining = endsAt - Date.now()
    el.textContent = formatCountdown(remaining)
    if (remaining <= 0) {
      clearInterval(countdownInterval)
      render()
    }
  }

  tick()
  countdownInterval = setInterval(tick, 1000)
}

async function render() {
  const auth = await getAuth()

  if (!auth) {
    showView(viewLogin)
    return
  }

  const { momentum_active_session: session } = await chrome.storage.local.get(
    'momentum_active_session'
  )

  if (session && session.endsAt > Date.now()) {
    document.getElementById('active-email').textContent = auth.email || ''
    document.getElementById('active-name').textContent = session.nom
    const domainsEl = document.getElementById('active-domains')
    domainsEl.innerHTML = ''
    ;(session.domains || []).forEach((d) => {
      const pill = document.createElement('span')
      pill.className = 'domain-pill'
      pill.textContent = d
      domainsEl.appendChild(pill)
    })
    startCountdown(session.endsAt)
    showView(viewActive)
  } else {
    document.getElementById('empty-email').textContent = auth.email || ''
    showView(viewEmpty)
  }
}

document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim()
  const password = document.getElementById('password').value
  const errorEl = document.getElementById('login-error')
  errorEl.classList.add('hidden')

  if (!email || !password) {
    errorEl.textContent = 'Renseigne ton email et ton mot de passe.'
    errorEl.classList.remove('hidden')
    return
  }

  try {
    await signIn(email, password)
    await chrome.runtime.sendMessage({ type: 'auth-updated' })
    render()
  } catch (err) {
    errorEl.textContent = err.message || 'Connexion impossible.'
    errorEl.classList.remove('hidden')
  }
})

document.getElementById('btn-manual').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'startManualSession' })
  render()
})

document.getElementById('btn-stop').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'stopSession' })
  render()
})

async function handleLogout() {
  await chrome.runtime.sendMessage({ type: 'stopSession' })
  await clearAuth()
  render()
}

document.getElementById('btn-logout-1').addEventListener('click', handleLogout)
document.getElementById('btn-logout-2').addEventListener('click', handleLogout)

render()
