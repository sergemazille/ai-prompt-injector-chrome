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
})