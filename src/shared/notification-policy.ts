import type { AppConfig, Direction, MessageKind, NotificationEvent } from './config'

export interface NotificationDecision { allowed: boolean; reason?: string }

function isQuietTime(current: number, start: number, end: number): boolean {
  if (start === end) return false
  return start < end ? current >= start && current < end : current >= start || current < end
}

function directionAllows(direction: Direction, outgoing: boolean): boolean {
  return direction === 'both' || (direction === 'incoming' && !outgoing) || (direction === 'outgoing' && outgoing)
}

export function evaluateNotification(event: NotificationEvent, config: AppConfig, currentMinutes: number): NotificationDecision {
  if (!config.notificationsEnabled) return { allowed: false, reason: 'disabled' }
  if (!config.selectedChatIds.includes(event.chatId)) return { allowed: false, reason: 'chat-not-selected' }
  if (!directionAllows(config.chatDirections[event.chatId] ?? config.globalDirection, event.outgoing)) {
    return { allowed: false, reason: 'direction' }
  }
  if (config.quietHours.enabled && isQuietTime(currentMinutes, config.quietHours.startMinutes, config.quietHours.endMinutes)) {
    return { allowed: false, reason: 'quiet-hours' }
  }

  const text = event.text.toLocaleLowerCase()
  if (config.textFilters.some((filter) => text.includes(filter.toLocaleLowerCase()))) {
    return { allowed: false, reason: 'text-filter' }
  }
  if (config.regexFilters.some((pattern) => {
    try { return new RegExp(pattern, 'i').test(event.text) } catch { return false }
  })) {
    return { allowed: false, reason: 'regex-filter' }
  }

  const rule = config.chatRules[event.chatId]
  if (rule && (
    (rule.mentionsOnly && !event.mentioned)
    || (rule.senderIds.length > 0 && !rule.senderIds.includes(event.senderId))
    || (rule.threadIds.length > 0 && !rule.threadIds.includes(event.threadId))
    || !rule.requiredKeywords.every((keyword) => text.includes(keyword.toLocaleLowerCase()))
  )) return { allowed: false, reason: 'advanced-rule' }

  return { allowed: true }
}

export function notificationTitle(chatTitle: string, topicName: string): string {
  return topicName.trim() ? `${chatTitle} - ${topicName.trim()}` : chatTitle
}

const labels: Record<Exclude<MessageKind, 'text'>, string> = {
  photo: '📷 Photo', video: '🎬 Video', document: '📎 Document', voice: '🎤 Voice message',
  audio: '🎵 Audio', sticker: '😀 Sticker', animation: '🎞 Animation', poll: '📊 Poll',
  location: '📍 Location', contact: '👤 Contact', other: 'New message'
}

export function formatPreview(kind: MessageKind, caption: string): string {
  const clean = caption.trim()
  if (kind === 'text' || kind === 'other') return clean || 'New message'
  const label = labels[kind]
  return clean ? `${label}: ${clean}` : label
}
