import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { useToast } from '../components/Toast'

const POLL_INTERVAL_MS = 3000
const POLL_FAILURE_THRESHOLD = 3

export default function Verification() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const engagementId = searchParams.get('id')

  const [engagement, setEngagement] = useState(null)
  const [token, setToken] = useState(null)
  const [statut, setStatut] = useState(null)
  const [resultat, setResultat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const pollRef = useRef(null)
  const pollFailuresRef = useRef(0)
  const showToast = useToast()

  // Prépare (ou réutilise) le token de vérification et l'affiche via QR code
  useEffect(() => {
    if (!user || !engagementId) return

    let cancelled = false

    async function setup() {
      const { data, error: fetchError } = await supabase
        .from('engagements')
        .select('*')
        .eq('id', engagementId)
        .eq('user_id', user.id)
        .single()

      if (cancelled) return

      if (fetchError || !data) {
        setError("Impossible de charger cet engagement.")
        setLoading(false)
        return
      }

      setEngagement(data)

      const reusableToken =
        data.verification_token &&
        data.verification_statut !== 'reussi' &&
        data.verification_statut !== 'echoue'
          ? data.verification_token
          : null

      if (reusableToken) {
        setToken(reusableToken)
        setStatut(data.verification_statut)
        setResultat(data.verification_resultat)
        setLoading(false)
        return
      }

      const newToken = crypto.randomUUID()
      const { error: updateError } = await supabase
        .from('engagements')
        .update({
          verification_token: newToken,
          verification_statut: null,
          verification_resultat: null,
        })
        .eq('id', engagementId)

      if (cancelled) return

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setToken(newToken)
      setStatut(null)
      setResultat(null)
      setLoading(false)
    }

    setup()

    return () => {
      cancelled = true
    }
  }, [user, engagementId])

  // Interroge Supabase toutes les 3 secondes tant que le résultat n'est pas connu
  useEffect(() => {
    if (!engagementId || statut === 'reussi' || statut === 'echoue') {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    pollRef.current = setInterval(async () => {
      const { data, error: pollError } = await supabase
        .from('engagements')
        .select('verification_statut, verification_resultat')
        .eq('id', engagementId)
        .single()

      if (pollError) {
        pollFailuresRef.current += 1
        // Ne pas alerter sur un simple blip réseau isolé — seulement si
        // l'échec persiste sur plusieurs cycles de sondage consécutifs.
        if (pollFailuresRef.current === POLL_FAILURE_THRESHOLD) {
          showToast('La vérification du statut rencontre des difficultés réseau.', 'error')
        }
        return
      }

      pollFailuresRef.current = 0
      if (data) {
        setStatut(data.verification_statut)
        setResultat(data.verification_resultat)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(pollRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId, statut])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center text-[var(--text-faint)]">
        Chargement...
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="text-[var(--danger)] mb-6">{error}</p>
        <button
          onClick={() => navigate('/engagements')}
          className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-6 py-3 text-sm"
        >
          Retour
        </button>
      </div>
    )
  }

  const mise = engagement?.mise_euros ?? 0

  if (statut === 'reussi') {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)] flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-[var(--accent)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Engagement tenu</h1>
        <p className="text-[var(--text-faint)] mb-2">Tu récupères ta mise de {mise} €.</p>
        {resultat?.raison && (
          <p className="text-xs text-[var(--text-faint)] mb-8 max-w-sm mx-auto">{resultat.raison}</p>
        )}
        <button
          onClick={() => navigate('/engagements')}
          className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors text-[var(--accent-contrast)] font-bold rounded-md px-6 py-3 text-sm"
        >
          Retour
        </button>
      </div>
    )
  }

  if (statut === 'echoue') {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2">Engagement non vérifié</h1>
        <p className="text-[var(--text-faint)] mb-2">
          Ta mise de {mise} € est perdue. Le temps, lui, ne reviendra pas.
        </p>
        {resultat?.raison && (
          <p className="text-xs text-[var(--text-faint)] mb-8 max-w-sm mx-auto">{resultat.raison}</p>
        )}
        <button
          onClick={() => navigate('/engagements')}
          className="border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-6 py-3 text-sm"
        >
          Retour
        </button>
      </div>
    )
  }

  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
  const mobileUrl = `${baseUrl}/mobile-verify?token=${token}`

  return (
    <div className="max-w-lg mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold mb-1">Engagement terminé</h1>
      <p className="text-[var(--text-faint)] mb-10">{engagement?.nom}</p>

      <div className="bg-white p-4 rounded-lg inline-block mb-8">
        <QRCodeSVG value={mobileUrl} size={220} />
      </div>

      <div className="flex flex-col gap-2 mb-8 text-sm">
        <p className="text-[var(--text-muted)] font-bold">Scanne ce QR code avec ton téléphone</p>
        <p className="text-[var(--text-faint)]">
          Uploade ta capture d'écran "Temps d'écran" (iOS) ou "Bien-être numérique"
          (Android)
        </p>
      </div>

      <div className="inline-flex items-center gap-2 bg-[var(--surface-0)] border border-[var(--border)] rounded-full px-4 py-2 text-xs text-[var(--text-faint)]">
        <span
          className={`w-2 h-2 rounded-full ${
            statut === 'en_attente' ? 'bg-[var(--accent)] animate-pulse' : 'bg-[var(--text-subtle)]'
          }`}
        />
        {statut === 'en_attente'
          ? 'Vérification en cours...'
          : "En attente de l'upload depuis ton téléphone"}
      </div>
    </div>
  )
}
