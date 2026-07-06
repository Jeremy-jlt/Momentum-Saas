const SUPABASE_URL = 'https://fvszdhxlgkekdljehdjy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_AZ3HcU21Nk_I_i2R9sQkxg_JWbblVtJ'

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error_description || data.msg || 'Connexion impossible')
  }

  const auth = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user,
    email: data.user?.email,
  }

  await chrome.storage.local.set({ momentum_auth: auth })
  return auth
}

async function getAuth() {
  const { momentum_auth } = await chrome.storage.local.get('momentum_auth')
  return momentum_auth || null
}

async function clearAuth() {
  await chrome.storage.local.remove('momentum_auth')
}

async function refreshSession() {
  const auth = await getAuth()
  if (!auth || !auth.refresh_token) {
    throw new Error('Aucune session à rafraîchir')
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: auth.refresh_token }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error_description || data.msg || 'Rafraîchissement impossible')
  }

  const newAuth = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: data.user,
    email: data.user?.email || auth.email,
  }

  await chrome.storage.local.set({ momentum_auth: newAuth })
  return newAuth
}

async function supabaseGet(endpoint) {
  const auth = await getAuth()
  if (!auth) {
    throw new Error('Non connecté')
  }

  const doRequest = async (token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    })

  let res = await doRequest(auth.access_token)

  if (res.status === 401) {
    try {
      const refreshed = await refreshSession()
      res = await doRequest(refreshed.access_token)
    } catch (err) {
      await clearAuth()
      throw new Error('Session expirée, reconnecte-toi.')
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.message || `Erreur Supabase (${res.status})`)
  }

  return res.json()
}

// method: 'POST' | 'PATCH'. `preferHeader` permet de personnaliser l'en-tête
// Prefer (ex: résolution d'upsert sur conflit d'unicité).
async function supabaseWrite(method, endpoint, body, preferHeader) {
  const auth = await getAuth()
  if (!auth) {
    throw new Error('Non connecté')
  }

  const doRequest = async (token) =>
    fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: preferHeader || 'return=representation',
      },
      body: JSON.stringify(body),
    })

  let res = await doRequest(auth.access_token)

  if (res.status === 401) {
    try {
      const refreshed = await refreshSession()
      res = await doRequest(refreshed.access_token)
    } catch (err) {
      await clearAuth()
      throw new Error('Session expirée, reconnecte-toi.')
    }
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.message || `Erreur Supabase (${res.status})`)
  }

  return res.json()
}

async function supabasePost(endpoint, body) {
  return supabaseWrite('POST', endpoint, body)
}

async function supabasePatch(endpoint, body) {
  return supabaseWrite('PATCH', endpoint, body)
}

// Insère en ignorant silencieusement les conflits d'unicité (ex: une
// completion déjà existante pour ce jour). `onConflict` liste les colonnes de
// la contrainte unique concernée (ex: "habitude_id,date").
async function supabaseUpsert(endpoint, body, onConflict) {
  const query = onConflict ? `${endpoint}?on_conflict=${onConflict}` : endpoint
  return supabaseWrite('POST', query, body, 'resolution=merge-duplicates,return=representation')
}

// eslint-disable-next-line no-unused-vars
const MomentumSupabase = {
  signIn,
  getAuth,
  clearAuth,
  refreshSession,
  supabaseGet,
  supabasePost,
  supabasePatch,
  supabaseUpsert,
}
