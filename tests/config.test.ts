import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, normalizeConfig } from '../src/shared/config'

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
})
