export type Direction = 'incoming' | 'outgoing' | 'both' | 'none'
export type MessageKind = 'text' | 'photo' | 'video' | 'document' | 'voice' | 'audio' | 'sticker' | 'animation' | 'poll' | 'location' | 'contact' | 'other'
export type Theme = 'system' | 'light' | 'dark'
export type MessageView = 'popup' | 'side-panel'

export interface ChatRule {
  mentionsOnly: boolean
  senderIds: string[]
  threadIds: string[]
  requiredKeywords: string[]
}

export interface AppConfig {
  version: 1
  notificationsEnabled: boolean
  showMessagePreviews: boolean
  theme: Theme
  messageView: MessageView
  selectedChatIds: string[]
  hiddenChatIds: string[]
  globalDirection: Direction
  chatDirections: Record<string, Direction>
  textFilters: string[]
  regexFilters: string[]
  quietHours: { enabled: boolean; startMinutes: number; endMinutes: number }
  chatRules: Record<string, ChatRule>
}

export interface NotificationEvent {
  chatId: string
  messageId: number
  chatTitle: string
  topicName: string
  senderId: string
  senderName: string
  text: string
  outgoing: boolean
  mentioned: boolean
  threadId: string
  kind: MessageKind
  timestamp: number
  url: string
}

export const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  notificationsEnabled: true,
  showMessagePreviews: true,
  theme: 'system',
  messageView: 'popup',
  selectedChatIds: [],
  hiddenChatIds: [],
  globalDirection: 'incoming',
  chatDirections: {},
  textFilters: [],
  regexFilters: [],
  quietHours: { enabled: false, startMinutes: 22 * 60, endMinutes: 7 * 60 },
  chatRules: {}
}

export const SETTINGS_BACKUP_FILE = 'telegram_notifier_settings.json'
const LEGACY_SETTINGS_BACKUP_FILE = 'custom-chat-notifier-settings.json'

const directions = new Set<Direction>(['incoming', 'outgoing', 'both', 'none'])
const themes = new Set<Theme>(['system', 'light', 'dark'])
const messageViews = new Set<MessageView>(['popup', 'side-panel'])

function cleanStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string | number => typeof item === 'string' || typeof item === 'number')
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean)
}

function direction(value: unknown, fallback: Direction): Direction {
  const normalized = typeof value === 'string' ? value.toLowerCase() as Direction : fallback
  return directions.has(normalized) ? normalized : fallback
}

function minute(value: unknown, fallback: number): number {
  return Math.max(0, Math.min(1439, Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback))
}

export function normalizeConfig(value: unknown): AppConfig {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const rawDirections = input.chatDirections && typeof input.chatDirections === 'object'
    ? input.chatDirections as Record<string, unknown>
    : {}
  const chatDirections = Object.fromEntries(Object.entries(rawDirections).flatMap(([key, item]) => {
    const value = typeof item === 'string' ? item.toLowerCase() as Direction : undefined
    return value && directions.has(value) ? [[key, value]] : []
  })) as Record<string, Direction>

  const rawRules = input.chatRules && typeof input.chatRules === 'object'
    ? input.chatRules as Record<string, unknown>
    : {}
  const chatRules = Object.fromEntries(Object.entries(rawRules).flatMap(([key, item]) => {
    if (!item || typeof item !== 'object') return []
    const rule = item as Record<string, unknown>
    return [[key, {
      mentionsOnly: rule.mentionsOnly === true,
      senderIds: cleanIds(rule.senderIds),
      threadIds: cleanIds(rule.threadIds),
      requiredKeywords: cleanStrings(rule.requiredKeywords)
    } satisfies ChatRule]]
  })) as Record<string, ChatRule>

  const rawQuiet = input.quietHours && typeof input.quietHours === 'object'
    ? input.quietHours as Record<string, unknown>
    : {}
  const selectedChatIds = cleanIds(input.selectedChatIds)
  const selected = new Set(selectedChatIds)

  return {
    version: 1,
    notificationsEnabled: input.notificationsEnabled === undefined ? true : input.notificationsEnabled === true,
    showMessagePreviews: input.showMessagePreviews === undefined ? true : input.showMessagePreviews === true,
    theme: themes.has(input.theme as Theme) ? input.theme as Theme : 'system',
    messageView: messageViews.has(input.messageView as MessageView) ? input.messageView as MessageView : 'popup',
    selectedChatIds,
    hiddenChatIds: cleanIds(input.hiddenChatIds).filter((id) => !selected.has(id)),
    globalDirection: direction(input.globalDirection, 'incoming'),
    chatDirections,
    textFilters: cleanStrings(input.textFilters),
    regexFilters: cleanStrings(input.regexFilters),
    quietHours: {
      enabled: rawQuiet.enabled === true,
      startMinutes: minute(rawQuiet.startMinutes, DEFAULT_CONFIG.quietHours.startMinutes),
      endMinutes: minute(rawQuiet.endMinutes, DEFAULT_CONFIG.quietHours.endMinutes)
    },
    chatRules
  }
}

function portableId(value: string): string | number {
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : value
}

function portableIds(values: string[]): Array<string | number> {
  return values.map(portableId)
}

export function importConfig(value: unknown): AppConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuration must be a JSON object')
  const input = value as Record<string, unknown>
  const version = Number(input.version ?? 1)
  if (version !== 1) throw new Error(`Unsupported configuration version: ${version}`)
  if (!('favoriteChats' in input) && !('quietHoursEnabled' in input)) return normalizeConfig(input)
  return normalizeConfig({
    ...input,
    selectedChatIds: input.favoriteChats,
    hiddenChatIds: input.hiddenChats,
    quietHours: {
      enabled: input.quietHoursEnabled,
      startMinutes: input.quietStartMinutes,
      endMinutes: input.quietEndMinutes
    }
  })
}

export function exportConfig(value: AppConfig): Record<string, unknown> {
  const config = normalizeConfig(value)
  return {
    version: 1,
    favoriteChats: portableIds(config.selectedChatIds),
    hiddenChats: portableIds(config.hiddenChatIds),
    globalDirection: config.globalDirection.toUpperCase(),
    chatDirections: Object.fromEntries(Object.entries(config.chatDirections).map(([id, value]) => [id, value.toUpperCase()])),
    textFilters: config.textFilters,
    regexFilters: config.regexFilters,
    notificationsEnabled: config.notificationsEnabled,
    showMessagePreviews: config.showMessagePreviews,
    quietHoursEnabled: config.quietHours.enabled,
    quietStartMinutes: config.quietHours.startMinutes,
    quietEndMinutes: config.quietHours.endMinutes,
    chatRules: Object.fromEntries(Object.entries(config.chatRules).map(([id, rule]) => [id, {
      ...rule,
      senderIds: portableIds(rule.senderIds),
      threadIds: portableIds(rule.threadIds)
    }]))
  }
}

export function isSettingsBackupFile(fileName: string | null | undefined): boolean {
  return fileName === SETTINGS_BACKUP_FILE || fileName === LEGACY_SETTINGS_BACKUP_FILE
}
