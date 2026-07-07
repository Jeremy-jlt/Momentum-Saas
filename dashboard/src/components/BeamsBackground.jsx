import { useEffect, useRef } from 'react'

// Fond animé de faisceaux lumineux émeraude (canvas natif, aucune dépendance).
// Teinte 150±30 pour rester dans la famille du vert #10b981 de l'app.
// Le canvas suit le thème (base sombre ou ivoire) et respecte
// prefers-reduced-motion : dans ce cas les faisceaux sont dessinés une seule
// fois, immobiles.
const INTENSITY_ALPHA = { subtle: 0.9, medium: 1.1, strong: 1.3 }
const BEAM_COUNT = 18

function createBeam(width, height) {
  const angle = -35 + Math.random() * 10
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 + height * 0.5,
    width: 70 + Math.random() * 100,
    length: height * 2.5,
    angle,
    speed: 1 + Math.random() * 1.2,
    opacity: 0.18 + Math.random() * 0.2,
    hue: 150 + Math.random() * 30,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.025,
  }
}

// `fixed` : couvre tout le viewport en couche de fond (derrière le contenu,
// pointer-events désactivés) — utilisé par le Layout pour animer la page
// entière sans délimitation. Sans `fixed` : section classique qui enveloppe
// son contenu.
export default function BeamsBackground({ intensity = 'subtle', className = '', fixed = false, children }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const intensityAlpha = INTENSITY_ALPHA[intensity] ?? INTENSITY_ALPHA.subtle
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let beams = []
    let raf

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      beams = Array.from({ length: BEAM_COUNT }, () => createBeam(rect.width, rect.height))
    }

    function drawBeam(beam, isLight) {
      ctx.save()
      ctx.translate(beam.x, beam.y)
      ctx.rotate((beam.angle * Math.PI) / 180)

      const pulsed = beam.opacity * (0.6 + Math.sin(beam.pulse) * 0.4) * intensityAlpha
      // Sur fond clair, faisceaux plus sombres et plus doux pour rester lisibles.
      const sat = isLight ? '55%' : '85%'
      const light = isLight ? '42%' : '62%'

      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length)
      gradient.addColorStop(0, `hsla(${beam.hue}, ${sat}, ${light}, 0)`)
      gradient.addColorStop(0.2, `hsla(${beam.hue}, ${sat}, ${light}, ${pulsed * 0.5})`)
      gradient.addColorStop(0.5, `hsla(${beam.hue}, ${sat}, ${light}, ${pulsed})`)
      gradient.addColorStop(0.8, `hsla(${beam.hue}, ${sat}, ${light}, ${pulsed * 0.5})`)
      gradient.addColorStop(1, `hsla(${beam.hue}, ${sat}, ${light}, 0)`)

      ctx.fillStyle = gradient
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length)
      ctx.restore()
    }

    function frame() {
      const rect = canvas.parentElement.getBoundingClientRect()
      const isLight = document.documentElement.dataset.theme === 'light'

      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.filter = 'blur(35px)'

      beams.forEach((beam) => {
        beam.y -= beam.speed
        beam.pulse += beam.pulseSpeed
        // Repart du bas une fois sorti par le haut.
        if (beam.y + beam.length < -100) {
          beam.y = rect.height + 100
          beam.x = Math.random() * rect.width * 1.5 - rect.width * 0.25
        }
        drawBeam(beam, isLight)
      })

      ctx.filter = 'none'
      if (!reducedMotion) raf = requestAnimationFrame(frame)
    }

    resize()
    frame()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [intensity])

  const wrapperClass = fixed
    ? `fixed inset-0 overflow-hidden pointer-events-none bg-[var(--surface-0)] ${className}`
    : `relative overflow-hidden bg-[var(--surface-0)] ${className}`

  return (
    <div className={wrapperClass} aria-hidden={fixed ? 'true' : undefined}>
      {/* Nappes lumineuses qui dérivent en continu, sous les faisceaux —
          garantit une vie permanente du fond même entre deux passages de beams. */}
      <div className="ambient-glow" style={{ top: '-15%', left: '-10%' }} aria-hidden="true" />
      <div
        className="ambient-glow"
        style={{ bottom: '-20%', right: '-10%', animationDelay: '-12s' }}
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
      {!fixed && <div className="relative z-10 w-full">{children}</div>}
    </div>
  )
}
