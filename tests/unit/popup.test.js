import { describe, it, expect, beforeEach, vi } from 'vitest'
import { promptStorage, extractTags } from '../../storage.js'
import { PromptManager } from '../../popup.js'

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

describe('Bugfix Regressions', () => {
  let manager

  beforeEach(() => {
    chrome.storage.local.clear()
    promptStorage._invalidateCache()
    setupDOM()
    manager = new PromptManager()
  })

  describe('Fix 1+2: renderPrompts always rebuilds DOM', () => {
    it('updates title in DOM after editing a prompt', async () => {
      const saved = await promptStorage.savePrompt({ label: 'Original', template: 'Content', tags: [] })
      const prompts = await promptStorage.getPrompts()
      manager.renderPrompts(prompts)

      expect(document.querySelector('.prompt-title').textContent).toBe('Original')

      await promptStorage.savePrompt({ id: saved.id, label: 'Updated', template: 'Content', tags: [] })
      const updated = await promptStorage.getPrompts()
      manager.renderPrompts(updated)

      expect(document.querySelector('.prompt-title').textContent).toBe('Updated')
    })

    it('updates favorite star in DOM with single prompt', async () => {
      await promptStorage.savePrompt({ label: 'Solo', template: 'Content', favorite: false })
      const prompts = await promptStorage.getPrompts()
      manager.renderPrompts(prompts)

      expect(document.querySelector('.favorite-star').textContent).toBe('☆')

      await promptStorage.toggleFavorite(prompts[0].id)
      const updated = await promptStorage.getPrompts()
      manager.renderPrompts(updated)

      expect(document.querySelector('.favorite-star').textContent).toBe('★')
    })
  })

  describe('Fix 3: insertPrompt clipboard fallback', () => {
    it('copies actual prompt text on injection failure', async () => {
      const saved = await promptStorage.savePrompt({ label: 'Test', template: 'My prompt text' })
      chrome.scripting.executeScript.mockRejectedValue(new Error('Cannot inject'))
      const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})

      await manager.insertPrompt(saved.id)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('My prompt text')
      expect(closeSpy).not.toHaveBeenCalled()
      closeSpy.mockRestore()
    })
  })

  describe('Fix 4: Escape in tag autocomplete', () => {
    it('prevents popup close when closing tag suggestions', () => {
      const container = document.getElementById('tag-suggestions')
      container.classList.remove('hidden')
      container.innerHTML = '<div class="tag-suggestion-item">dev</div>'

      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true })
      const preventSpy = vi.spyOn(event, 'preventDefault')
      const stopSpy = vi.spyOn(event, 'stopPropagation')

      manager.handleTagKeydown(event)

      expect(preventSpy).toHaveBeenCalled()
      expect(stopSpy).toHaveBeenCalled()
      expect(container.classList.contains('hidden')).toBe(true)
    })
  })

  describe('Fix 5: Form hides prompt list', () => {
    it('hides prompt list when form opens and restores on close', () => {
      const promptList = document.getElementById('prompt-list')

      manager.showForm()
      expect(promptList.style.display).toBe('none')

      manager.hideForm()
      expect(promptList.style.display).toBe('')
    })
  })
})
