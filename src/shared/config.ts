export type Direction = 'incoming' | 'outgoing' | 'both' | 'none'
export type MessageKind = 'text' | 'photo' | 'video' | 'document' | 'voice' | 'audio' | 'sticker' | 'animation' | 'poll' | 'location' | 'contact' | 'other'

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
  selectedChatIds: [],
  hiddenChatIds: [],
  globalDirection: 'incoming',
  chatDirections: {},
  textFilters: [],
  regexFilters: [],
  quietHours: { enabled: false, startMinutes: 22 * 60, endMinutes: 7 * 60 },
  chatRules: {}
}

const directions = new Set<Direction>(['incoming', 'outgoing', 'both', 'none'])

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

  return {
    version: 1,
    notificationsEnabled: input.notificationsEnabled === undefined ? true : input.notificationsEnabled === true,
    showMessagePreviews: input.showMessagePreviews === undefined ? true : input.showMessagePreviews === true,
    selectedChatIds: cleanIds(input.selectedChatIds),
    hiddenChatIds: cleanIds(input.hiddenChatIds),
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
