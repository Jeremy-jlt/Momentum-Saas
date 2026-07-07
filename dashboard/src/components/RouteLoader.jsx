// Affiché brièvement par <Suspense> pendant le chargement d'une page en
// lazy-loading — une fine barre en haut de l'écran plutôt qu'un écran
// blanc ou un spinner qui recentre tout, pour ne pas casser la mise en
// page déjà visible (header, etc.) pendant la transition.
export default function RouteLoader() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] bg-transparent overflow-hidden">
      <div className="h-full w-1/3 bg-[var(--accent)] animate-[route-loader_800ms_ease-in-out_infinite]" />
    </div>
  )
}
