import { exportConfig, importConfig, SETTINGS_BACKUP_FILE } from './shared/config'
import type { AppState, BackgroundMessage } from './shared/protocol'

const get = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T

async function send(message: BackgroundMessage): Promise<unknown> {
  const response = await chrome.runtime.sendMessage(message) as { ok: boolean; data?: unknown; error?: string }
  if (!response?.ok) throw new Error(response?.error || 'Request failed')
  return response.data
}

function download(name: string, text: string): void {
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

void (async () => {
  const state = await send({ target: 'background', type: 'GET_APP_STATE' }) as AppState
  get('popup-status').textContent = state.runtimeState.status === 'connected' ? `Connected · ${state.runtimeState.userName}` : state.runtimeState.status.replaceAll('-', ' ')
  get('popup-selected').textContent = `${state.config.selectedChatIds.length} chats selected`
  get<HTMLInputElement>('popup-enabled').checked = state.config.notificationsEnabled
  await send({ target: 'background', type: 'MARK_SEEN' })

  get<HTMLInputElement>('popup-enabled').addEventListener('change', async (event) => {
    state.config.notificationsEnabled = (event.currentTarget as HTMLInputElement).checked
    await send({ target: 'background', type: 'SAVE_CONFIG', config: state.config })
  })
  get('open-settings').addEventListener('click', () => { void chrome.runtime.openOptionsPage() })
  get('popup-export').addEventListener('click', () => download(SETTINGS_BACKUP_FILE, JSON.stringify(exportConfig(state.config), null, 2)))
  get<HTMLInputElement>('popup-import').addEventListener('change', (event) => { void (async () => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      if (file.size > 1_000_000) throw new Error('Choose a JSON file smaller than 1 MB')
      state.config = importConfig(JSON.parse(await file.text()))
      await send({ target: 'background', type: 'SAVE_CONFIG', config: state.config })
      get('popup-selected').textContent = `${state.config.selectedChatIds.length} chats selected`
      get<HTMLInputElement>('popup-enabled').checked = state.config.notificationsEnabled
      get('popup-status').textContent = 'Settings imported'
    } catch (error) {
      get('popup-status').textContent = error instanceof Error ? error.message : String(error)
    } finally { input.value = '' }
  })() })
  get('popup-test').addEventListener('click', () => { void send({ target: 'background', type: 'TEST_NOTIFICATION' }) })
})()
