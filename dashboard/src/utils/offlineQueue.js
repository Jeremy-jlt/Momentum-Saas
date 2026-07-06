const OFFLINE_QUEUE_KEY = 'momentum_offline_queue'

export function getOfflineQueue() {
  try {
    const stored = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY))
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

export function enqueueOfflineAction(action) {
  const queue = getOfflineQueue()
  queue.push(action)
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY)
}

// Vide la file d'actions accumulées hors ligne vers Supabase, dans l'ordre.
// Un conflit (23505 = violation de contrainte unique, la completion existe
// déjà) est ignoré silencieusement plutôt que traité comme une erreur.
export async function flushOfflineQueue(supabase) {
  const queue = getOfflineQueue()
  if (queue.length === 0) return

  for (const item of queue) {
    if (item.type !== 'completion') continue

    try {
      if (item.action === 'insert') {
        const { error } = await supabase.from('completions').insert(item.data)
        if (error && error.code !== '23505') {
          console.error('[Momentum] Échec de synchronisation (insert) :', error)
        }
      } else if (item.action === 'delete') {
        await supabase
          .from('completions')
          .delete()
          .eq('habitude_id', item.data.habitude_id)
          .eq('date', item.data.date)
      }
    } catch (err) {
      console.error('[Momentum] Échec de synchronisation :', err)
    }
  }

  clearOfflineQueue()
}
