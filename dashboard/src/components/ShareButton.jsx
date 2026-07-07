import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { useToast } from './Toast'

// Bouton de partage de progression — capture un gabarit dédié (fond noir,
// vert Momentum, Syne) plutôt que l'écran actuel : le rendu partagé doit
// rester identique à l'image de marque, quel que soit le thème visuel
// choisi par l'utilisateur (Ivory, Ember...). Gratuit (pas de garde Pro),
// pensé comme levier d'acquisition organique.
export default function ShareButton({ title = 'Ma progression', stats, className = '' }) {
  const cardRef = useRef(null)
  const [sharing, setSharing] = useState(false)
  const showToast = useToast()

  const handleShare = async () => {
    if (!cardRef.current || sharing) return
    setSharing(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#060608',
        scale: 2,
        logging: false,
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('canvas-empty')

      const file = new File([blob], 'momentum-progression.png', { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Ma progression Momentum' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'momentum-progression.png'
        a.click()
        URL.revokeObjectURL(url)
        showToast('Image téléchargée.', 'success')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        showToast("Le partage a échoué. Réessaie dans un instant.", 'error')
      }
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        disabled={sharing}
        className={`border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-colors rounded-md px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {sharing ? 'Génération...' : 'Partager 📤'}
      </button>

      {/* Gabarit hors-écran capturé par html2canvas — jamais visible pour l'utilisateur. */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        <div
          ref={cardRef}
          style={{
            width: 480,
            padding: 40,
            background: '#060608',
            fontFamily: "'Syne', sans-serif",
            position: 'relative',
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#6b7280',
              margin: '0 0 28px 0',
            }}
          >
            Momentum · {title}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 12 }}>
            {stats.map((s) => (
              <div key={s.label}>
                <p style={{ fontSize: 40, fontWeight: 700, color: s.accent ? '#10b981' : '#f0f0f5', margin: 0 }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <p style={{ position: 'absolute', bottom: 16, right: 20, fontSize: 10, color: '#374151', margin: 0 }}>
            momentum-app.fr
          </p>
        </div>
      </div>
    </>
  )
}
