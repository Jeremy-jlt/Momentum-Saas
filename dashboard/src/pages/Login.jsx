import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Compte créé. Vérifie tes emails si une confirmation est requise, sinon connecte-toi.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/')
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="anim-fade-up w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="font-bold tracking-widest text-sm text-[var(--text-strong)]">MOMENTUM</span>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1 text-[var(--text-strong)]">
          {mode === 'signin' ? 'Connexion' : 'Inscription'}
        </h1>
        <p className="text-[var(--text-faint)] text-sm text-center mb-8">
          {mode === 'signin'
            ? 'Reprends le contrôle de tes heures.'
            : "Crée ton compte pour commencer."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-[var(--text-faint)] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="toi@exemple.com"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-faint)] mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border border-[var(--border)] text-[var(--text)] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
          {info && <p className="text-[var(--accent)] text-sm">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-[background-color,transform] text-[var(--accent-contrast)] font-bold rounded-md py-2 text-sm disabled:opacity-50"
          >
            {loading ? 'Patiente...' : mode === 'signin' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-faint)] mt-6">
          {mode === 'signin' ? "Pas encore de compte ?" : 'Déjà un compte ?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError('')
              setInfo('')
            }}
            className="text-[var(--accent)] hover:underline"
          >
            {mode === 'signin' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}
