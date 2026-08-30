import type { NotificationEvent } from './config'
import { formatPreview, notificationTitle } from './notification-policy'

export interface InboxItem {
  id: string
  timestamp: number
  source: string
  message: string
  url: string
}

// ponytail: bounded local inbox; add pagination before retaining more than 100 messages.
const INBOX_LIMIT = 100

export function addInboxItem(items: InboxItem[], event: NotificationEvent): InboxItem[] {
  const conversation = notificationTitle(event.chatTitle, event.topicName)
  const sender = event.senderName.trim()
  const item: InboxItem = {
    id: `${event.chatId}:${event.messageId}`,
    timestamp: event.timestamp,
    source: sender && sender !== event.chatTitle ? `${conversation} · ${sender}` : conversation,
    message: formatPreview(event.kind, event.text),
    url: event.url
  }
  return [item, ...items.filter((existing) => existing.id !== item.id)].slice(0, INBOX_LIMIT)
}

export function dismissInboxItem(items: InboxItem[], id: string): InboxItem[] {
  return items.filter((item) => item.id !== id)
}
