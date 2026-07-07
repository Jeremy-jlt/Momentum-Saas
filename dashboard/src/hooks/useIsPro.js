// Source unique de vérité pour l'état Pro de l'utilisateur.
// TODO Stripe : brancher sur l'abonnement réel (table subscriptions ou
// métadonnées Supabase) au moment de l'intégration du paiement. En attendant,
// tout le monde est Pro pour faciliter le développement et les tests.
export function useIsPro() {
  return true
}
