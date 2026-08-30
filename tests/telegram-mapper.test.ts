import { describe, expect, it } from 'vitest'
import { chatType, mediaKind, messageUrl, missingChatIds, notificationKey, unavailableChat } from '../src/shared/telegram-mapper'

describe('telegram message mapping', () => {
  it('maps Telegram media into notification kinds', () => {
    expect(mediaKind(undefined)).toBe('text')
    expect(mediaKind('photo')).toBe('photo')
    expect(mediaKind('video', true)).toBe('animation')
    expect(mediaKind('voice')).toBe('voice')
    expect(mediaKind('webpage')).toBe('other')
  })

  it('builds public, private-channel, and direct-chat links', () => {
    expect(messageUrl('-1001234567890', 'ops_news', 55, '7')).toBe('https://t.me/ops_news/55?thread=7')
    expect(messageUrl('-1001234567890', '', 55, '7')).toBe('https://t.me/c/1234567890/55?thread=7')
    expect(messageUrl('42', '', 55, '')).toBe('https://web.telegram.org/k/#42')
  })

  it('uses a stable conversation key per chat, topic, and sender', () => {
    expect(notificationKey('-1001', '7', '42')).toBe('message:-1001:7:42')
    expect(notificationKey('-1001', '8', '42')).not.toBe(notificationKey('-1001', '7', '42'))
  })

  it('classifies users, bots, groups, and channels', () => {
    expect(chatType('user', false)).toBe('user')
    expect(chatType('user', true)).toBe('bot')
    expect(chatType('chat', false, 'supergroup')).toBe('group')
    expect(chatType('chat', false, 'channel')).toBe('channel')
  })

  it('finds selected chats missing from the dialog page', () => {
    expect(missingChatIds(['1', '2'], ['2', '3', '3', '4'])).toEqual(['3', '4'])
    expect(unavailableChat('3')).toEqual({
      id: '3',
      title: 'Selected chat unavailable',
      username: '',
      type: 'unavailable',
      archived: false,
      muted: false
    })
  })
})
