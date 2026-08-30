import { exportConfig, importConfig, normalizeConfig, SETTINGS_BACKUP_FILE } from './shared/config'
import type { InboxItem } from './shared/inbox'
import type { AppState, BackgroundMessage } from './shared/protocol'
import { applyTheme } from './shared/theme'

const get = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T
const sidePanel = location.pathname.endsWith('/sidepanel.html')
document.body.classList.toggle('side-panel-body', sidePanel)

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

function showError(error: unknown): void {
  get('popup-status').textContent = error instanceof Error ? error.message : String(error)
}

function renderInbox(state: AppState): void {
  const list = get<HTMLDivElement>('popup-inbox-list')
  get('popup-inbox-count').textContent = `${state.inbox.length} ${state.inbox.length === 1 ? 'message' : 'messages'}`
  get<HTMLButtonElement>('popup-dismiss-all').disabled = state.inbox.length === 0
  if (!state.inbox.length) {
    list.textContent = 'No messages yet.'
    return
  }
  list.replaceChildren(...state.inbox.map((item: InboxItem) => {
    const row = document.createElement('article')
    row.className = 'popup-inbox-item'
    const open = document.createElement('button')
    open.className = 'popup-inbox-open'
    open.type = 'button'
    open.title = 'Open in Telegram'
    const date = document.createElement('time')
    date.dateTime = new Date(item.timestamp).toISOString()
    date.textContent = new Date(item.timestamp).toLocaleString()
    const source = document.createElement('strong')
    source.textContent = item.source
    const message = document.createElement('span')
    message.className = 'popup-inbox-message'
    message.textContent = item.message
    open.append(date, source, message)
    open.addEventListener('click', () => { void (async () => {
      try { await send({ target: 'background', type: 'OPEN_INBOX_ITEM', id: item.id }); if (!sidePanel) window.close() } catch (error) { showError(error) }
    })() })
    const dismiss = document.createElement('button')
    dismiss.className = 'small danger'
    dismiss.type = 'button'
    dismiss.textContent = 'Dismiss'
    dismiss.setAttribute('aria-label', `Dismiss message from ${item.source}`)
    dismiss.addEventListener('click', () => { void (async () => {
      try {
        state.inbox = await send({ target: 'background', type: 'DISMISS_INBOX_ITEM', id: item.id }) as InboxItem[]
        renderInbox(state)
      } catch (error) { showError(error) }
    })() })
    row.append(open, dismiss)
    return row
  }))
}

void (async () => {
  const state = await send({ target: 'background', type: 'GET_APP_STATE' }) as AppState
  applyTheme(state.config.theme)
  get('popup-status').textContent = state.runtimeState.status === 'connected' ? `Connected · ${state.runtimeState.userName}` : state.runtimeState.status.replaceAll('-', ' ')
  get('popup-selected').textContent = `${state.config.selectedChatIds.length} chats selected`
  get<HTMLInputElement>('popup-enabled').checked = state.config.notificationsEnabled
  renderInbox(state)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.notificationInbox) {
      state.inbox = changes.notificationInbox.newValue ?? []
      renderInbox(state)
    }
    if (area === 'local' && changes.config) {
      state.config = normalizeConfig(changes.config.newValue)
      applyTheme(state.config.theme)
      get('popup-selected').textContent = `${state.config.selectedChatIds.length} chats selected`
      get<HTMLInputElement>('popup-enabled').checked = state.config.notificationsEnabled
    }
  })

  get<HTMLInputElement>('popup-enabled').addEventListener('change', async (event) => {
    state.config.notificationsEnabled = (event.currentTarget as HTMLInputElement).checked
    await send({ target: 'background', type: 'SAVE_CONFIG', config: state.config })
  })
  get('open-settings').addEventListener('click', () => { void chrome.runtime.openOptionsPage() })
  get('popup-dismiss-all').addEventListener('click', () => { void (async () => {
    try {
      state.inbox = await send({ target: 'background', type: 'DISMISS_ALL_INBOX' }) as InboxItem[]
      renderInbox(state)
    } catch (error) { showError(error) }
  })() })
  get('popup-export').addEventListener('click', () => download(SETTINGS_BACKUP_FILE, JSON.stringify(exportConfig(state.config), null, 2)))
  get<HTMLInputElement>('popup-import').addEventListener('change', (event) => { void (async () => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    try {
      if (file.size > 1_000_000) throw new Error('Choose a JSON file smaller than 1 MB')
      state.config = importConfig(JSON.parse(await file.text()))
      await send({ target: 'background', type: 'SAVE_CONFIG', config: state.config })
      applyTheme(state.config.theme)
      get('popup-selected').textContent = `${state.config.selectedChatIds.length} chats selected`
      get<HTMLInputElement>('popup-enabled').checked = state.config.notificationsEnabled
      get('popup-status').textContent = 'Settings imported'
    } catch (error) { showError(error) } finally { input.value = '' }
  })() })
  get('popup-test').addEventListener('click', () => { void send({ target: 'background', type: 'TEST_NOTIFICATION' }) })
})()
