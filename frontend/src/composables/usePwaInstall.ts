import { ref } from 'vue'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const canInstall = ref(false)
const installed = ref(false)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    canInstall.value = true
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    canInstall.value = false
    deferredPrompt.value = null
  })
}

export function usePwaInstall() {
  async function install() {
    if (!deferredPrompt.value) return
    await deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      installed.value = true
      canInstall.value = false
    }
    deferredPrompt.value = null
  }

  return { canInstall, installed, install }
}
