import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

const POLL_INTERVAL_MS = 3000

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
      const { data } = await supabase
        .from('engagements')
        .select('verification_statut, verification_resultat')
        .eq('id', engagementId)
        .single()

      if (data) {
        setStatut(data.verification_statut)
        setResultat(data.verification_resultat)
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(pollRef.current)
  }, [engagementId, statut])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center text-gray-400">
        Chargement...
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <p className="text-red-400 mb-6">{error}</p>
        <button
          onClick={() => navigate('/engagements')}
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-6 py-3 text-sm"
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
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Engagement tenu</h1>
        <p className="text-gray-400 mb-2">Tu récupères ta mise de {mise} €.</p>
        {resultat?.raison && (
          <p className="text-xs text-gray-500 mb-8 max-w-sm mx-auto">{resultat.raison}</p>
        )}
        <button
          onClick={() => navigate('/engagements')}
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
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
        <p className="text-gray-400 mb-2">
          Ta mise de {mise} € est perdue. Le temps, lui, ne reviendra pas.
        </p>
        {resultat?.raison && (
          <p className="text-xs text-gray-500 mb-8 max-w-sm mx-auto">{resultat.raison}</p>
        )}
        <button
          onClick={() => navigate('/engagements')}
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-6 py-3 text-sm"
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
      <p className="text-gray-400 mb-10">{engagement?.nom}</p>

      <div className="bg-white p-4 rounded-lg inline-block mb-8">
        <QRCodeSVG value={mobileUrl} size={220} />
      </div>

      <div className="flex flex-col gap-2 mb-8 text-sm">
        <p className="text-gray-200 font-bold">Scanne ce QR code avec ton téléphone</p>
        <p className="text-gray-400">
          Uploade ta capture d'écran "Temps d'écran" (iOS) ou "Bien-être numérique"
          (Android)
        </p>
      </div>

      <div className="inline-flex items-center gap-2 border border-gray-800 rounded-full px-4 py-2 text-xs text-gray-400">
        <span
          className={`w-2 h-2 rounded-full ${
            statut === 'en_attente' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
          }`}
        />
        {statut === 'en_attente'
          ? 'Vérification en cours...'
          : "En attente de l'upload depuis ton téléphone"}
      </div>
    </div>
  )
}
