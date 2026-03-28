import { describe, it, expect, beforeEach, vi } from 'vitest'
import { promptStorage, extractTags } from '../../storage.js'

function setupDOM() {
  document.body.innerHTML = `
    <div id="search-input"></div>
    <div id="prompt-form" class="hidden"></div>
    <div id="form-title"></div>
    <input id="prompt-title" value="">
    <textarea id="prompt-content"></textarea>
    <input id="prompt-tags" value="">
    <div id="prompt-list"></div>
    <div id="empty-state" class="hidden"></div>
    <select id="tag-filter">
      <option value="">All Tags</option>
    </select>
    <div id="drop-zone" class="hidden"></div>
    <div id="backup-panel" class="hidden"></div>
    <div id="backup-list"></div>
    <div id="import-btn">Import</div>
    <textarea id="paste-json"></textarea>
    <button id="import-from-paste" disabled></button>
    <div id="theme-toggle">🖥️</div>
    <div id="notification" class="hidden">
      <span id="notification-text"></span>
    </div>
    <div id="tag-suggestions" class="hidden"></div>
  `
}

describe('extractTags', () => {
  it('extracts and deduplicates tags', () => {
    const prompts = [
      { tags: ['a', 'b'] },
      { tags: ['b', 'c'] }
    ]
    expect(extractTags(prompts)).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array for no prompts', () => {
    expect(extractTags([])).toEqual([])
  })

  it('handles prompts without tags', () => {
    const prompts = [{ tags: null }, { tags: undefined }, {}]
    expect(extractTags(prompts)).toEqual([])
  })
})

describe('Storage Integration', () => {
  beforeEach(() => {
    chrome.storage.local.clear()
    promptStorage._invalidateCache()
    setupDOM()
  })

  it('savePrompt + getPrompts round-trips correctly', async () => {
    await promptStorage.savePrompt({ label: 'Test', template: 'Content', tags: ['a'] })
    const prompts = await promptStorage.getPrompts()

    expect(prompts).toHaveLength(1)
    expect(prompts[0].label).toBe('Test')
    expect(prompts[0].tags).toEqual(['a'])
  })

  it('import skips duplicates by label', async () => {
    await promptStorage.savePrompt({ label: 'Existing', template: 'Content' })
    const json = JSON.stringify({ prompts: [
      { label: 'Existing', template: 'New' },
      { label: 'Brand New', template: 'Content' }
    ]})

    const result = await promptStorage.importPrompts(json)
    expect(result.imported).toBe(1)
  })

  it('export produces valid JSON with version', async () => {
    await promptStorage.savePrompt({ label: 'Test', template: 'Content' })
    const json = await promptStorage.exportPrompts()
    const data = JSON.parse(json)

    expect(data.version).toBeDefined()
    expect(data.prompts).toHaveLength(1)
  })
})

describe('Theme Application', () => {
  beforeEach(() => {
    setupDOM()
  })

  it('applyTheme("dark") sets data-theme attribute', () => {
    const applyTheme = (theme) => {
      if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme')
      } else {
        document.documentElement.setAttribute('data-theme', theme)
      }
    }
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('applyTheme("auto") removes data-theme attribute', () => {
    const applyTheme = (theme) => {
      if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme')
      } else {
        document.documentElement.setAttribute('data-theme', theme)
      }
    }
    applyTheme('dark')
    applyTheme('auto')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('cycleTheme cycles auto -> light -> dark -> auto', () => {
    const themes = ['auto', 'light', 'dark']
    const cycle = (current) => themes[(themes.indexOf(current) + 1) % themes.length]

    expect(cycle('auto')).toBe('light')
    expect(cycle('light')).toBe('dark')
    expect(cycle('dark')).toBe('auto')
  })
})
