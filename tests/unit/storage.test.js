import { describe, it, expect, beforeEach } from 'vitest'
import { promptStorage as storage } from '../../storage.js'

describe('PromptStorage', () => {
  beforeEach(() => {
    chrome.storage.local.clear()
  })

  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = storage.generateId()
      const id2 = storage.generateId()
      expect(id1).not.toBe(id2)
    })

    it('generates IDs with correct format', () => {
      const id = storage.generateId()
      expect(id).toMatch(/^prompt_\d+_[a-z0-9]{9}$/)
    })
  })

  describe('extractTimestampFromId', () => {
    it('extracts timestamp from valid ID', () => {
      const id = 'prompt_1234567890_abc123def'
      const timestamp = storage.extractTimestampFromId(id)
      expect(timestamp).toBe(1234567890)
    })

    it('returns current time for invalid ID', () => {
      const timestamp = storage.extractTimestampFromId('invalid')
      expect(timestamp).toBeDefined()
      expect(typeof timestamp).toBe('number')
    })

    it('returns current time for null/undefined', () => {
      expect(storage.extractTimestampFromId(null)).toBeDefined()
      expect(storage.extractTimestampFromId(undefined)).toBeDefined()
    })
  })

  describe('getPrompts', () => {
    it('returns empty array when no prompts stored', async () => {
      const prompts = await storage.getPrompts()
      expect(prompts).toEqual([])
    })

    it('returns stored prompts', async () => {
      const testPrompts = [
        { id: 'prompt_1', label: 'Test 1', template: 'Content 1', tags: ['tag1'], favorite: false, createdAt: 1000 },
        { id: 'prompt_2', label: 'Test 2', template: 'Content 2', tags: ['tag2'], favorite: true, createdAt: 2000 }
      ]
      await chrome.storage.local.set({ prompts: testPrompts })
      
      const prompts = await storage.getPrompts()
      expect(prompts).toHaveLength(2)
    })

    it('sorts favorites first', async () => {
      const testPrompts = [
        { id: 'prompt_1', label: 'Regular', template: 'Content', favorite: false, createdAt: 1000 },
        { id: 'prompt_2', label: 'Favorite', template: 'Content', favorite: true, createdAt: 2000 }
      ]
      await chrome.storage.local.set({ prompts: testPrompts })
      
      const prompts = await storage.getPrompts()
      expect(prompts[0].favorite).toBe(true)
    })

    it('sorts by createdAt descending', async () => {
      const testPrompts = [
        { id: 'prompt_1', label: 'Old', template: 'Content', favorite: false, createdAt: 1000 },
        { id: 'prompt_2', label: 'New', template: 'Content', favorite: false, createdAt: 2000 }
      ]
      await chrome.storage.local.set({ prompts: testPrompts })
      
      const prompts = await storage.getPrompts()
      expect(prompts[0].label).toBe('New')
    })

    it('handles legacy object format', async () => {
      await chrome.storage.local.set({ prompts: { prompts: [{ id: 'test', label: 'Test', template: 'Content' }] } })
      
      const prompts = await storage.getPrompts()
      expect(prompts).toHaveLength(1)
    })

    it('normalizes favorite to boolean', async () => {
      await chrome.storage.local.set({ prompts: [{ id: 'test', label: 'Test', template: 'Content', favorite: true }] })
      
      const prompts = await storage.getPrompts()
      expect(prompts[0].favorite).toBe(true)
    })
  })

  describe('savePrompt', () => {
    it('saves new prompt', async () => {
      const prompt = { label: 'Test', template: 'Content', tags: ['tag1'] }
      const saved = await storage.savePrompt(prompt)
      
      expect(saved.id).toMatch(/^prompt_/)
      expect(saved.label).toBe('Test')
      expect(saved.template).toBe('Content')
      expect(saved.tags).toEqual(['tag1'])
      expect(saved.favorite).toBe(false)
    })

    it('updates existing prompt', async () => {
      const original = await storage.savePrompt({ label: 'Original', template: 'Content' })
      const updated = await storage.savePrompt({ id: original.id, label: 'Updated', template: 'New Content' })
      
      expect(updated.id).toBe(original.id)
      expect(updated.label).toBe('Updated')
      
      const prompts = await storage.getPrompts()
      expect(prompts).toHaveLength(1)
    })

    it('trims whitespace from label and template', async () => {
      const saved = await storage.savePrompt({ label: '  Test  ', template: '  Content  ' })
      expect(saved.label).toBe('Test')
      expect(saved.template).toBe('Content')
    })

    it('handles string tags', async () => {
      const saved = await storage.savePrompt({ label: 'Test', template: 'Content', tags: 'tag1, tag2, tag3' })
      expect(saved.tags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('handles invalid tags', async () => {
      const saved = await storage.savePrompt({ label: 'Test', template: 'Content', tags: 123 })
      expect(saved.tags).toEqual([])
    })

    it('uses provided createdAt', async () => {
      const saved = await storage.savePrompt({ label: 'Test', template: 'Content', createdAt: 999999 })
      expect(saved.createdAt).toBe(999999)
    })
  })

  describe('deletePrompt', () => {
    it('deletes prompt by ID', async () => {
      const saved = await storage.savePrompt({ label: 'Test', template: 'Content' })
      await storage.deletePrompt(saved.id)
      
      const prompts = await storage.getPrompts()
      expect(prompts).toHaveLength(0)
    })

    it('does not affect other prompts', async () => {
      const saved1 = await storage.savePrompt({ label: 'Test 1', template: 'Content 1' })
      const saved2 = await storage.savePrompt({ label: 'Test 2', template: 'Content 2' })
      await storage.deletePrompt(saved1.id)
      
      const prompts = await storage.getPrompts()
      expect(prompts).toHaveLength(1)
      expect(prompts[0].id).toBe(saved2.id)
    })
  })

  describe('getPromptById', () => {
    it('returns prompt by ID', async () => {
      const saved = await storage.savePrompt({ label: 'Test', template: 'Content' })
      const found = await storage.getPromptById(saved.id)
      
      expect(found).not.toBeNull()
      expect(found.label).toBe('Test')
    })

    it('returns null for non-existent ID', async () => {
      const found = await storage.getPromptById('non_existent_id')
      expect(found).toBeNull()
    })
  })

  describe('toggleFavorite', () => {
    it('toggles favorite from false to true', async () => {
      const saved = await storage.savePrompt({ label: 'Test', template: 'Content', favorite: false })
      const newStatus = await storage.toggleFavorite(saved.id)
      
      expect(newStatus).toBe(true)
      
      const prompts = await storage.getPrompts()
      expect(prompts[0].favorite).toBe(true)
    })

    it('toggles favorite from true to false', async () => {
      const saved = await storage.savePrompt({ label: 'Test', template: 'Content', favorite: true })
      const newStatus = await storage.toggleFavorite(saved.id)
      
      expect(newStatus).toBe(false)
    })

    it('throws for non-existent prompt', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(storage.toggleFavorite('non_existent')).rejects.toThrow('Prompt not found')
      consoleSpy.mockRestore()
    })
  })

  describe('getAllTags', () => {
    it('returns empty array when no prompts', async () => {
      const tags = await storage.getAllTags()
      expect(tags).toEqual([])
    })

    it('returns unique sorted tags', async () => {
      await storage.savePrompt({ label: 'Test 1', template: 'Content', tags: ['a', 'b'] })
      await storage.savePrompt({ label: 'Test 2', template: 'Content', tags: ['b', 'c'] })
      
      const tags = await storage.getAllTags()
      expect(tags).toEqual(['a', 'b', 'c'])
    })

    it('trims tags', async () => {
      await storage.savePrompt({ label: 'Test', template: 'Content', tags: [' tag1 ', ' tag2 '] })
      
      const tags = await storage.getAllTags()
      expect(tags).toEqual(['tag1', 'tag2'])
    })
  })

  describe('exportPrompts', () => {
    it('exports prompts as JSON', async () => {
      await storage.savePrompt({ label: 'Test', template: 'Content' })
      
      const json = await storage.exportPrompts()
      const data = JSON.parse(json)
      
      expect(data.version).toBe('1.3')
      expect(data.exported).toBeDefined()
      expect(Array.isArray(data.prompts)).toBe(true)
    })

    it('exports empty array when no prompts', async () => {
      const json = await storage.exportPrompts()
      const data = JSON.parse(json)
      
      expect(data.prompts).toHaveLength(0)
    })
  })

  describe('importPrompts', () => {
    it('imports from standard format', async () => {
      const json = JSON.stringify({ prompts: [{ label: 'Imported', template: 'Content', tags: ['tag1'] }] })
      
      const result = await storage.importPrompts(json)
      expect(result.imported).toBe(1)
      
      const prompts = await storage.getPrompts()
      expect(prompts).toHaveLength(1)
      expect(prompts[0].label).toBe('Imported')
    })

    it('imports from array format', async () => {
      const json = JSON.stringify([{ label: 'Imported', template: 'Content' }])
      
      const result = await storage.importPrompts(json)
      expect(result.imported).toBe(1)
    })

    it('maps title to label', async () => {
      const json = JSON.stringify({ prompts: [{ title: 'Title', template: 'Content' }] })
      
      const result = await storage.importPrompts(json)
      expect(result.imported).toBe(1)
      
      const prompts = await storage.getPrompts()
      expect(prompts[0].label).toBe('Title')
    })

    it('maps content to template', async () => {
      const json = JSON.stringify({ prompts: [{ label: 'Test', content: 'Content' }] })
      
      const result = await storage.importPrompts(json)
      expect(result.imported).toBe(1)
      
      const prompts = await storage.getPrompts()
      expect(prompts[0].template).toBe('Content')
    })

    it('skips duplicates by label', async () => {
      await storage.savePrompt({ label: 'Existing', template: 'Content' })
      const json = JSON.stringify({ prompts: [{ label: 'Existing', template: 'New Content' }] })
      
      const result = await storage.importPrompts(json)
      expect(result.imported).toBe(0)
    })

    it('throws on invalid JSON', async () => {
      await expect(storage.importPrompts('invalid json')).rejects.toThrow('Invalid JSON')
    })

    it('throws on invalid format', async () => {
      await expect(storage.importPrompts(JSON.stringify({ data: 'not array' }))).rejects.toThrow('Invalid file format')
    })

    it('imports favorite status', async () => {
      const json = JSON.stringify({ prompts: [{ label: 'Test', template: 'Content', favorite: true }] })
      
      const result = await storage.importPrompts(json)
      expect(result.imported).toBe(1)
      
      const prompts = await storage.getPrompts()
      expect(prompts[0].favorite).toBe(true)
    })

    it('imports createdAt timestamp', async () => {
      const json = JSON.stringify({ prompts: [{ label: 'Test', template: 'Content', createdAt: 1234567890 }] })
      
      const result = await storage.importPrompts(json)
      expect(result.imported).toBe(1)
      
      const prompts = await storage.getPrompts()
      expect(prompts[0].createdAt).toBe(1234567890)
    })
  })

  describe('createBackup', () => {
    it('creates backup', async () => {
      await storage.savePrompt({ label: 'Test', template: 'Content' })
      await storage.createBackup('testReason')
      
      const backups = await storage.getBackups()
      expect(backups).toHaveLength(1)
      expect(backups[0].reason).toBe('testReason')
      expect(backups[0].promptCount).toBe(1)
    })

    it('limits to 3 backups', async () => {
      for (let i = 0; i < 5; i++) {
        await storage.savePrompt({ label: `Test ${i}`, template: 'Content' })
        vi.useFakeTimers()
        vi.setSystemTime(Date.now() + i * 4000000)
        await storage.createBackup(`reason${i}`)
        vi.useRealTimers()
      }
      
      const backups = await storage.getBackups()
      expect(backups).toHaveLength(3)
    })

    it('respects 1-hour anti-spam', async () => {
      await storage.savePrompt({ label: 'Test', template: 'Content' })
      await storage.createBackup('reason1')
      
      vi.useFakeTimers()
      vi.setSystemTime(Date.now() + 500000)
      await storage.createBackup('reason2')
      vi.useRealTimers()
      
      const backups = await storage.getBackups()
      expect(backups).toHaveLength(1)
    })

    it('does not backup empty prompts', async () => {
      await storage.createBackup('emptyReason')
      
      const backups = await storage.getBackups()
      expect(backups).toHaveLength(0)
    })
  })

  describe('getBackups', () => {
    it('returns empty array when no backups', async () => {
      const backups = await storage.getBackups()
      expect(backups).toEqual([])
    })

    it('returns stored backups', async () => {
      await storage.savePrompt({ label: 'Test', template: 'Content' })
      await storage.createBackup('testReason')
      
      const backups = await storage.getBackups()
      expect(backups).toHaveLength(1)
    })
  })

  describe('restoreBackup', () => {
    it('restores backup', async () => {
      await storage.savePrompt({ label: 'Original', template: 'Content' })
      await storage.createBackup('beforeRestore')
      
      const backups = await storage.getBackups()
      const backupId = backups[0].id
      
      await storage.savePrompt({ label: 'Modified', template: 'New Content' })
      await storage.restoreBackup(backupId)
      
      const prompts = await storage.getPrompts()
      expect(prompts).toHaveLength(1)
      expect(prompts[0].label).toBe('Original')
    })

    it('throws for non-existent backup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(storage.restoreBackup('non_existent')).rejects.toThrow('Backup not found')
      consoleSpy.mockRestore()
    })

    it('creates pre-restore backup', async () => {
      await storage.savePrompt({ label: 'Test', template: 'Content' })
      await storage.createBackup('initial')
      
      const backups = await storage.getBackups()
      const initialCount = backups.length
      
      vi.useFakeTimers()
      vi.setSystemTime(Date.now() + 4000000)
      await storage.restoreBackup(backups[0].id)
      vi.useRealTimers()
      
      const newBackups = await storage.getBackups()
      expect(newBackups.length).toBe(initialCount + 1)
    })
  })
})
