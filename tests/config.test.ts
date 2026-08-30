import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  exportConfig,
  importConfig,
  isSettingsBackupFile,
  normalizeConfig
} from '../src/shared/config'

describe('normalizeConfig', () => {
  it('returns independent defaults for missing input', () => {
    const first = normalizeConfig(undefined)
    first.selectedChatIds.push('1')
    expect(normalizeConfig(undefined)).toEqual(DEFAULT_CONFIG)
  })

  it('normalizes imported settings and drops invalid values', () => {
    expect(normalizeConfig({
      version: 1,
      notificationsEnabled: false,
      showMessagePreviews: false,
      selectedChatIds: [1, '-1002', null],
      hiddenChatIds: ['3'],
      globalDirection: 'BOTH',
      chatDirections: { 1: 'OUTGOING', 2: 'bad' },
      textFilters: [' spam ', '', 9],
      regexFilters: ['buy\\s+now'],
      quietHours: { enabled: true, startMinutes: -1, endMinutes: 2000 },
      chatRules: {
        1: { mentionsOnly: true, senderIds: [42], threadIds: [7], requiredKeywords: [' urgent '] }
      }
    })).toEqual({
      version: 1,
      notificationsEnabled: false,
      showMessagePreviews: false,
      selectedChatIds: ['1', '-1002'],
      hiddenChatIds: ['3'],
      globalDirection: 'both',
      chatDirections: { '1': 'outgoing' },
      textFilters: ['spam'],
      regexFilters: ['buy\\s+now'],
      quietHours: { enabled: true, startMinutes: 0, endMinutes: 1439 },
      chatRules: {
        '1': { mentionsOnly: true, senderIds: ['42'], threadIds: ['7'], requiredKeywords: ['urgent'] }
      }
    })
  })

  it('imports the Android settings format', () => {
    expect(importConfig({
      version: 1,
      favoriteChats: [1, -1002],
      hiddenChats: [3],
      globalDirection: 'BOTH',
      chatDirections: { 1: 'OUTGOING' },
      textFilters: ['spam'],
      regexFilters: ['buy\\s+now'],
      notificationsEnabled: false,
      showMessagePreviews: false,
      quietHoursEnabled: true,
      quietStartMinutes: 60,
      quietEndMinutes: 120,
      chatRules: {
        1: { mentionsOnly: true, senderIds: [42], threadIds: [7], requiredKeywords: ['urgent'] }
      }
    })).toEqual({
      version: 1,
      notificationsEnabled: false,
      showMessagePreviews: false,
      selectedChatIds: ['1', '-1002'],
      hiddenChatIds: ['3'],
      globalDirection: 'both',
      chatDirections: { '1': 'outgoing' },
      textFilters: ['spam'],
      regexFilters: ['buy\\s+now'],
      quietHours: { enabled: true, startMinutes: 60, endMinutes: 120 },
      chatRules: {
        '1': { mentionsOnly: true, senderIds: ['42'], threadIds: ['7'], requiredKeywords: ['urgent'] }
      }
    })
  })

  it('exports the Android settings format', () => {
    expect(exportConfig(normalizeConfig({
      selectedChatIds: ['1'],
      hiddenChatIds: ['-1002'],
      globalDirection: 'outgoing',
      chatDirections: { 1: 'both' },
      quietHours: { enabled: true, startMinutes: 60, endMinutes: 120 },
      chatRules: { 1: { mentionsOnly: false, senderIds: ['42'], threadIds: ['7'], requiredKeywords: ['urgent'] } }
    }))).toEqual({
      version: 1,
      favoriteChats: [1],
      hiddenChats: [-1002],
      globalDirection: 'OUTGOING',
      chatDirections: { '1': 'BOTH' },
      textFilters: [],
      regexFilters: [],
      notificationsEnabled: true,
      showMessagePreviews: true,
      quietHoursEnabled: true,
      quietStartMinutes: 60,
      quietEndMinutes: 120,
      chatRules: {
        '1': { mentionsOnly: false, senderIds: [42], threadIds: [7], requiredKeywords: ['urgent'] }
      }
    })
  })

  it('rejects unsupported settings versions', () => {
    expect(() => importConfig({ version: 2 })).toThrow('Unsupported configuration version: 2')
  })

  it('recognizes Android and legacy Chrome Saved Messages backups', () => {
    expect(isSettingsBackupFile('telegram_notifier_settings.json')).toBe(true)
    expect(isSettingsBackupFile('custom-chat-notifier-settings.json')).toBe(true)
    expect(isSettingsBackupFile('other.json')).toBe(false)
  })
})
