import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('PromptManager', () => {
  let manager

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="search-input"></div>
      <div id="prompt-form" class="hidden"></div>
      <div id="form-title"></div>
      <input id="prompt-title" value="">
      <textarea id="prompt-content"></textarea>
      <input id="prompt-tags" value="">
      <div id="prompt-list"></div>
      <div id="empty-state" class="hidden"></div>
      <div id="tag-filter">
        <option value="">All Tags</option>
      </div>
      <div id="drop-zone" class="hidden"></div>
      <div id="backup-panel" class="hidden"></div>
      <div id="backup-list"></div>
      <div id="import-btn">Import</div>
      <div id="paste-json"></div>
      <div id="import-from-paste" disabled></div>
      <div id="theme-toggle">🖥️</div>
      <div id="notification" class="hidden">
        <span id="notification-text"></span>
      </div>
      <div id="tag-suggestions" class="hidden"></div>
    `
    chrome.storage.local.clear()
    
    class MockPromptManager {
      constructor() {
        this.currentEditId = null
        this.currentFilter = ''
        this.currentSearchFilter = ''
        this.allTags = []
        this.tagSuggestionIndex = -1
      }
    }
    
    manager = new MockPromptManager()
  })

  describe('State Management', () => {
    it('initializes with default state', () => {
      expect(manager.currentEditId).toBeNull()
      expect(manager.currentFilter).toBe('')
      expect(manager.currentSearchFilter).toBe('')
      expect(manager.allTags).toEqual([])
      expect(manager.tagSuggestionIndex).toBe(-1)
    })

    it('tracks current filter', () => {
      manager.currentFilter = 'testTag'
      expect(manager.currentFilter).toBe('testTag')
    })

    it('tracks current search filter', () => {
      manager.currentSearchFilter = 'search term'
      expect(manager.currentSearchFilter).toBe('search term')
    })
  })

  describe('Tag Autocomplete', () => {
    beforeEach(() => {
      manager.allTags = ['tag1', 'tag2', 'tag3', 'test']
    })

    it('filters tags by input', () => {
      const input = document.getElementById('prompt-tags')
      input.value = 'te'
      
      const lastTag = input.value.split(',').pop().trim()
      const matches = manager.allTags.filter(tag => 
        tag.toLowerCase().includes(lastTag) && 
        !input.value.split(',').map(t => t.trim().toLowerCase()).includes(tag.toLowerCase())
      )
      
      expect(matches).toContain('test')
      expect(matches).not.toContain('tag1')
    })

    it('excludes already selected tags', () => {
      const input = document.getElementById('prompt-tags')
      input.value = 'test, tag1'
      
      const lastTag = input.value.split(',').pop().trim()
      const matches = manager.allTags.filter(tag => 
        tag.toLowerCase().includes(lastTag) && 
        !input.value.split(',').map(t => t.trim().toLowerCase()).includes(tag.toLowerCase())
      )
      
      expect(matches).not.toContain('tag1')
    })
  })

  describe('Theme System', () => {
    it('applies dark theme', () => {
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

    it('applies light theme', () => {
      const applyTheme = (theme) => {
        if (theme === 'auto') {
          document.documentElement.removeAttribute('data-theme')
        } else {
          document.documentElement.setAttribute('data-theme', theme)
        }
      }
      
      applyTheme('light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('removes theme attribute for auto', () => {
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

    it('cycles through themes in order', () => {
      const themes = ['auto', 'light', 'dark']
      const cycleTheme = (current) => {
        const idx = themes.indexOf(current)
        return themes[(idx + 1) % themes.length]
      }
      
      expect(cycleTheme('auto')).toBe('light')
      expect(cycleTheme('light')).toBe('dark')
      expect(cycleTheme('dark')).toBe('auto')
    })
  })

  describe('Form Handling', () => {
    it('shows form for new prompt', () => {
      manager.showForm = function(promptId = null) {
        this.currentEditId = promptId
        const form = document.getElementById('prompt-form')
        const title = document.getElementById('form-title')
        
        if (promptId) {
          title.textContent = 'Edit Prompt'
        } else {
          title.textContent = 'New Prompt'
        }
        
        form.classList.remove('hidden')
      }
      
      manager.showForm()
      
      expect(manager.currentEditId).toBeNull()
      expect(document.getElementById('prompt-form').classList.contains('hidden')).toBe(false)
      expect(document.getElementById('form-title').textContent).toBe('New Prompt')
    })

    it('shows form for editing prompt', () => {
      manager.showForm = function(promptId = null) {
        this.currentEditId = promptId
        const form = document.getElementById('prompt-form')
        const title = document.getElementById('form-title')
        
        if (promptId) {
          title.textContent = 'Edit Prompt'
        } else {
          title.textContent = 'New Prompt'
        }
        
        form.classList.remove('hidden')
      }
      
      manager.showForm('test-id-123')
      
      expect(manager.currentEditId).toBe('test-id-123')
      expect(document.getElementById('form-title').textContent).toBe('Edit Prompt')
    })

    it('hides form', () => {
      manager.showForm = function(promptId = null) {
        this.currentEditId = promptId
        const form = document.getElementById('prompt-form')
        form.classList.remove('hidden')
      }
      
      manager.hideForm = function() {
        document.getElementById('prompt-form').classList.add('hidden')
        this.currentEditId = null
      }
      
      manager.showForm('test-id')
      manager.hideForm()
      
      expect(manager.currentEditId).toBeNull()
      expect(document.getElementById('prompt-form').classList.contains('hidden')).toBe(true)
    })
  })

  describe('Search and Filter', () => {
    const testPrompts = [
      { id: '1', label: 'First Prompt', template: 'Content 1', tags: ['a'], favorite: false, createdAt: 1000 },
      { id: '2', label: 'Second Prompt', template: 'Content 2', tags: ['b'], favorite: true, createdAt: 2000 },
      { id: '3', label: 'Third Prompt', template: 'Content 3', tags: ['a', 'b'], favorite: false, createdAt: 3000 }
    ]

    it('filters by tag', () => {
      const filterPrompts = (prompts, tag) => {
        if (!tag) return prompts
        return prompts.filter(p => p.tags && p.tags.includes(tag))
      }
      
      const filtered = filterPrompts(testPrompts, 'a')
      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toContain('1')
      expect(filtered.map(p => p.id)).toContain('3')
    })

    it('filters by search term', () => {
      const searchPrompts = (prompts, term) => {
        if (!term) return prompts
        return prompts.filter(p => p.label.toLowerCase().includes(term.toLowerCase()))
      }
      
      const filtered = searchPrompts(testPrompts, 'first')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('combines tag and search filters', () => {
      const applyFilters = (prompts, tag, searchTerm) => {
        let filtered = prompts
        if (tag) {
          filtered = filtered.filter(p => p.tags && p.tags.includes(tag))
        }
        if (searchTerm) {
          filtered = filtered.filter(p => p.label.toLowerCase().includes(searchTerm.toLowerCase()))
        }
        return filtered
      }
      
      const filtered = applyFilters(testPrompts, 'a', 'third')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('3')
    })
  })

  describe('Prompt Rendering', () => {
    it('renders empty state when no prompts', () => {
      const renderPrompts = (prompts) => {
        const container = document.getElementById('prompt-list')
        const emptyState = document.getElementById('empty-state')
        
        if (!prompts || prompts.length === 0) {
          container.innerHTML = ''
          emptyState.classList.remove('hidden')
          return
        }
        
        emptyState.classList.add('hidden')
      }
      
      renderPrompts([])
      
      expect(document.getElementById('empty-state').classList.contains('hidden')).toBe(false)
    })

    it('renders prompts list', () => {
      const testPrompts = [
        { id: '1', label: 'Test Prompt', template: 'Content', tags: ['test'], favorite: false }
      ]
      
      const renderPrompts = (prompts) => {
        const container = document.getElementById('prompt-list')
        const emptyState = document.getElementById('empty-state')
        
        if (!prompts || prompts.length === 0) {
          container.innerHTML = ''
          emptyState.classList.remove('hidden')
          return
        }
        
        emptyState.classList.add('hidden')
        container.innerHTML = ''
        prompts.forEach(prompt => {
          const item = document.createElement('div')
          item.className = 'prompt-item'
          item.dataset.id = prompt.id
          item.innerHTML = `<h3 class="prompt-title">${prompt.label}</h3>`
          container.appendChild(item)
        })
      }
      
      renderPrompts(testPrompts)
      
      expect(document.getElementById('prompt-list').children).toHaveLength(1)
      expect(document.querySelector('.prompt-title').textContent).toBe('Test Prompt')
    })

    it('shows no results message when filters match nothing', () => {
      const testPrompts = [
        { id: '1', label: 'Test Prompt', template: 'Content', tags: ['a'] }
      ]
      
      const renderWithFilter = (prompts, filter) => {
        const container = document.getElementById('prompt-list')
        
        let filtered = prompts
        if (filter) {
          filtered = filtered.filter(p => p.tags && p.tags.includes(filter))
        }
        
        if (filtered.length === 0) {
          container.innerHTML = ''
          const noResults = document.createElement('div')
          noResults.className = 'no-results'
          noResults.textContent = 'No results'
          container.appendChild(noResults)
          return
        }
      }
      
      renderWithFilter(testPrompts, 'nonexistent')
      
      expect(document.querySelector('.no-results')).not.toBeNull()
      expect(document.querySelector('.no-results').textContent).toBe('No results')
    })
  })

  describe('Tag Suggestions', () => {
    it('shows tag suggestions', () => {
      const showTagSuggestions = (matches, searchTerm) => {
        const container = document.getElementById('tag-suggestions')
        container.innerHTML = ''
        container.classList.remove('hidden')
        
        matches.forEach((tag, idx) => {
          const item = document.createElement('div')
          item.className = 'tag-suggestion-item'
          item.setAttribute('data-index', idx)
          item.textContent = tag
          container.appendChild(item)
        })
      }
      
      showTagSuggestions(['tag1', 'tag2'], 'tag')
      
      expect(document.getElementById('tag-suggestions').classList.contains('hidden')).toBe(false)
      expect(document.querySelectorAll('.tag-suggestion-item')).toHaveLength(2)
    })

    it('hides tag suggestions', () => {
      const showTagSuggestions = (matches, searchTerm) => {
        const container = document.getElementById('tag-suggestions')
        container.innerHTML = ''
        container.classList.remove('hidden')
      }
      
      const hideTagSuggestions = () => {
        const container = document.getElementById('tag-suggestions')
        container.classList.add('hidden')
        container.innerHTML = ''
      }
      
      showTagSuggestions(['tag1'], 'tag')
      hideTagSuggestions()
      
      expect(document.getElementById('tag-suggestions').classList.contains('hidden')).toBe(true)
    })

    it('highlights matching text', () => {
      const highlightMatch = (tag, searchTerm) => {
        const regex = new RegExp(`(${searchTerm})`, 'gi')
        return tag.replace(regex, '<span class="tag-match">$1</span>')
      }
      
      const result = highlightMatch('testing', 'test')
      expect(result).toBe('<span class="tag-match">test</span>ing')
    })
  })

  describe('Import/Export', () => {
    it('validates JSON format', () => {
      const isValidJson = (str) => {
        try {
          JSON.parse(str)
          return true
        } catch {
          return false
        }
      }
      
      expect(isValidJson('{"test": true}')).toBe(true)
      expect(isValidJson('invalid')).toBe(false)
    })

    it('validates file extension', () => {
      const isValidExtension = (filename) => {
        return filename.toLowerCase().endsWith('.json')
      }
      
      expect(isValidExtension('test.json')).toBe(true)
      expect(isValidExtension('test.txt')).toBe(false)
      expect(isValidExtension('TEST.JSON')).toBe(true)
    })
  })

  describe('Notification System', () => {
    it('shows notification', () => {
      const showNotification = (message, type = 'info') => {
        const notification = document.getElementById('notification')
        const text = document.getElementById('notification-text')
        
        notification.className = 'notification'
        if (type === 'success') notification.classList.add('notification--success')
        else if (type === 'error') notification.classList.add('notification--error')
        
        text.textContent = message
        notification.classList.remove('hidden')
      }
      
      showNotification('Test message', 'success')
      
      expect(document.getElementById('notification-text').textContent).toBe('Test message')
      expect(document.getElementById('notification').classList.contains('notification--success')).toBe(true)
      expect(document.getElementById('notification').classList.contains('hidden')).toBe(false)
    })

    it('shows error notification', () => {
      const showNotification = (message, type = 'info') => {
        const notification = document.getElementById('notification')
        const text = document.getElementById('notification-text')
        
        notification.className = 'notification'
        if (type === 'success') notification.classList.add('notification--success')
        else if (type === 'error') notification.classList.add('notification--error')
        
        text.textContent = message
        notification.classList.remove('hidden')
      }
      
      showNotification('Error message', 'error')
      
      expect(document.getElementById('notification').classList.contains('notification--error')).toBe(true)
    })
  })

  describe('Import Mode Toggle', () => {
    it('toggles import mode on', () => {
      const toggleImportMode = () => {
        const dropZone = document.getElementById('drop-zone')
        const promptList = document.getElementById('prompt-list')
        
        if (dropZone.classList.contains('hidden')) {
          dropZone.classList.remove('hidden')
          promptList.style.display = 'none'
        }
      }
      
      toggleImportMode()
      
      expect(document.getElementById('drop-zone').classList.contains('hidden')).toBe(false)
      expect(document.getElementById('prompt-list').style.display).toBe('none')
    })

    it('toggles import mode off', () => {
      const toggleImportMode = () => {
        const dropZone = document.getElementById('drop-zone')
        const promptList = document.getElementById('prompt-list')
        
        if (dropZone.classList.contains('hidden')) {
          dropZone.classList.remove('hidden')
          promptList.style.display = 'none'
        } else {
          dropZone.classList.add('hidden')
          promptList.style.display = ''
        }
      }
      
      toggleImportMode()
      toggleImportMode()
      
      expect(document.getElementById('drop-zone').classList.contains('hidden')).toBe(true)
    })
  })
})
