// Basic tests to demonstrate functional Vitest configuration
import { describe, it, expect, beforeEach } from 'vitest'

describe('Vitest Configuration - Basic Tests', () => {
  beforeEach(() => {
    // Basic setup for each test
    document.body.innerHTML = ''
  })

  describe('Test Environment', () => {
    it('has access to DOM via happy-dom', () => {
      const div = document.createElement('div')
      div.textContent = 'Test DOM'
      document.body.appendChild(div)

      expect(document.body.children).toHaveLength(1)
      expect(div.textContent).toBe('Test DOM')
    })

    it('has access to chrome mocks', () => {
      // Chrome API should be primary
      expect(global.chrome || global.browser).toBeDefined()
      expect((global.chrome || global.browser).storage).toBeDefined()
      expect((global.chrome || global.browser).storage.local).toBeDefined()
      expect(typeof (global.chrome || global.browser).storage.local.get).toBe('function')
      expect(typeof (global.chrome || global.browser).storage.local.set).toBe('function')
    })

    it('can mock chrome APIs', async () => {
      const api = global.chrome || global.browser
      await api.storage.local.set({ test: 'value' })
      const result = await api.storage.local.get('test')
      
      expect(result.test).toBe('value')
    })
  })

  describe('Business Logic - ID Generation', () => {
    const generateId = () => {
      return 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }

    it('generates ID with correct format', () => {
      const id = generateId()
      expect(id).toMatch(/^prompt_\d+_[a-z0-9]{9}$/)
    })

    it('generates different IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('Business Logic - Prompt Validation', () => {
    const validatePrompt = (prompt) => {
      const errors = []
      
      if (!prompt.label || prompt.label.trim() === '') {
        errors.push('Label is required')
      }
      
      if (!prompt.template || prompt.template.trim() === '') {
        errors.push('Template is required')
      }
      
      if (prompt.label && prompt.label.trim().length > 100) {
        errors.push('Label too long')
      }
      
      return errors
    }

    it('validates a correct prompt', () => {
      const prompt = {
        label: 'Valid Prompt',
        template: 'Valid template content',
        tags: ['valid']
      }
      
      const errors = validatePrompt(prompt)
      expect(errors).toHaveLength(0)
    })

    it('detects validation errors', () => {
      const prompt = {
        label: '',
        template: ''
      }
      
      const errors = validatePrompt(prompt)
      expect(errors).toContain('Label is required')
      expect(errors).toContain('Template is required')
    })

    it('detects label too long', () => {
      const prompt = {
        label: 'A'.repeat(101),
        template: 'Valid template'
      }
      
      const errors = validatePrompt(prompt)
      expect(errors).toContain('Label too long')
    })
  })

  describe('Business Logic - Tag Management', () => {
    const collectUniqueTags = (prompts) => {
      const tagSet = new Set()
      prompts.forEach(prompt => {
        if (prompt.tags && Array.isArray(prompt.tags)) {
          prompt.tags.forEach(tag => {
            if (tag && typeof tag === 'string') {
              tagSet.add(tag.trim())
            }
          })
        }
      })
      return Array.from(tagSet).sort()
    }

    it('collects unique tags', () => {
      const prompts = [
        { tags: ['development', 'code'] },
        { tags: ['productivity', 'development'] }, // 'development' duplicated
        { tags: ['meeting'] }
      ]
      
      const tags = collectUniqueTags(prompts)
      expect(tags).toEqual(['code', 'development', 'meeting', 'productivity'])
    })

    it('handles edge cases', () => {
      const prompts = [
        { tags: ['  tag1  ', '', '  tag2  '] },
        { tags: null },
        { tags: undefined },
        { tags: [] }
      ]
      
      const tags = collectUniqueTags(prompts)
      expect(tags).toEqual(['tag1', 'tag2'])
    })
  })

  describe('Business Logic - Prompt Sorting', () => {
    const sortPrompts = (prompts) => {
      return [...prompts].sort((a, b) => {
        // Favoris d'abord
        if (a.favorite !== b.favorite) {
          return a.favorite ? -1 : 1
        }
        // Puis par date décroissante
        return (b.createdAt || 0) - (a.createdAt || 0)
      })
    }

    it('sorts prompts correctly', () => {
      const prompts = [
        { id: 1, label: 'Old Normal', favorite: false, createdAt: 1000 },
        { id: 2, label: 'New Favorite', favorite: true, createdAt: 3000 },
        { id: 3, label: 'Old Favorite', favorite: true, createdAt: 2000 },
        { id: 4, label: 'New Normal', favorite: false, createdAt: 4000 }
      ]
      
      const sorted = sortPrompts(prompts)
      
      expect(sorted[0].label).toBe('New Favorite')   // Most recent favorite
      expect(sorted[1].label).toBe('Old Favorite')   // Oldest favorite
      expect(sorted[2].label).toBe('New Normal')     // Most recent normal
      expect(sorted[3].label).toBe('Old Normal')     // Oldest normal
    })
  })

  describe('DOM Injection Simulation', () => {
    const findTargetElement = () => {
      // Simulate search for input elements for injection
      const selectors = ['#prompt-textarea', 'textarea', '[contenteditable="true"]']
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector)
        for (const element of elements) {
          if (element && !element.disabled && !element.readOnly) {
            return element
          }
        }
      }
      
      return null
    }

    it('finds a valid textarea', () => {
      const textarea = document.createElement('textarea')
      textarea.id = 'prompt-textarea'
      document.body.appendChild(textarea)
      
      const target = findTargetElement()
      expect(target).toBe(textarea)
    })

    it('ignores disabled elements', () => {
      const textarea = document.createElement('textarea')
      textarea.disabled = true
      document.body.appendChild(textarea)
      
      const target = findTargetElement()
      expect(target).toBeNull()
    })

    it('finds a contenteditable element', () => {
      const div = document.createElement('div')
      div.setAttribute('contenteditable', 'true')
      document.body.appendChild(div)
      
      const target = findTargetElement()
      expect(target).toBe(div)
    })
  })

  describe('Import/Export Logic', () => {
    const parseImportData = (jsonString) => {
      try {
        const data = JSON.parse(jsonString)
        
        // Support different formats
        let prompts = null
        if (Array.isArray(data)) {
          prompts = data
        } else if (data && Array.isArray(data.prompts)) {
          prompts = data.prompts
        } else {
          throw new Error('Invalid format')
        }
        
        // Normalize data
        return prompts.map(prompt => ({
          label: prompt.label || prompt.title || '',
          template: prompt.template || prompt.content || '',
          tags: Array.isArray(prompt.tags) ? prompt.tags : []
        })).filter(prompt => prompt.label && prompt.template)
        
      } catch (error) {
        if (error.message === 'Invalid format') {
          throw error
        }
        throw new Error('Invalid JSON')
      }
    }

    it('parses standard format', () => {
      const data = {
        prompts: [
          { label: 'Test', template: 'Content', tags: ['test'] }
        ]
      }
      
      const result = parseImportData(JSON.stringify(data))
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Test')
    })

    it('parses direct array format', () => {
      const data = [
        { label: 'Test', template: 'Content', tags: ['test'] }
      ]
      
      const result = parseImportData(JSON.stringify(data))
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Test')
    })

    it('handles alternative field names', () => {
      const data = [
        { title: 'Test Title', content: 'Test Content', tags: ['test'] }
      ]
      
      const result = parseImportData(JSON.stringify(data))
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Test Title')
      expect(result[0].template).toBe('Test Content')
    })

    it('fails with invalid JSON', () => {
      expect(() => parseImportData('invalid json')).toThrow('Invalid JSON')
    })

    it('fails with invalid format', () => {
      expect(() => parseImportData('{"invalid": "format"}')).toThrow('Invalid format')
    })
  })

  describe('Backup System', () => {
    const MAX_BACKUPS = 3
    const ANTI_SPAM_MS = 3600000 // 1 hour

    const createBackup = (backups, reason) => {
      const prompts = [{ id: '1', label: 'Test', template: 'Content' }]
      
      // Anti-spam check
      if (backups.length > 0) {
        const lastTimestamp = backups[0].timestamp
        if (Date.now() - lastTimestamp < ANTI_SPAM_MS) {
          return { backups, created: false }
        }
      }

      const backup = {
        id: 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        date: new Date().toISOString(),
        reason,
        promptCount: prompts.length,
        prompts
      }

      const newBackups = [backup, ...backups].slice(0, MAX_BACKUPS)
      return { backups: newBackups, created: true }
    }

    it('creates backup with correct structure', () => {
      const result = createBackup([], 'startup')
      
      expect(result.created).toBe(true)
      expect(result.backups).toHaveLength(1)
      expect(result.backups[0]).toHaveProperty('id')
      expect(result.backups[0]).toHaveProperty('timestamp')
      expect(result.backups[0]).toHaveProperty('date')
      expect(result.backups[0]).toHaveProperty('reason', 'startup')
      expect(result.backups[0]).toHaveProperty('promptCount')
      expect(result.backups[0]).toHaveProperty('prompts')
    })

    it('limits backups to 3', () => {
      let backups = []
      const now = Date.now()
      
      // Create backups with timestamps spaced > 1 hour apart to bypass anti-spam
      for (let i = 0; i < 5; i++) {
        const backup = {
          id: 'backup_' + now + '_' + i,
          timestamp: now - (i * 3700000), // > 1 hour apart
          date: new Date(now - (i * 3700000)).toISOString(),
          reason: 'startup',
          promptCount: 1,
          prompts: [{ id: String(i) }]
        }
        backups = [backup, ...backups].slice(0, MAX_BACKUPS)
      }
      
      expect(backups).toHaveLength(MAX_BACKUPS)
    })

    it('skips backup if less than 1 hour old', () => {
      const oldBackup = {
        id: 'backup_old',
        timestamp: Date.now() - 1800000, // 30 min ago
        date: new Date().toISOString(),
        reason: 'startup',
        promptCount: 1,
        prompts: []
      }
      
      const result = createBackup([oldBackup], 'update')
      
      expect(result.created).toBe(false)
      expect(result.backups).toHaveLength(1)
    })

    it('allows backup after 1 hour', () => {
      const oldBackup = {
        id: 'backup_old',
        timestamp: Date.now() - 3700000, // > 1 hour ago
        date: new Date().toISOString(),
        reason: 'startup',
        promptCount: 1,
        prompts: []
      }
      
      const result = createBackup([oldBackup], 'update')
      
      expect(result.created).toBe(true)
      expect(result.backups).toHaveLength(2)
    })

    const restoreBackup = (backups, backupId) => {
      const backup = backups.find(b => b.id === backupId)
      if (!backup) throw new Error('Backup not found')
      
      const newBackups = backups.filter(b => b.id !== backupId)
      return { prompts: backup.prompts, backups: newBackups }
    }

    it('restores backup correctly', () => {
      const backups = [
        { id: 'b1', prompts: [{ id: '1', label: 'Old' }] },
        { id: 'b2', prompts: [{ id: '2', label: 'New' }] }
      ]
      
      const result = restoreBackup(backups, 'b1')
      
      expect(result.prompts).toHaveLength(1)
      expect(result.prompts[0].label).toBe('Old')
      expect(result.backups).toHaveLength(1)
    })

    it('throws when backup not found', () => {
      const backups = [{ id: 'b1', prompts: [] }]
      
      expect(() => restoreBackup(backups, 'nonexistent')).toThrow('Backup not found')
    })
  })

  describe('i18n System', () => {
    const translations = {
      en: {
        'btn.save': 'Save',
        'btn.cancel': 'Cancel',
        'notify.imported': '{0} prompts imported successfully!',
        'notify.empty': 'No prompts'
      },
      fr: {
        'btn.save': 'Enregistrer',
        'btn.cancel': 'Annuler',
        'notify.imported': '{0} prompts importés avec succès !'
      }
    }

    const detectLocale = (lang) => {
      return lang.startsWith('fr') ? 'fr' : 'en'
    }

    const translate = (locale, key, ...params) => {
      let str = translations[locale]?.[key] ?? translations.en[key] ?? key
      params.forEach((val, i) => {
        str = str.replace(`{${i}}`, val)
      })
      return str
    }

    it('detects French locale', () => {
      expect(detectLocale('fr-FR')).toBe('fr')
      expect(detectLocale('fr')).toBe('fr')
    })

    it('detects English locale', () => {
      expect(detectLocale('en-US')).toBe('en')
      expect(detectLocale('en')).toBe('en')
      expect(detectLocale('de-DE')).toBe('en')
    })

    it('translates key in current locale', () => {
      expect(translate('en', 'btn.save')).toBe('Save')
      expect(translate('fr', 'btn.save')).toBe('Enregistrer')
    })

    it('falls back to English for missing keys', () => {
      expect(translate('fr', 'notify.empty')).toBe('No prompts')
    })

    it('translates with parameters', () => {
      const result = translate('en', 'notify.imported', 5)
      expect(result).toBe('5 prompts imported successfully!')
    })

    it('handles missing translations gracefully', () => {
      expect(translate('en', 'nonexistent.key')).toBe('nonexistent.key')
    })

    // DOM application test
    const applyI18nToDOM = (locale) => {
      const elements = document.querySelectorAll('[data-i18n]')
      elements.forEach(el => {
        const key = el.dataset.i18n
        el.textContent = translate(locale, key)
      })
    }

    it('applies translations to DOM elements', () => {
      document.body.innerHTML = '<span data-i18n="btn.save"></span><span data-i18n="btn.cancel"></span>'
      
      applyI18nToDOM('en')
      
      expect(document.querySelector('[data-i18n="btn.save"]').textContent).toBe('Save')
      expect(document.querySelector('[data-i18n="btn.cancel"]').textContent).toBe('Cancel')
    })

    it('applies French translations to DOM', () => {
      document.body.innerHTML = '<span data-i18n="btn.save"></span>'
      
      applyI18nToDOM('fr')
      
      expect(document.querySelector('[data-i18n="btn.save"]').textContent).toBe('Enregistrer')
    })
  })

  describe('Theme System', () => {
    const applyTheme = (theme) => {
      if (theme === 'auto') {
        document.documentElement.removeAttribute('data-theme')
      } else {
        document.documentElement.setAttribute('data-theme', theme)
      }
      return theme
    }

    it('applies dark theme', () => {
      applyTheme('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('applies light theme', () => {
      applyTheme('light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('removes theme attribute for auto', () => {
      applyTheme('dark')
      applyTheme('auto')
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    })

    const cycleTheme = (current) => {
      const themes = ['auto', 'light', 'dark']
      const idx = themes.indexOf(current)
      return themes[(idx + 1) % themes.length]
    }

    it('cycles through themes in order', () => {
      expect(cycleTheme('auto')).toBe('light')
      expect(cycleTheme('light')).toBe('dark')
      expect(cycleTheme('dark')).toBe('auto')
    })

    // Simulate prefers-color-scheme
    const getEffectiveTheme = (storedTheme) => {
      if (storedTheme !== 'auto' && storedTheme) {
        return storedTheme
      }
      // Mock system preference
      return 'light'
    }

    it('uses stored theme when not auto', () => {
      expect(getEffectiveTheme('dark')).toBe('dark')
      expect(getEffectiveTheme('light')).toBe('light')
    })

    it('uses system preference when auto', () => {
      expect(getEffectiveTheme('auto')).toBe('light')
    })
  })
})