import { describe, it, expect, beforeEach } from 'vitest'
import { promptStorage, extractTags } from '../../storage.js'
import { t, I18N_LOCALE } from '../../i18n.js'

describe('Storage - ID Generation', () => {
  it('generates ID with correct format', () => {
    const id = promptStorage.generateId()
    expect(id).toMatch(/^prompt_\d+_[a-z0-9]{9}$/)
  })

  it('generates different IDs', () => {
    const id1 = promptStorage.generateId()
    const id2 = promptStorage.generateId()
    expect(id1).not.toBe(id2)
  })
})

describe('Storage - Prompt Validation via Save', () => {
  beforeEach(() => {
    chrome.storage.local.clear()
    promptStorage._invalidateCache()
  })

  it('trims whitespace from label and template', async () => {
    const saved = await promptStorage.savePrompt({ label: '  Test  ', template: '  Content  ' })
    expect(saved.label).toBe('Test')
    expect(saved.template).toBe('Content')
  })

  it('normalizes string tags to array', async () => {
    const saved = await promptStorage.savePrompt({ label: 'Test', template: 'Content', tags: 'a, b, c' })
    expect(saved.tags).toEqual(['a', 'b', 'c'])
  })

  it('handles invalid tags gracefully', async () => {
    const saved = await promptStorage.savePrompt({ label: 'Test', template: 'Content', tags: 123 })
    expect(saved.tags).toEqual([])
  })
})

describe('extractTags', () => {
  it('collects unique sorted tags from prompts', () => {
    const prompts = [
      { tags: ['development', 'code'] },
      { tags: ['productivity', 'development'] },
      { tags: ['meeting'] }
    ]
    expect(extractTags(prompts)).toEqual(['code', 'development', 'meeting', 'productivity'])
  })

  it('handles edge cases', () => {
    const prompts = [
      { tags: ['  tag1  ', '', '  tag2  '] },
      { tags: null },
      { tags: undefined },
      { tags: [] }
    ]
    expect(extractTags(prompts)).toEqual(['tag1', 'tag2'])
  })
})

describe('Storage - Sorting', () => {
  beforeEach(() => {
    chrome.storage.local.clear()
    promptStorage._invalidateCache()
  })

  it('sorts favorites first, then by date descending', async () => {
    await promptStorage.savePrompt({ label: 'Old Normal', template: 'c', favorite: false, createdAt: 1000 })
    await promptStorage.savePrompt({ label: 'New Favorite', template: 'c', favorite: true, createdAt: 3000 })
    await promptStorage.savePrompt({ label: 'Old Favorite', template: 'c', favorite: true, createdAt: 2000 })
    await promptStorage.savePrompt({ label: 'New Normal', template: 'c', favorite: false, createdAt: 4000 })

    const prompts = await promptStorage.getPrompts()
    expect(prompts.map(p => p.label)).toEqual([
      'New Favorite', 'Old Favorite', 'New Normal', 'Old Normal'
    ])
  })
})

describe('i18n', () => {
  it('translates known keys', () => {
    expect(t('btn.save')).toBeTruthy()
    expect(typeof t('btn.save')).toBe('string')
  })

  it('returns key for unknown translations', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('interpolates parameters', () => {
    const result = t('notify.importedAll', 5)
    expect(result).toContain('5')
  })

  it('detects a valid locale', () => {
    expect(['en', 'fr']).toContain(I18N_LOCALE)
  })
})
