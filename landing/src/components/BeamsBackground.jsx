import { useEffect, useRef } from 'react'

// Faisceaux lumineux émeraude, teinte 150-180 (vert, jamais bleu/cyan).
// Optimisation clé : le flou est appliqué en CSS sur l'élément <canvas>
// (`style.filter`), pas via `ctx.filter` dans la boucle de dessin — un flou
// recalculé par le rasterizer 2D à chaque frame est très coûteux, alors que
// le flou CSS est composé une fois par le GPU. L'animation est aussi mise en
// pause quand l'onglet n'est pas visible (Page Visibility API) et désactivée
// si prefers-reduced-motion est actif (un seul rendu statique).
const BEAM_COUNT = 14
const HUE_MIN = 150
const HUE_MAX = 180

function createBeam(width, height) {
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 + height * 0.5,
    width: 70 + Math.random() * 100,
    length: height * 2.2,
    angle: -35 + Math.random() * 10,
    speed: 0.4 + Math.random() * 0.5,
    opacity: 0.14 + Math.random() * 0.16,
    hue: HUE_MIN + Math.random() * (HUE_MAX - HUE_MIN),
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.012 + Math.random() * 0.015,
  }
}

export default function BeamsBackground({ intensity = 'subtle', className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const alpha = { subtle: 0.85, medium: 1, strong: 1.2 }[intensity] ?? 0.85
    const ctx = canvas.getContext('2d')
    let beams = []
    let raf = null
    let running = false

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      beams = Array.from({ length: BEAM_COUNT }, () => createBeam(rect.width, rect.height))
    }

    function drawBeam(beam) {
      ctx.save()
      ctx.translate(beam.x, beam.y)
      ctx.rotate((beam.angle * Math.PI) / 180)

      const pulsed = beam.opacity * (0.6 + Math.sin(beam.pulse) * 0.4) * alpha
      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length)
      gradient.addColorStop(0, `hsla(${beam.hue}, 80%, 55%, 0)`)
      gradient.addColorStop(0.2, `hsla(${beam.hue}, 80%, 55%, ${pulsed * 0.5})`)
      gradient.addColorStop(0.5, `hsla(${beam.hue}, 80%, 55%, ${pulsed})`)
      gradient.addColorStop(0.8, `hsla(${beam.hue}, 80%, 55%, ${pulsed * 0.5})`)
      gradient.addColorStop(1, `hsla(${beam.hue}, 80%, 55%, 0)`)

      ctx.fillStyle = gradient
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length)
      ctx.restore()
    }

    function frame() {
      const rect = canvas.parentElement.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      beams.forEach((beam) => {
        beam.y -= beam.speed
        beam.pulse += beam.pulseSpeed
        if (beam.y + beam.length < -100) {
          beam.y = rect.height + 100
          beam.x = Math.random() * rect.width * 1.5 - rect.width * 0.25
        }
        drawBeam(beam)
      })
      if (running) raf = requestAnimationFrame(frame)
    }

    function start() {
      if (running || reducedMotion) return
      running = true
      raf = requestAnimationFrame(frame)
    }

    function stop() {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = null
    }

    function handleVisibility() {
      if (document.hidden) stop()
      else start()
    }

    resize()
    if (reducedMotion) {
      // Rendu statique unique, aucune boucle.
      beams.forEach((beam) => drawBeam(beam))
    } else {
      start()
    }

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [intensity])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ filter: 'blur(38px)' }}
      aria-hidden="true"
    />
  )
}
