import { exportConfig, importConfig, normalizeConfig, SETTINGS_BACKUP_FILE, type AppConfig, type ChatRule, type Direction } from './shared/config'
import type { AppState, BackgroundMessage, ChatInfo, Credentials } from './shared/protocol'

const element = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T
let state: AppState
let chats: ChatInfo[] = []
let activeRuleChatId = ''

async function send(message: BackgroundMessage): Promise<unknown> {
  const response = await chrome.runtime.sendMessage(message) as { ok: boolean; data?: unknown; error?: string }
  if (!response?.ok) throw new Error(response?.error || 'Request failed')
  return response.data
}

function toast(message: string, error = false): void {
  const node = element<HTMLDivElement>('toast')
  node.textContent = message
  node.classList.toggle('error', error)
  node.classList.add('visible')
  window.setTimeout(() => node.classList.remove('visible'), 3000)
}

function timeValue(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function parseTime(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':')
  return Math.min(1439, Math.max(0, Number(hours) * 60 + Number(minutes)))
}

function lines(value: string): string[] {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function ids(value: string): string[] {
  return value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean)
}

function renderState(): void {
  const runtime = state.runtimeState
  const connected = runtime.status === 'connected'
  element('status-dot').className = `status-dot ${connected ? 'connected' : runtime.status === 'error' ? 'failed' : ''}`
  element('status-title').textContent = connected ? `Connected as ${runtime.userName}` : runtime.status.replaceAll('-', ' ')
  element('status-detail').textContent = runtime.error || (connected ? 'Listening for selected chats' : 'Connect your Telegram account')
  element<HTMLInputElement>('api-id').value = state.credentials?.apiId ? String(state.credentials.apiId) : ''
  element<HTMLInputElement>('api-hash').value = state.credentials?.apiHash ?? ''
  element<HTMLInputElement>('notifications-enabled').checked = state.config.notificationsEnabled
  element<HTMLInputElement>('message-previews').checked = state.config.showMessagePreviews
  element<HTMLSelectElement>('global-direction').value = state.config.globalDirection
  element<HTMLInputElement>('quiet-enabled').checked = state.config.quietHours.enabled
  element<HTMLInputElement>('quiet-start').value = timeValue(state.config.quietHours.startMinutes)
  element<HTMLInputElement>('quiet-end').value = timeValue(state.config.quietHours.endMinutes)
  element<HTMLTextAreaElement>('text-filters').value = state.config.textFilters.join('\n')
  element<HTMLTextAreaElement>('regex-filters').value = state.config.regexFilters.join('\n')
  renderLogs()
  renderChats()
}

function renderLogs(): void {
  element('logs').textContent = state.logs.length
    ? state.logs.map((entry) => `${new Date(entry.timestamp).toLocaleString()}  ${entry.level.toUpperCase().padEnd(5)}  ${entry.message}`).join('\n')
    : 'No events yet.'
}

function filteredChats(): ChatInfo[] {
  const query = element<HTMLInputElement>('chat-search').value.trim().toLocaleLowerCase()
  const type = element<HTMLSelectElement>('chat-type').value
  const selectedOnly = element<HTMLInputElement>('selected-only').checked
  return chats.filter((chat) =>
    !state.config.hiddenChatIds.includes(chat.id)
    && (!query || `${chat.title} ${chat.username}`.toLocaleLowerCase().includes(query))
    && (type === 'all' || chat.type === type)
    && (!selectedOnly || state.config.selectedChatIds.includes(chat.id))
  )
}

function renderChats(): void {
  const list = element<HTMLDivElement>('chat-list')
  const visible = filteredChats()
  element('chat-summary').textContent = `${state.config.selectedChatIds.length} selected · ${visible.length} shown · ${chats.length} loaded`
  list.replaceChildren(...visible.map((chat) => {
    const row = document.createElement('article')
    row.className = 'chat-row'
    const selected = state.config.selectedChatIds.includes(chat.id)
    const unavailable = chat.type === 'unavailable'
    row.innerHTML = `<label class="chat-main"><input class="chat-check" type="checkbox" ${selected ? 'checked' : ''}><span class="avatar">${chat.title.trim().charAt(0).toUpperCase() || '?'}</span><span><strong></strong><small></small></span></label><select class="chat-direction" aria-label="Notification direction"><option value="inherit">Inherit global</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option><option value="both">Both</option><option value="none">Mute</option></select><button class="chat-rules">Rules</button><button class="chat-remove danger-text">Remove</button>`
    const title = row.querySelector('strong')!
    const detail = row.querySelector('small')!
    title.textContent = chat.title
    detail.textContent = `${chat.type}${chat.username ? ` · @${chat.username}` : ''}${chat.archived ? ' · archived' : ''}${chat.muted ? ' · muted in Telegram' : ''} · ID ${chat.id}`
    const checkbox = row.querySelector<HTMLInputElement>('.chat-check')!
    checkbox.addEventListener('change', () => {
      const ids = new Set(state.config.selectedChatIds)
      checkbox.checked ? ids.add(chat.id) : ids.delete(chat.id)
      state.config.selectedChatIds = [...ids]
      if (unavailable && !checkbox.checked) chats = chats.filter((item) => item.id !== chat.id)
      void saveConfig('Chat selection saved')
    })
    const direction = row.querySelector<HTMLSelectElement>('.chat-direction')!
    direction.value = state.config.chatDirections[chat.id] ?? 'inherit'
    direction.disabled = unavailable
    direction.addEventListener('change', () => {
      if (direction.value === 'inherit') delete state.config.chatDirections[chat.id]
      else state.config.chatDirections[chat.id] = direction.value as Direction
      void saveConfig('Chat direction saved')
    })
    const rules = row.querySelector<HTMLButtonElement>('.chat-rules')!
    const remove = row.querySelector<HTMLButtonElement>('.chat-remove')!
    rules.disabled = unavailable
    remove.disabled = unavailable
    if (unavailable) remove.textContent = 'Unavailable'
    else {
      rules.addEventListener('click', () => openRuleDialog(chat))
      remove.addEventListener('click', () => { void removeChat(chat) })
    }
    return row
  }))
  if (visible.length === 0) list.textContent = chats.length ? 'No chats match this filter.' : 'No chats loaded yet.'
}

async function saveConfig(message = 'Settings saved'): Promise<void> {
  state.config = normalizeConfig(await send({ target: 'background', type: 'SAVE_CONFIG', config: state.config }))
  renderChats()
  toast(message)
}

function collectRules(): void {
  state.config.notificationsEnabled = element<HTMLInputElement>('notifications-enabled').checked
  state.config.showMessagePreviews = element<HTMLInputElement>('message-previews').checked
  state.config.globalDirection = element<HTMLSelectElement>('global-direction').value as Direction
  state.config.quietHours = {
    enabled: element<HTMLInputElement>('quiet-enabled').checked,
    startMinutes: parseTime(element<HTMLInputElement>('quiet-start').value),
    endMinutes: parseTime(element<HTMLInputElement>('quiet-end').value)
  }
  state.config.textFilters = lines(element<HTMLTextAreaElement>('text-filters').value)
  state.config.regexFilters = lines(element<HTMLTextAreaElement>('regex-filters').value)
}

async function refreshChats(): Promise<void> {
  element<HTMLButtonElement>('refresh-chats').disabled = true
  try {
    chats = await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'LIST_CHATS', payload: { selectedChatIds: state.config.selectedChatIds } }) as ChatInfo[]
    renderChats()
    toast(`Loaded ${chats.length} chats`)
  } finally { element<HTMLButtonElement>('refresh-chats').disabled = false }
}

function openRuleDialog(chat: ChatInfo): void {
  activeRuleChatId = chat.id
  const rule = state.config.chatRules[chat.id] ?? { mentionsOnly: false, senderIds: [], threadIds: [], requiredKeywords: [] }
  element('dialog-title').textContent = `Advanced rules · ${chat.title}`
  element<HTMLInputElement>('rule-mentions').checked = rule.mentionsOnly
  element<HTMLInputElement>('rule-senders').value = rule.senderIds.join(', ')
  element<HTMLInputElement>('rule-threads').value = rule.threadIds.join(', ')
  element<HTMLTextAreaElement>('rule-keywords').value = rule.requiredKeywords.join('\n')
  element<HTMLDialogElement>('rule-dialog').showModal()
}

async function removeChat(chat: ChatInfo): Promise<void> {
  const blockBot = chat.type === 'bot' && confirm(`Block “${chat.title}” as well as deleting its history?\n\nChoose Cancel to delete history without blocking.`)
  if (chat.type !== 'bot' && !confirm(chat.type === 'user' ? `Delete your local Telegram history with “${chat.title}”?` : `Leave “${chat.title}”?`)) return
  await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'REMOVE_CHAT', payload: { chatId: chat.id, blockBot } })
  state.config.selectedChatIds = state.config.selectedChatIds.filter((id) => id !== chat.id)
  state.config.hiddenChatIds = [...new Set([...state.config.hiddenChatIds, chat.id])]
  await saveConfig('Chat removed')
  chats = chats.filter((item) => item.id !== chat.id)
  renderChats()
}

function download(name: string, text: string, type = 'application/json'): void {
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(new Blob([text], { type }))
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

async function run(action: () => Promise<void>): Promise<void> {
  try { await action() } catch (error) { toast(error instanceof Error ? error.message : String(error), true) }
}

element('save-connect').addEventListener('click', () => { void run(async () => {
  const credentials: Credentials = { apiId: Number(element<HTMLInputElement>('api-id').value), apiHash: element<HTMLInputElement>('api-hash').value.trim() }
  if (!Number.isInteger(credentials.apiId) || credentials.apiId <= 0) throw new Error('Enter a valid numeric API ID')
  if (!/^[a-fA-F0-9]{32}$/.test(credentials.apiHash)) throw new Error('API Hash must contain 32 hexadecimal characters')
  await send({ target: 'background', type: 'SAVE_CREDENTIALS', credentials })
  state.credentials = credentials
  toast('Credentials saved; connecting…')
}) })
element('send-code').addEventListener('click', () => { void run(async () => { await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'SEND_CODE', payload: { phone: element<HTMLInputElement>('phone').value } }); toast('Telegram code requested') }) })
element('sign-in').addEventListener('click', () => { void run(async () => { await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'SIGN_IN', payload: { code: element<HTMLInputElement>('code').value } }); toast('Sign-in submitted') }) })
element('check-password').addEventListener('click', () => { void run(async () => { await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'CHECK_PASSWORD', payload: { password: element<HTMLInputElement>('password').value } }); element<HTMLInputElement>('password').value = ''; toast('Password accepted') }) })
element('disconnect').addEventListener('click', () => { void run(async () => { await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'DISCONNECT' }); toast('Disconnected') }) })
element('logout').addEventListener('click', () => { if (confirm('Log out this extension session from Telegram?')) void run(async () => { await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'LOGOUT' }); toast('Logged out') }) })
element('test-notification').addEventListener('click', () => { void run(async () => { await send({ target: 'background', type: 'TEST_NOTIFICATION' }); toast('Test notification sent') }) })
element('save-rules').addEventListener('click', () => { collectRules(); void run(() => saveConfig()) })
element('refresh-chats').addEventListener('click', () => { void run(refreshChats) })
for (const id of ['chat-search', 'chat-type', 'selected-only']) element(id).addEventListener('input', renderChats)

element('save-chat-rule').addEventListener('click', (event) => {
  event.preventDefault()
  const rule: ChatRule = {
    mentionsOnly: element<HTMLInputElement>('rule-mentions').checked,
    senderIds: ids(element<HTMLInputElement>('rule-senders').value),
    threadIds: ids(element<HTMLInputElement>('rule-threads').value),
    requiredKeywords: lines(element<HTMLTextAreaElement>('rule-keywords').value)
  }
  const empty = !rule.mentionsOnly && !rule.senderIds.length && !rule.threadIds.length && !rule.requiredKeywords.length
  if (empty) delete state.config.chatRules[activeRuleChatId]
  else state.config.chatRules[activeRuleChatId] = rule
  element<HTMLDialogElement>('rule-dialog').close()
  void run(() => saveConfig('Advanced rules saved'))
})

element('export-settings').addEventListener('click', () => download(SETTINGS_BACKUP_FILE, JSON.stringify(exportConfig(state.config), null, 2)))
element<HTMLInputElement>('import-settings').addEventListener('change', (event) => { void run(async () => {
  const file = (event.currentTarget as HTMLInputElement).files?.[0]
  if (!file || file.size > 1_000_000) throw new Error('Choose a JSON file smaller than 1 MB')
  state.config = importConfig(JSON.parse(await file.text()))
  await saveConfig('Settings imported')
  renderState()
}) })
element('backup-saved').addEventListener('click', () => { void run(async () => { await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'BACKUP_SAVED', payload: exportConfig(state.config) }); toast('Backup sent to Saved Messages') }) })
element('restore-saved').addEventListener('click', () => { void run(async () => { state.config = importConfig(await send({ target: 'background', type: 'RUNTIME_COMMAND', command: 'RESTORE_SAVED' })); await saveConfig('Settings restored from Saved Messages'); renderState() }) })
element('export-logs').addEventListener('click', () => download('telegram-custom-notifier.log', element('logs').textContent ?? '', 'text/plain'))
element('clear-logs').addEventListener('click', () => { void run(async () => { await send({ target: 'background', type: 'CLEAR_LOGS' }); state.logs = []; renderLogs(); toast('Log cleared') }) })

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (changes.runtimeState) { state.runtimeState = changes.runtimeState.newValue; renderState() }
  if (changes.logs) { state.logs = changes.logs.newValue ?? []; renderLogs() }
})

void run(async () => {
  state = await send({ target: 'background', type: 'GET_APP_STATE' }) as AppState
  renderState()
  if (state.runtimeState.status === 'connected') await refreshChats()
})
