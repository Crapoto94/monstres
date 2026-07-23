import { api, type ApiSuccess } from './api'

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/** `null` si l'utilisateur n'est abonné sur aucun appareil (ou navigateur incompatible). */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/**
 * Demande la permission (obligatoirement déclenchée par un clic utilisateur —
 * opt-in explicite, aucun moyen de l'activer silencieusement) puis abonne ce
 * navigateur et enregistre l'abonnement côté serveur.
 */
export async function subscribeToPush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error("Ce navigateur ne prend pas en charge les notifications push.")
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Permission refusée — active les notifications depuis les réglages du navigateur pour réessayer.')
  }

  const { data } = await api.get<ApiSuccess<{ publicKey: string | null }>>('/push/public-key')
  const publicKey = data.data.publicKey
  if (!publicKey) {
    throw new Error('Notifications push indisponibles côté serveur pour le moment.')
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  await api.post('/push/subscribe', subscription.toJSON())
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getCurrentSubscription()
  if (!subscription) return

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await api.delete('/push/subscribe', { params: { endpoint } })
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i)
  return bytes
}
