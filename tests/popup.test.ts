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

  it('supports popup or side-panel messages with light and dark themes', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'))
    const options = readFileSync(new URL('../options.html', import.meta.url), 'utf8')
    const sidePanel = readFileSync(new URL('../sidepanel.html', import.meta.url), 'utf8')
    const worker = readFileSync(new URL('../src/service-worker.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('../src/ui.css', import.meta.url), 'utf8')

    expect(manifest.permissions).toContain('sidePanel')
    expect(manifest.side_panel.default_path).toBe('sidepanel.html')
    expect(options).toContain('id="theme"')
    expect(options).toContain('id="message-view"')
    expect(sidePanel).toContain('/src/popup.ts')
    expect(worker).toContain('chrome.action.setPopup')
    expect(worker).toContain('openPanelOnActionClick')
    expect(css).toContain(':root[data-theme="dark"]')
    expect(css).toContain('prefers-color-scheme:dark')
  })
})
