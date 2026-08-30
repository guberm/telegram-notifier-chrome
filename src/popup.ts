import type { AppState, BackgroundMessage } from './shared/protocol'

const get = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T

async function send(message: BackgroundMessage): Promise<unknown> {
  const response = await chrome.runtime.sendMessage(message) as { ok: boolean; data?: unknown; error?: string }
  if (!response?.ok) throw new Error(response?.error || 'Request failed')
  return response.data
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
  get('popup-test').addEventListener('click', () => { void send({ target: 'background', type: 'TEST_NOTIFICATION' }) })
})()
