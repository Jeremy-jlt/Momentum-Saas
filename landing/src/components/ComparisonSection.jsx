import { useInView } from '../hooks/useInView'

const ROWS = [
  { label: 'Blocage Chrome', opal: true, beeminder: false, notion: false, momentum: true },
  { label: "Tracker d'habitudes", opal: false, beeminder: false, notion: true, momentum: true },
  { label: 'Sessions liées projets', opal: false, beeminder: false, notion: false, momentum: true },
  { label: 'Coche auto habitudes', opal: false, beeminder: false, notion: false, momentum: true },
  { label: 'Mode hors ligne', opal: false, beeminder: false, notion: false, momentum: true },
  { label: 'Mise symbolique', opal: false, beeminder: true, notion: false, momentum: true },
  { label: 'Gratuit pour commencer', opal: true, beeminder: false, notion: true, momentum: true },
]

function Mark({ value }) {
  return value ? (
    <span style={{ color: 'var(--accent)' }}>✓</span>
  ) : (
    <span style={{ color: '#374151' }}>✗</span>
  )
}

export default function ComparisonSection() {
  const [ref, inView] = useInView()

  return (
    <section className="py-20 px-4 sm:px-6" style={{ background: 'var(--bg)' }}>
      <div
        ref={ref}
        className="max-w-3xl mx-auto"
        style={{
          opacity: inView ? 1 : 0,
          animation: inView ? 'fade-slide-up 500ms ease-out both' : 'none',
        }}
      >
        <p
          className="font-medium mb-4"
          style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          Pourquoi Momentum ?
        </p>
        <h2 className="text-white font-bold mb-8" style={{ fontSize: 28 }}>
          Ce que les autres apps ne font pas.
        </h2>

        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #1a1a20' }}>
          <table className="w-full text-left border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th className="text-sm font-medium py-3 px-4" style={{ color: '#9ca3af', borderBottom: '1px solid #1a1a20' }}>
                  Fonctionnalité
                </th>
                <th className="text-sm font-medium py-3 px-4 text-center" style={{ color: '#9ca3af', borderBottom: '1px solid #1a1a20' }}>
                  Opal/Freedom
                </th>
                <th className="text-sm font-medium py-3 px-4 text-center" style={{ color: '#9ca3af', borderBottom: '1px solid #1a1a20' }}>
                  Beeminder
                </th>
                <th className="text-sm font-medium py-3 px-4 text-center" style={{ color: '#9ca3af', borderBottom: '1px solid #1a1a20' }}>
                  Notion
                </th>
                <th
                  className="text-sm font-bold py-3 px-4 text-center"
                  style={{ color: 'var(--accent)', borderBottom: '1px solid #1a1a20', background: 'rgba(16,185,129,0.04)' }}
                >
                  Momentum
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="text-sm py-3 px-4" style={{ color: '#e5e7eb', borderBottom: '1px solid #1a1a20' }}>
                    {row.label}
                  </td>
                  <td className="text-center py-3 px-4" style={{ borderBottom: '1px solid #1a1a20' }}>
                    <Mark value={row.opal} />
                  </td>
                  <td className="text-center py-3 px-4" style={{ borderBottom: '1px solid #1a1a20' }}>
                    <Mark value={row.beeminder} />
                  </td>
                  <td className="text-center py-3 px-4" style={{ borderBottom: '1px solid #1a1a20' }}>
                    <Mark value={row.notion} />
                  </td>
                  <td
                    className="text-center py-3 px-4"
                    style={{
                      borderBottom: '1px solid #1a1a20',
                      background: 'rgba(16,185,129,0.04)',
                      borderLeft: '1px solid rgba(16,185,129,0.25)',
                      borderRight: '1px solid rgba(16,185,129,0.25)',
                    }}
                  >
                    <Mark value={row.momentum} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
