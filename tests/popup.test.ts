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
    expect(manifest.action.default_popup).toBeUndefined()
    expect(options).toContain('id="theme"')
    expect(options).toContain('id="message-view"')
    expect(sidePanel).toContain('/src/popup.ts')
    expect(worker).toContain('chrome.action.setPopup')
    expect(worker).toContain('openPanelOnActionClick')
    expect(css).toContain(':root[data-theme="dark"]')
    expect(css).toContain('prefers-color-scheme:dark')
  })

  it('renders collapsible source groups with source and message dismiss controls', () => {
    const popup = readFileSync(new URL('../src/popup.ts', import.meta.url), 'utf8')
    const protocol = readFileSync(new URL('../src/shared/protocol.ts', import.meta.url), 'utf8')
    const worker = readFileSync(new URL('../src/service-worker.ts', import.meta.url), 'utf8')

    expect(popup).toContain("document.createElement('details')")
    expect(popup).toContain("type: 'DISMISS_INBOX_SOURCE', source: group.source")
    expect(popup).toContain('row.append(dismiss, open)')
    expect(protocol).toContain("type: 'DISMISS_INBOX_SOURCE'; source: string")
    expect(worker).toContain("case 'DISMISS_INBOX_SOURCE'")
  })

  it('preserves collapsed source groups when the inbox rerenders', () => {
    const popup = readFileSync(new URL('../src/popup.ts', import.meta.url), 'utf8')

    expect(popup).toContain("list.querySelectorAll<HTMLDetailsElement>('.popup-inbox-group')")
    expect(popup).toContain('(group) => [group.dataset.source ?? \'\', group.open]')
    expect(popup).toContain('section.dataset.source = group.source')
    expect(popup).toContain('groupStates.get(group.source)')
  })

  it('collapses source groups by default when more than one source exists', () => {
    const popup = readFileSync(new URL('../src/popup.ts', import.meta.url), 'utf8')

    expect(popup).toContain('const sourceGroups = groupInboxBySource(state.inbox)')
    expect(popup).toContain('section.open = groupStates.get(group.source) ?? (sourceGroups.length === 1)')
  })

  it('preserves the inbox scroll position when the inbox rerenders', () => {
    const popup = readFileSync(new URL('../src/popup.ts', import.meta.url), 'utf8')

    expect(popup).toContain('const scrollTop = list.scrollTop')
    expect(popup).toContain('list.scrollTop = scrollTop')
  })

  it('lets the user resize the message list vertically', () => {
    const css = readFileSync(new URL('../src/ui.css', import.meta.url), 'utf8')

    expect(css).toMatch(/\.popup-inbox-list \{[^}]*min-height:100px;[^}]*resize:vertical;/)
  })

  it('keeps the empty inbox message clear of the container edge', () => {
    const popup = readFileSync(new URL('../src/popup.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('../src/ui.css', import.meta.url), 'utf8')

    expect(popup).toContain("list.classList.toggle('empty', state.inbox.length === 0)")
    expect(css).toContain('.popup-inbox-list.empty { padding:10px 12px; }')
  })
})
