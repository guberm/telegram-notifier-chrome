import { describe, expect, it } from 'vitest'
import { addInboxItem, dismissInboxItem } from '../src/shared/inbox'
import type { NotificationEvent } from '../src/shared/config'

const event: NotificationEvent = {
  chatId: '-1001', messageId: 5, chatTitle: 'Ops', topicName: 'Deploys',
  senderId: '42', senderName: 'Michael', text: 'Deploy failed', outgoing: false,
  mentioned: false, threadId: '7', kind: 'text', timestamp: 1_700_000_000_000,
  url: 'https://t.me/c/1/5'
}

describe('popup inbox', () => {
  it('stores date, source, message, and Telegram link newest first', () => {
    const inbox = addInboxItem([], event)

    expect(inbox).toEqual([{
      id: '-1001:5',
      timestamp: 1_700_000_000_000,
      source: 'Ops - Deploys · Michael',
      message: 'Deploy failed',
      url: 'https://t.me/c/1/5'
    }])
    expect(addInboxItem(inbox, { ...event, messageId: 6, text: 'Recovered' }).map((item) => item.message)).toEqual(['Recovered', 'Deploy failed'])
  })

  it('replaces duplicate messages and dismisses one item', () => {
    const inbox = addInboxItem(addInboxItem([], event), { ...event, text: 'Edited text' })

    expect(inbox).toHaveLength(1)
    expect(inbox[0].message).toBe('Edited text')
    expect(dismissInboxItem(inbox, '-1001:5')).toEqual([])
  })

  it('bounds the local inbox to 100 messages', () => {
    const inbox = Array.from({ length: 101 }, (_, index) => ({ ...event, messageId: index }))
      .reduce(addInboxItem, [])

    expect(inbox).toHaveLength(100)
    expect(inbox[0].id).toBe('-1001:100')
  })
})
