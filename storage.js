class PromptStorage {
  constructor() {
    this.storageKey = 'prompts';
    this.selectorsKey = 'selectors';
  }

  generateId() {
    return 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  extractTimestampFromId(id) {
    // Extract timestamp from ID format: "prompt_TIMESTAMP_random"
    const match = id && id.match && id.match(/^prompt_(\d+)_/);
    return match ? parseInt(match[1]) : Date.now();
  }

  async getPrompts() {
  try {
    const result = await chrome.storage.local.get(this.storageKey);
    const raw = result[this.storageKey];
    let prompts = [];
    
    if (Array.isArray(raw)) {
      prompts = raw;
    } else if (raw && typeof raw === 'object' && Array.isArray(raw.prompts)) {
      prompts = raw.prompts;
      await chrome.storage.local.set({ [this.storageKey]: prompts });
    } else if (raw !== undefined) {
      await chrome.storage.local.set({ [this.storageKey]: [] });
      return [];
    }
    
    // Ensure all prompts have favorite and createdAt properties (backward compatibility)
    prompts = prompts.map(prompt => ({
      ...prompt,
      favorite: prompt.favorite === true, // Ensure it's a boolean, default to false
      createdAt: prompt.createdAt || this.extractTimestampFromId(prompt.id) // Extract from ID if missing
    }));
    
    // Sort by favorites first, then by creation date (newest first)
    prompts.sort((a, b) => {
      // Primary sort: favorites first
      if (a.favorite !== b.favorite) {
        return a.favorite ? -1 : 1;
      }
      // Secondary sort: newest first within same favorite status
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    
    return prompts;
  } catch (error) {
    console.error('Error getting prompts:', error);
    return [];
  }
}

  async savePrompt(prompt) {
  try {
    let prompts = await this.getPrompts();
    if (!Array.isArray(prompts)) {
      prompts = Array.isArray(prompts?.prompts) ? prompts.prompts : [];
    }
    const label = (prompt.label || '').trim();
    const template = (prompt.template || '').trim();
    let tags = prompt.tags;
    if (!Array.isArray(tags)) {
      if (typeof tags === 'string') {
        tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      } else {
        tags = [];
      }
    }
    const currentTime = Date.now();
    const normalized = {
      id: prompt.id || this.generateId(),
      label,
      template,
      tags,
      favorite: prompt.favorite === true, // Ensure it's a boolean, default to false
      createdAt: prompt.createdAt || (prompt.id ? this.extractTimestampFromId(prompt.id) : currentTime)
    };
    if (!prompt.id) {
      prompts.push(normalized);
    } else {
      const idx = prompts.findIndex(p => p.id === prompt.id);
      if (idx !== -1) prompts[idx] = normalized;
      else prompts.push(normalized);
    }
    await chrome.storage.local.set({ [this.storageKey]: prompts });
    return normalized;
  } catch (error) {
    console.error('Error saving prompt:', error);
    throw error;
  }
}

  async deletePrompt(promptId) {
    try {
      const prompts = await this.getPrompts();
      const filteredPrompts = prompts.filter(p => p.id !== promptId);
      await chrome.storage.local.set({ [this.storageKey]: filteredPrompts });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      throw error;
    }
  }

  async getPromptById(promptId) {
    try {
      const prompts = await this.getPrompts();
      return prompts.find(p => p.id === promptId) || null;
    } catch (error) {
      console.error('Error getting prompt by ID:', error);
      return null;
    }
  }

  async toggleFavorite(promptId) {
    try {
      // Get raw data (unsorted) to avoid affecting storage order
      const result = await chrome.storage.local.get(this.storageKey);
      let prompts = result[this.storageKey] || [];
      
      // Ensure it's an array (backward compatibility)
      if (!Array.isArray(prompts)) {
        if (prompts && typeof prompts === 'object' && Array.isArray(prompts.prompts)) {
          prompts = prompts.prompts;
        } else {
          prompts = [];
        }
      }
      
      const promptIndex = prompts.findIndex(p => p.id === promptId);
      
      if (promptIndex === -1) {
        throw new Error('Prompt not found');
      }
      
      const oldStatus = prompts[promptIndex].favorite === true;
      prompts[promptIndex].favorite = !oldStatus;
      const newStatus = prompts[promptIndex].favorite;
      
      // Ensure createdAt exists for consistency
      if (!prompts[promptIndex].createdAt) {
        prompts[promptIndex].createdAt = this.extractTimestampFromId(prompts[promptIndex].id);
      }
      
      await chrome.storage.local.set({ [this.storageKey]: prompts });
      
      return newStatus;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }

  async getAllTags() {
    try {
      const prompts = await this.getPrompts();
      const tags = new Set();
      
      prompts.forEach(prompt => {
        if (prompt.tags && Array.isArray(prompt.tags)) {
          prompt.tags.forEach(tag => tags.add(tag.trim()));
        }
      });
      
      return Array.from(tags).sort();
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  async exportPrompts() {
    try {
      const prompts = await this.getPrompts();
      const data = {
        version: '1.1',
        exported: new Date().toISOString(),
        prompts: prompts
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting prompts:', error);
      throw error;
    }
  }

  async importPrompts(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    let promptsArray = null;
    if (data && Array.isArray(data.prompts)) promptsArray = data.prompts;
    else if (Array.isArray(data)) promptsArray = data;
    else if (data && typeof data === 'object' && Array.isArray(data.data)) promptsArray = data.data;
    else throw new Error('Invalid file format: expected {"prompts":[...]} or an array');

    const existingPrompts = await this.getPrompts();
    const existingTitles = new Set(existingPrompts.map(p => (p.label || '').toLowerCase().trim()));
    let imported = 0;

    const pick = (obj, keys) => {
      for (const k of keys) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) return obj[k];
      }
      return undefined;
    };
    const toTagsArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(t => String(t).trim()).filter(Boolean);
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };

    for (const raw of promptsArray) {
      const label = pick(raw, ['label','title','name']);
      const template = pick(raw, ['template','content','text','prompt']);
      const tags = toTagsArray(pick(raw, ['tags','labels','categories']));

      const cleanLabel = (label || '').trim();
      const cleanTemplate = (template || '').trim();
      if (!cleanLabel || !cleanTemplate) continue;

      const key = cleanLabel.toLowerCase();
      if (existingTitles.has(key)) continue;

      const favoriteValue = pick(raw, ['favorite', 'starred', 'pinned']);
      const timestampValue = pick(raw, ['createdAt', 'created_at', 'timestamp', 'date', 'created', 'dateCreated']);
      
      // Parse timestamp if it exists, otherwise use current time
      let createdAt = Date.now();
      if (timestampValue) {
        if (typeof timestampValue === 'number') {
          createdAt = timestampValue;
        } else if (typeof timestampValue === 'string') {
          const parsed = new Date(timestampValue).getTime();
          if (!isNaN(parsed)) createdAt = parsed;
        }
      }
      
      existingPrompts.push({
        id: this.generateId(),
        label: cleanLabel,
        template: cleanTemplate,
        tags,
        favorite: favoriteValue === true || favoriteValue === 'true' || favoriteValue === 1,
        createdAt: createdAt
      });
      existingTitles.add(key);
      imported++;
    }

    await chrome.storage.local.set({ [this.storageKey]: existingPrompts });
    return { imported, total: promptsArray.length };
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('Invalid JSON file');
    throw error;
  }
}

  async getSelectors() {
    try {
      const result = await chrome.storage.local.get(this.selectorsKey);
      return result[this.selectorsKey] || this.getDefaultSelectors();
    } catch (error) {
      console.error('Error getting selectors:', error);
      return this.getDefaultSelectors();
    }
  }

  getDefaultSelectors() {
    return {
      'chat.openai.com': '#prompt-textarea',
      'gemini.google.com': '[contenteditable="true"]',
      'claude.ai': '[contenteditable="true"]',
      'chat.mistral.ai': 'textarea',
      'grok.x.ai': 'textarea',
      'www.perplexity.ai': 'textarea',
      'chat.deepseek.com': 'textarea'
    };
  }

  async saveSelectors(selectors) {
    try {
      await chrome.storage.local.set({ [this.selectorsKey]: selectors });
    } catch (error) {
      console.error('Error saving selectors:', error);
      throw error;
    }
  }
}

const promptStorage = new PromptStorage();