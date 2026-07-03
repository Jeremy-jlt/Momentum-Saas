import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

export default function Verification() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const engagementId = searchParams.get('id')

  const [engagement, setEngagement] = useState(null)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle') // idle | verifying | success | failure
  const inputRef = useRef(null)

  useEffect(() => {
    if (!user || !engagementId) return
    supabase
      .from('engagements')
      .select('*')
      .eq('id', engagementId)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setEngagement(data))
  }, [user, engagementId])

  const acceptFile = (f) => {
    if (!f) return
    if (!['image/png', 'image/jpeg'].includes(f.type)) {
      setError('Seuls les fichiers PNG ou JPG sont acceptés.')
      return
    }
    setError('')
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    if (!file) {
      setError('Ajoute une capture d\'écran avant d\'envoyer.')
      return
    }
    setError('')
    setStatus('verifying')

    setTimeout(async () => {
      const success = Math.random() < 0.5
      const newStatus = success ? 'reussi' : 'echoue'

      if (engagement) {
        await supabase
          .from('engagements')
          .update({ statut: newStatus })
          .eq('id', engagement.id)
      }

      setStatus(success ? 'success' : 'failure')
    }, 2000)
  }

  const mise = engagement?.mise_euros ?? 0

  if (status === 'verifying') {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center text-gray-400">
        Vérification en cours...
      </div>
    )
  }

  if (status === 'success') {
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
        <p className="text-gray-400 mb-8">Tu récupères ta mise de {mise} €.</p>
        <button
          onClick={() => navigate('/engagements')}
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
        >
          Retour
        </button>
      </div>
    )
  }

  if (status === 'failure') {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2">Engagement non vérifié</h1>
        <p className="text-gray-400 mb-8">
          Ta mise de {mise} € est perdue. Le temps, lui, ne reviendra pas.
        </p>
        <button
          onClick={() => navigate('/engagements')}
          className="border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors rounded-md px-6 py-3 text-sm"
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-1">Engagement terminé</h1>
      <p className="text-gray-400 mb-8">{engagement?.nom ?? 'Ton engagement'}</p>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors mb-4 ${
          dragging ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-700'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
        {file ? (
          <p className="text-sm text-gray-200">{file.name}</p>
        ) : (
          <p className="text-sm text-gray-400">
            Glisse ta capture d'écran ici, ou clique pour choisir un fichier (PNG, JPG)
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="border-l-2 border-emerald-500 pl-5 py-2 mb-8 text-sm text-gray-300">
        On ne peut pas t'empêcher de tricher. Mais si tu le fais, tu garderas ton
        argent — tu ne récupéreras jamais le temps perdu. Ce n'est pas nous que tu
        trompes.
      </div>

      <button
        onClick={handleSubmit}
        className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-black font-bold rounded-md px-6 py-3 text-sm"
      >
        Envoyer pour vérification
      </button>
    </div>
  )
}
