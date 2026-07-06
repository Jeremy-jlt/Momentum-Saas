import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/verify-screenshot`

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MobileVerify() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [engagement, setEngagement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle') // idle | sending | success | failure
  const [resultat, setResultat] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!token) {
      setError('Lien de vérification invalide.')
      setLoading(false)
      return
    }

    fetch(`${FUNCTION_URL}?token=${encodeURIComponent(token)}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Engagement introuvable.')
        setEngagement(data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setError('')
  }

  const handleSubmit = async () => {
    if (!file) {
      setError("Choisis une capture d'écran avant d'envoyer.")
      return
    }
    setError('')
    setStatus('sending')

    try {
      const base64 = await fileToBase64(file)
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          token,
          imageBase64: base64,
          mimeType: file.type,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Vérification impossible.')

      setResultat(data)
      setStatus(data.reussi ? 'success' : 'failure')
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
      setStatus('idle')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-strong)] flex items-center justify-center px-6">
        <p className="text-[var(--text-faint)] text-lg">Chargement...</p>
      </div>
    )
  }

  if (error && !engagement) {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-strong)] flex items-center justify-center px-6 text-center">
        <p className="text-[var(--danger)] text-lg">{error}</p>
      </div>
    )
  }

  if (status === 'sending') {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-strong)] flex items-center justify-center px-6 text-center">
        <p className="text-[var(--text-muted)] text-xl font-bold">Vérification en cours...</p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-strong)] flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)] flex items-center justify-center">
          <svg
            className="w-10 h-10 text-[var(--accent)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Engagement tenu</h1>
        {resultat?.raison && (
          <p className="text-[var(--text-faint)] text-base max-w-xs">{resultat.raison}</p>
        )}
        <p className="text-[var(--text-faint)] text-sm mt-4">
          Le résultat s'affiche aussi sur ton ordinateur.
        </p>
      </div>
    )
  }

  if (status === 'failure') {
    return (
      <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-strong)] flex flex-col items-center justify-center px-6 text-center gap-4">
        <h1 className="text-2xl font-bold">Engagement non vérifié</h1>
        {resultat?.raison && (
          <p className="text-[var(--text-faint)] text-base max-w-xs">{resultat.raison}</p>
        )}
        <p className="text-[var(--text-faint)] text-sm mt-4">
          Le résultat s'affiche aussi sur ton ordinateur.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[var(--text-strong)] flex flex-col px-6 py-10">
      <div className="flex items-center gap-2 mb-8">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="font-bold tracking-widest text-sm">MOMENTUM</span>
      </div>

      <h1 className="text-2xl font-bold mb-1">{engagement?.nom}</h1>
      {Array.isArray(engagement?.sites_bloques) && (
        <p className="text-[var(--text-faint)] text-base mb-8">
          Sites concernés : {engagement.sites_bloques.join(', ')}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Aperçu de la capture"
          className="w-full rounded-lg border border-[var(--border)] mb-4 max-h-80 object-contain"
        />
      ) : (
        <div className="w-full border-2 border-dashed border-[var(--border)] rounded-lg py-16 flex items-center justify-center mb-4 text-[var(--text-faint)] text-base text-center px-4">
          Aucune capture sélectionnée
        </div>
      )}

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full border border-[var(--border)] text-[var(--text-muted)] rounded-lg py-4 text-lg font-bold mb-4 active:border-[var(--border-strong)]"
      >
        Choisir une photo
      </button>

      {error && <p className="text-[var(--danger)] text-base mb-4">{error}</p>}

      <button
        onClick={handleSubmit}
        className="w-full bg-[var(--accent)] active:bg-[var(--accent-hover)] text-[var(--accent-contrast)] font-bold rounded-lg py-4 text-lg"
      >
        Envoyer pour vérification
      </button>
    </div>
  )
}
