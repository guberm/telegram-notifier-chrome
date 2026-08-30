import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type NotificationEvent } from '../src/shared/config'
import { evaluateNotification, formatPreview, notificationTitle } from '../src/shared/notification-policy'

const event: NotificationEvent = {
  chatId: '-1001',
  messageId: 5,
  chatTitle: 'Ops',
  topicName: 'Deploys',
  senderId: '42',
  senderName: 'Michael',
  text: 'Urgent deploy failed',
  outgoing: false,
  mentioned: true,
  threadId: '7',
  kind: 'text',
  timestamp: 1_700_000_000_000,
  url: 'https://t.me/c/1/5'
}

const enabled = {
  ...DEFAULT_CONFIG,
  selectedChatIds: ['-1001']
}

describe('evaluateNotification', () => {
  it('allows a selected incoming message by default', () => {
    expect(evaluateNotification(event, enabled, 12 * 60)).toEqual({ allowed: true })
  })

  it('applies master, selection, and direction gates', () => {
    expect(evaluateNotification(event, { ...enabled, notificationsEnabled: false }, 720).reason).toBe('disabled')
    expect(evaluateNotification({ ...event, chatId: '99' }, enabled, 720).reason).toBe('chat-not-selected')
    expect(evaluateNotification({ ...event, outgoing: true }, enabled, 720).reason).toBe('direction')
    expect(evaluateNotification(event, { ...enabled, chatDirections: { '-1001': 'none' } }, 720).reason).toBe('direction')
  })

  it('supports overnight quiet hours and treats equal times as disabled', () => {
    const quiet = { ...enabled, quietHours: { enabled: true, startMinutes: 22 * 60, endMinutes: 7 * 60 } }
    expect(evaluateNotification(event, quiet, 23 * 60).reason).toBe('quiet-hours')
    expect(evaluateNotification(event, quiet, 6 * 60).reason).toBe('quiet-hours')
    expect(evaluateNotification(event, quiet, 12 * 60).allowed).toBe(true)
    expect(evaluateNotification(event, { ...quiet, quietHours: { enabled: true, startMinutes: 720, endMinutes: 720 } }, 720).allowed).toBe(true)
  })

  it('suppresses case-insensitive text and regex matches but ignores invalid regex', () => {
    expect(evaluateNotification(event, { ...enabled, textFilters: ['DEPLOY FAILED'] }, 720).reason).toBe('text-filter')
    expect(evaluateNotification(event, { ...enabled, regexFilters: ['urgent\\s+deploy'] }, 720).reason).toBe('regex-filter')
    expect(evaluateNotification(event, { ...enabled, regexFilters: ['['] }, 720).allowed).toBe(true)
  })

  it('requires every configured advanced constraint', () => {
    const rule = { mentionsOnly: true, senderIds: ['42'], threadIds: ['7'], requiredKeywords: ['urgent', 'deploy'] }
    const config = { ...enabled, chatRules: { '-1001': rule } }
    expect(evaluateNotification(event, config, 720).allowed).toBe(true)
    expect(evaluateNotification({ ...event, mentioned: false }, config, 720).reason).toBe('advanced-rule')
    expect(evaluateNotification({ ...event, senderId: '99' }, config, 720).reason).toBe('advanced-rule')
    expect(evaluateNotification({ ...event, threadId: '8' }, config, 720).reason).toBe('advanced-rule')
    expect(evaluateNotification({ ...event, text: 'Routine update' }, config, 720).reason).toBe('advanced-rule')
  })
})

describe('notification presentation', () => {
  it('adds a non-blank topic to the chat title', () => {
    expect(notificationTitle('Ops', 'Deploys')).toBe('Ops - Deploys')
    expect(notificationTitle('Ops', '  ')).toBe('Ops')
  })

  it('formats media labels and captions', () => {
    expect(formatPreview('text', '')).toBe('New message')
    expect(formatPreview('photo', '')).toBe('📷 Photo')
    expect(formatPreview('document', 'report.pdf')).toBe('📎 Document: report.pdf')
  })
})
