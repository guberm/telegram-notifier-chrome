import { DEFAULT_CONFIG, normalizeConfig, type AppConfig, type NotificationEvent } from './shared/config'
import { evaluateNotification, formatPreview, notificationTitle } from './shared/notification-policy'
import { notificationKey } from './shared/telegram-mapper'
import type { AppState, BackgroundMessage, Credentials, LogEntry, OffscreenMessage, RuntimeState } from './shared/protocol'

const KEYS = {
  config: 'config', credentials: 'credentials', runtimeState: 'runtimeState', logs: 'logs',
  unreadCount: 'unreadCount', histories: 'notificationHistories', links: 'notificationLinks'
} as const
const ALARM = 'runtime-health'
const DEFAULT_RUNTIME: RuntimeState = { status: 'unconfigured', userName: '', error: '', updatedAt: 0 }

async function getConfig(): Promise<AppConfig> {
  const stored = await chrome.storage.local.get(KEYS.config)
  return normalizeConfig(stored[KEYS.config])
}

async function appendLog(level: LogEntry['level'], message: string): Promise<void> {
  const stored = await chrome.storage.local.get({ [KEYS.logs]: [] as LogEntry[] })
  const logs = [...stored[KEYS.logs], { timestamp: Date.now(), level, message }].slice(-300)
  await chrome.storage.local.set({ [KEYS.logs]: logs })
}

async function ensureOffscreen(): Promise<void> {
  const url = chrome.runtime.getURL('offscreen.html')
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] })
  if (contexts.length === 0) {
    try {
      await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['WORKERS'], justification: 'Maintain the local Telegram MTProto connection.' })
    } catch (error) {
      if (!String(error).includes('Only a single offscreen')) throw error
    }
  }
}

async function initializeRuntime(): Promise<void> {
  const stored = await chrome.storage.local.get(KEYS.credentials)
  const credentials = stored[KEYS.credentials] as Credentials | undefined
  if (!credentials) return
  await ensureOffscreen()
  const message: OffscreenMessage = { target: 'offscreen', type: 'INITIALIZE', credentials }
  await chrome.runtime.sendMessage(message)
}

async function sendRuntimeCommand(command: string, payload?: unknown): Promise<unknown> {
  await ensureOffscreen()
  const message: OffscreenMessage = { target: 'offscreen', type: 'COMMAND', command, payload }
  const response = await chrome.runtime.sendMessage(message) as { ok: boolean; data?: unknown; error?: string } | undefined
  if (!response?.ok) throw new Error(response?.error || 'Telegram runtime did not respond')
  return response.data
}

async function processTelegramEvent(event: NotificationEvent): Promise<void> {
  const config = await getConfig()
  const now = new Date()
  const decision = evaluateNotification(event, config, now.getHours() * 60 + now.getMinutes())
  if (!decision.allowed) {
    await appendLog('skip', `${event.chatTitle}: ${decision.reason}`)
    return
  }

  const id = notificationKey(event.chatId, event.threadId, event.senderId)
  const title = notificationTitle(event.chatTitle, event.topicName)
  const preview = formatPreview(event.kind, event.text)
  const stored = await chrome.storage.local.get({
    [KEYS.histories]: {} as Record<string, Array<{ title: string; message: string }>>,
    [KEYS.links]: {} as Record<string, string>,
    [KEYS.unreadCount]: 0
  })
  const histories = stored[KEYS.histories]
  const links = stored[KEYS.links]
  histories[id] = [...(histories[id] ?? []), { title: event.senderName || event.chatTitle, message: preview }].slice(-6)
  links[id] = event.url
  const unreadCount = Math.min(999, stored[KEYS.unreadCount] + 1)
  await chrome.storage.local.set({ [KEYS.histories]: histories, [KEYS.links]: links, [KEYS.unreadCount]: unreadCount })

  const options: chrome.notifications.NotificationCreateOptions = config.showMessagePreviews
    ? {
        type: 'list', iconUrl: 'icons/icon-128.png', title, message: preview,
        items: histories[id], priority: 2
      }
    : {
        type: 'basic', iconUrl: 'icons/icon-128.png', title: 'New selected chat message',
        message: 'Open the notification to view details.', priority: 2
      }
  await chrome.notifications.create(id, options)
  await chrome.action.setBadgeBackgroundColor({ color: '#2563EB' })
  await chrome.action.setBadgeText({ text: unreadCount > 99 ? '99+' : String(unreadCount) })
  await appendLog('info', `${title}: notification shown`)
}

async function getAppState(): Promise<AppState> {
  const stored = await chrome.storage.local.get({
    [KEYS.config]: DEFAULT_CONFIG,
    [KEYS.runtimeState]: DEFAULT_RUNTIME,
    [KEYS.logs]: [] as LogEntry[],
    [KEYS.unreadCount]: 0
  })
  const credentials = (await chrome.storage.local.get(KEYS.credentials))[KEYS.credentials] as Credentials | undefined
  return {
    config: normalizeConfig(stored[KEYS.config]),
    credentials,
    runtimeState: stored[KEYS.runtimeState] as RuntimeState,
    logs: stored[KEYS.logs] as LogEntry[],
    unreadCount: stored[KEYS.unreadCount] as number
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    const stored = await chrome.storage.local.get(KEYS.config)
    if (!stored[KEYS.config]) await chrome.storage.local.set({ [KEYS.config]: DEFAULT_CONFIG, [KEYS.runtimeState]: DEFAULT_RUNTIME })
    await chrome.alarms.create(ALARM, { periodInMinutes: 0.5 })
    await initializeRuntime()
    if (details.reason === 'install') await chrome.runtime.openOptionsPage()
  })()
})

chrome.runtime.onStartup.addListener(() => { void initializeRuntime() })
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM) void initializeRuntime() })

chrome.notifications.onClicked.addListener((id) => {
  void (async () => {
    const links = (await chrome.storage.local.get({ [KEYS.links]: {} as Record<string, string> }))[KEYS.links]
    if (links[id]) await chrome.tabs.create({ url: links[id] })
    await chrome.notifications.clear(id)
  })()
})

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
  if (message?.target !== 'background') return undefined
  void (async () => {
    try {
      switch (message.type) {
        case 'GET_APP_STATE': sendResponse({ ok: true, data: await getAppState() }); break
        case 'SAVE_CONFIG': {
          const config = normalizeConfig(message.config)
          await chrome.storage.local.set({ [KEYS.config]: config })
          sendResponse({ ok: true, data: config })
          break
        }
        case 'SAVE_CREDENTIALS':
          await chrome.storage.local.set({ [KEYS.credentials]: message.credentials })
          await initializeRuntime()
          sendResponse({ ok: true })
          break
        case 'RUNTIME_COMMAND': sendResponse({ ok: true, data: await sendRuntimeCommand(message.command, message.payload) }); break
        case 'TEST_NOTIFICATION':
          await chrome.notifications.create('test', { type: 'basic', iconUrl: 'icons/icon-128.png', title: 'Custom Chat Notifier test', message: 'Notifications are working.', priority: 2 })
          sendResponse({ ok: true })
          break
        case 'CLEAR_LOGS': await chrome.storage.local.set({ [KEYS.logs]: [] }); sendResponse({ ok: true }); break
        case 'MARK_SEEN': await chrome.storage.local.set({ [KEYS.unreadCount]: 0 }); await chrome.action.setBadgeText({ text: '' }); sendResponse({ ok: true }); break
        case 'OFFSCREEN_READY': await initializeRuntime(); sendResponse({ ok: true }); break
        case 'RUNTIME_STATE': await chrome.storage.local.set({ [KEYS.runtimeState]: message.state }); sendResponse({ ok: true }); break
        case 'TELEGRAM_EVENT': await processTelegramEvent(message.event); sendResponse({ ok: true }); break
        case 'RUNTIME_LOG': await appendLog(message.level, message.message); sendResponse({ ok: true }); break
      }
    } catch (error) {
      await appendLog('error', String(error instanceof Error ? error.message : error))
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  })()
  return true
})
