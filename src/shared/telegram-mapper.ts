import type { MessageKind } from './config'

export type AppChatType = 'user' | 'group' | 'channel' | 'bot' | 'unavailable'

export function mediaKind(type?: string, animated = false): MessageKind {
  if (!type) return 'text'
  if (type === 'video' && animated) return 'animation'
  if (['photo', 'video', 'document', 'voice', 'audio', 'sticker', 'poll', 'location', 'contact'].includes(type)) {
    return type as MessageKind
  }
  return 'other'
}

export function messageUrl(chatId: string, username: string, messageId: number, threadId: string): string {
  const suffix = threadId ? `?thread=${encodeURIComponent(threadId)}` : ''
  if (/^[a-zA-Z0-9_]{5,}$/.test(username)) return `https://t.me/${username}/${messageId}${suffix}`
  if (chatId.startsWith('-100')) return `https://t.me/c/${chatId.slice(4)}/${messageId}${suffix}`
  return `https://web.telegram.org/k/#${encodeURIComponent(chatId)}`
}

export function notificationKey(chatId: string, threadId: string, senderId: string): string {
  return `message:${chatId}:${threadId}:${senderId}`
}

export function chatType(peerType: 'user' | 'chat', isBot: boolean, telegramChatType = ''): AppChatType {
  if (peerType === 'user') return isBot ? 'bot' : 'user'
  return telegramChatType === 'channel' ? 'channel' : 'group'
}

export function missingChatIds(loadedIds: string[], selectedIds: string[]): string[] {
  const loaded = new Set(loadedIds)
  return [...new Set(selectedIds)].filter((id) => !loaded.has(id))
}

export function unavailableChat(id: string) {
  return { id, title: 'Selected chat unavailable', username: '', type: 'unavailable' as const, archived: false, muted: false }
}
