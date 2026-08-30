import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('popup', () => {
  it('keeps import and export available without opening settings', () => {
    const html = readFileSync(new URL('../popup.html', import.meta.url), 'utf8')

    expect(html).toContain('id="popup-export"')
    expect(html).toContain('id="popup-import"')
    expect(html).toContain('id="popup-inbox-list"')
    expect(html).toContain('id="popup-dismiss-all"')
  })
})
