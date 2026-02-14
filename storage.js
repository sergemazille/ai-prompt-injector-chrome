class PromptStorage {
  constructor() {
    this.storageKey = 'prompts';
    this.backupsKey = 'backups';
  }

  generateId() {
    return 'prompt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  extractTimestampFromId(id) {
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
    
    prompts = prompts.map(prompt => ({
      ...prompt,
      favorite: prompt.favorite === true,
      createdAt: prompt.createdAt || this.extractTimestampFromId(prompt.id)
    }));
    
    prompts.sort((a, b) => {
      if (a.favorite !== b.favorite) {
        return a.favorite ? -1 : 1;
      }
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
      favorite: prompt.favorite === true,
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
      const result = await chrome.storage.local.get(this.storageKey);
      let prompts = result[this.storageKey] || [];
      
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
        version: '1.3',
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

  async createBackup(reason) {
    try {
      const result = await chrome.storage.local.get([this.storageKey, this.backupsKey]);
      const prompts = Array.isArray(result[this.storageKey]) ? result[this.storageKey] : [];
      if (prompts.length === 0) return;

      let backups = result[this.backupsKey] || [];

      if (backups.length > 0) {
        const lastTimestamp = backups[0].timestamp;
        if (Date.now() - lastTimestamp < 3600000) return;
      }

      const backup = {
        id: 'backup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        date: new Date().toISOString(),
        reason,
        promptCount: prompts.length,
        prompts: JSON.parse(JSON.stringify(prompts))
      };

      backups.unshift(backup);
      while (backups.length > 3) backups.pop();

      await chrome.storage.local.set({ [this.backupsKey]: backups });
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  async getBackups() {
    try {
      const result = await chrome.storage.local.get(this.backupsKey);
      return result[this.backupsKey] || [];
    } catch (error) {
      console.error('Error getting backups:', error);
      return [];
    }
  }

  async restoreBackup(backupId) {
    try {
      await this.createBackup('preRestore');
      
      const backups = await this.getBackups();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        throw new Error('Backup not found');
      }

      await chrome.storage.local.set({ [this.storageKey]: backup.prompts });
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }
}

const promptStorage = new PromptStorage();
