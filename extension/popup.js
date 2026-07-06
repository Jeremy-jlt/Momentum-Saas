const viewLogin = document.getElementById('view-login')
const viewActive = document.getElementById('view-active')
const viewEmpty = document.getElementById('view-empty')
const viewStartSession = document.getElementById('view-start-session')
const viewSessionEnd = document.getElementById('view-session-end')

const ALL_VIEWS = [viewLogin, viewActive, viewEmpty, viewStartSession, viewSessionEnd]

let countdownInterval = null
let cachedProjets = []
let cachedHabitudes = []

function showView(view) {
  ALL_VIEWS.forEach((v) => v.classList.add('hidden'))
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
      waitForSessionEnd()
    }
  }

  tick()
  countdownInterval = setInterval(tick, 1000)
}

// Le compte à rebours du popup est précis à la seconde, mais chrome.alarms
// (côté background.js) ne se déclenche pas forcément pile à 0 — il peut
// traîner de plusieurs dizaines de secondes. Si on affichait "Aucune session
// active" dès que le compte à rebours atteint 0, on aurait presque toujours
// un flash incorrect avant l'écran de fin. On attend donc que
// momentum_session_summary apparaisse (avec un filet de sécurité si jamais
// il n'apparaît pas).
async function waitForSessionEnd() {
  const maxAttempts = 20
  for (let i = 0; i < maxAttempts; i++) {
    const { momentum_session_summary: summary } = await chrome.storage.local.get(
      'momentum_session_summary'
    )
    if (summary) {
      showSessionEnd(summary)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
  // Filet de sécurité : si toujours rien après ~30s, on retombe sur le rendu normal.
  render()
}

// Signal poussé par background.js dès que la session est vraiment terminée
// (règles de blocage levées, session_travail enregistrée). Beaucoup plus
// réactif que la boucle de sondage de waitForSessionEnd.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'sessionEnded') {
    render()
  }
})

async function render() {
  const auth = await getAuth()

  if (!auth) {
    showView(viewLogin)
    return
  }

  const { momentum_session_summary: summary } = await chrome.storage.local.get(
    'momentum_session_summary'
  )
  if (summary) {
    showSessionEnd(summary)
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

function showSessionEnd(summary) {
  document.getElementById('end-summary').textContent =
    `Tu as travaillé ${summary.duree_minutes} minutes sur ${summary.projet_nom}.`

  const habitudeEl = document.getElementById('end-habitude')
  if (summary.habitude_nom) {
    habitudeEl.textContent = `✓ "${summary.habitude_nom}" cochée automatiquement dans ton tracker`
    habitudeEl.classList.remove('hidden', 'warning')
  } else if (summary.session_trop_courte) {
    habitudeEl.textContent = `⚠ Session trop courte — ${summary.temps_minimum_minutes} min minimum requis pour cocher "${summary.habitude_nom_visee}"`
    habitudeEl.classList.remove('hidden')
    habitudeEl.classList.add('warning')
  } else {
    habitudeEl.classList.add('hidden')
    habitudeEl.classList.remove('warning')
  }

  showView(viewSessionEnd)
}

async function loadProjetsAndHabitudes() {
  const auth = await getAuth()
  if (!auth) return

  try {
    cachedProjets = await supabaseGet(
      `projets?user_id=eq.${auth.user.id}&actif=eq.true&select=id,nom,couleur,habitude_id,temps_minimum_minutes&order=nom.asc`
    )
  } catch (err) {
    cachedProjets = []
  }

  try {
    cachedHabitudes = await supabaseGet(
      `habitudes?user_id=eq.${auth.user.id}&actif=eq.true&select=id,nom,emoji`
    )
  } catch (err) {
    cachedHabitudes = []
  }
}

function populateProjetSelect() {
  const select = document.getElementById('projet')
  select.innerHTML = ''

  cachedProjets.forEach((p) => {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = p.nom
    select.appendChild(opt)
  })

  const newOpt = document.createElement('option')
  newOpt.value = '__new__'
  newOpt.textContent = '+ Créer un nouveau projet'
  select.appendChild(newOpt)

  document.getElementById('new-projet-nom').classList.toggle('hidden', cachedProjets.length > 0)
}

async function showStartSessionForm() {
  const auth = await getAuth()
  document.getElementById('start-email').textContent = auth?.email || ''
  document.getElementById('tache').value = ''
  document.getElementById('new-projet-nom').value = ''
  document.getElementById('duree').value = '25'
  document.getElementById('duree-custom').value = ''
  document.getElementById('duree-custom').classList.add('hidden')
  document.getElementById('start-error').classList.add('hidden')

  await loadProjetsAndHabitudes()
  populateProjetSelect()

  showView(viewStartSession)
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

document.getElementById('btn-manual').addEventListener('click', showStartSessionForm)

document.getElementById('projet').addEventListener('change', (e) => {
  document.getElementById('new-projet-nom').classList.toggle('hidden', e.target.value !== '__new__')
})

document.getElementById('duree').addEventListener('change', (e) => {
  document.getElementById('duree-custom').classList.toggle('hidden', e.target.value !== 'custom')
})

document.getElementById('btn-cancel-start').addEventListener('click', render)

document.getElementById('btn-start-session').addEventListener('click', async () => {
  const errorEl = document.getElementById('start-error')
  errorEl.classList.add('hidden')

  const tache = document.getElementById('tache').value.trim()
  const projetSelect = document.getElementById('projet')
  const projetValue = projetSelect.value
  const newProjetNom = document.getElementById('new-projet-nom').value.trim()
  const dureeSelect = document.getElementById('duree').value
  const dureeCustom = document.getElementById('duree-custom').value

  if (!tache) {
    errorEl.textContent = 'Décris ce que tu vas faire.'
    errorEl.classList.remove('hidden')
    return
  }
  if (projetValue === '__new__' && !newProjetNom) {
    errorEl.textContent = 'Donne un nom à ton nouveau projet.'
    errorEl.classList.remove('hidden')
    return
  }

  const dureeMinutes = dureeSelect === 'custom' ? Number(dureeCustom) : Number(dureeSelect)
  if (!dureeMinutes || dureeMinutes <= 0) {
    errorEl.textContent = 'Indique une durée valide.'
    errorEl.classList.remove('hidden')
    return
  }

  let projetId
  let projetNom
  let habitudeId = null
  let habitudeNom = null
  let tempsMinimumMinutes = 30

  try {
    if (projetValue === '__new__') {
      const auth = await getAuth()
      const [created] = await supabasePost('projets', {
        user_id: auth.user.id,
        nom: newProjetNom,
        couleur: '#10b981',
      })
      projetId = created.id
      projetNom = created.nom
    } else {
      const projet = cachedProjets.find((p) => p.id === projetValue)
      if (!projet) throw new Error('Projet introuvable.')
      projetId = projet.id
      projetNom = projet.nom
      habitudeId = projet.habitude_id || null
      habitudeNom = habitudeId
        ? cachedHabitudes.find((h) => h.id === habitudeId)?.nom || null
        : null
      tempsMinimumMinutes = projet.temps_minimum_minutes || 30
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Impossible de créer le projet.'
    errorEl.classList.remove('hidden')
    return
  }

  await chrome.runtime.sendMessage({
    type: 'startManualSession',
    session: {
      tache,
      projet_id: projetId,
      projet_nom: projetNom,
      habitude_id: habitudeId,
      habitude_nom: habitudeNom,
      temps_minimum_minutes: tempsMinimumMinutes,
      duree_minutes: dureeMinutes,
      sites_bloques: allLabels(),
    },
  })

  render()
})

document.getElementById('btn-stop').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'stopSession' })
  render()
})

document.getElementById('btn-new-session').addEventListener('click', async () => {
  await chrome.storage.local.remove('momentum_session_summary')
  showStartSessionForm()
})

document.getElementById('btn-close-end').addEventListener('click', async () => {
  await chrome.storage.local.remove('momentum_session_summary')
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
