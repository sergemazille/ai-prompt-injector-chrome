import { t, applyI18nToDOM, I18N_LOCALE } from './i18n.js';
import { promptStorage, extractTags } from './storage.js';

class PromptManager {
  constructor() {
    this.currentEditId = null;
    this.currentFilter = '';
    this.currentSearchFilter = '';
    this.allTags = [];
    this.tagSuggestionIndex = -1;
    this.currentTheme = 'auto';
    this.init();
  }

  async init() {
    await this.initTheme();
    applyI18nToDOM();
    this.bindEvents();
    await this.loadPromptsAndTags();

    setTimeout(() => {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  async initTheme() {
    try {
      const result = await chrome.storage.local.get(['theme']);
      this.currentTheme = result.theme || 'auto';
    } catch (error) {
      this.currentTheme = 'auto';
    }
    this.applyTheme(this.currentTheme);
  }

  applyTheme(theme) {
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    this.updateThemeIcon(theme);
  }

  updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (theme === 'light') btn.textContent = '☀️';
    else if (theme === 'dark') btn.textContent = '🌙';
    else btn.textContent = '🖥️';
  }

  cycleTheme() {
    const themes = ['auto', 'light', 'dark'];
    const idx = themes.indexOf(this.currentTheme);
    this.currentTheme = themes[(idx + 1) % themes.length];

    this.applyTheme(this.currentTheme);
    chrome.storage.local.set({ theme: this.currentTheme });
  }

  bindEvents() {
    const elements = {
      'new-prompt-btn': () => this.showForm(),
      'cancel-btn': () => this.hideForm(),
      'prompt-form-element': (e) => this.handleSubmit(e),
      'tag-filter': (e) => this.filterPrompts(e.target.value),
      'search-input': (e) => this.searchPrompts(e.target.value),
      'export-btn': () => this.exportPrompts(),
      'import-btn': () => this.toggleImportMode(),
      'browse-btn': () => this.importPrompts(),
      'import-from-paste': () => this.importFromPaste(),
      'backups-btn': () => this.toggleBackupPanel(),
      'theme-toggle': () => this.cycleTheme(),
    };

    for (const [id, handler] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (!element) continue;

      if (id === 'prompt-form-element') {
        element.addEventListener('submit', handler);
      } else if (id === 'tag-filter') {
        element.addEventListener('change', handler);
      } else if (id === 'search-input') {
        let debounceTimer;
        element.addEventListener('input', (e) => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => handler(e), 200);
        });
      } else {
        element.addEventListener('click', handler);
      }
    }

    this.setupDragAndDrop();
    this.setupPasteTextarea();
    this.setupTagAutocomplete();
  }

  setupTagAutocomplete() {
    const tagInput = document.getElementById('prompt-tags');
    if (!tagInput) return;

    tagInput.addEventListener('input', () => this.handleTagInput());
    tagInput.addEventListener('keydown', (e) => this.handleTagKeydown(e));
    tagInput.addEventListener('blur', () => {
      setTimeout(() => this.hideTagSuggestions(), 200);
    });
  }

  handleTagInput() {
    const input = document.getElementById('prompt-tags');
    const value = input.value.toLowerCase().trim();
    const lastTag = value.split(',').pop().trim();
    
    if (!lastTag || this.allTags.length === 0) {
      this.hideTagSuggestions();
      return;
    }

    const matches = this.allTags.filter(tag => 
      tag.toLowerCase().includes(lastTag) && 
      !value.split(',').map(t => t.trim().toLowerCase()).includes(tag.toLowerCase())
    );

    if (matches.length === 0) {
      this.hideTagSuggestions();
      return;
    }

    this.showTagSuggestions(matches, lastTag);
  }

  showTagSuggestions(matches, searchTerm) {
    const container = document.getElementById('tag-suggestions');
    container.innerHTML = '';
    container.classList.remove('hidden');
    this.tagSuggestionIndex = -1;

    matches.forEach((tag, idx) => {
      const item = document.createElement('div');
      item.className = 'tag-suggestion-item';
      item.setAttribute('role', 'option');
      item.setAttribute('data-index', idx);
      
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      const parts = tag.split(regex);
      parts.forEach(part => {
        if (regex.test(part)) {
          const span = document.createElement('span');
          span.className = 'tag-match';
          span.textContent = part;
          item.appendChild(span);
        } else if (part) {
          item.appendChild(document.createTextNode(part));
        }
        regex.lastIndex = 0;
      });
      
      item.addEventListener('click', () => this.selectTag(tag));
      container.appendChild(item);
    });
  }

  hideTagSuggestions() {
    const container = document.getElementById('tag-suggestions');
    container.classList.add('hidden');
    container.innerHTML = '';
    this.tagSuggestionIndex = -1;
  }

  handleTagKeydown(e) {
    const container = document.getElementById('tag-suggestions');
    if (container.classList.contains('hidden')) return;

    const items = container.querySelectorAll('.tag-suggestion-item');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.tagSuggestionIndex = Math.min(this.tagSuggestionIndex + 1, items.length - 1);
      this.updateActiveSuggestion(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.tagSuggestionIndex = Math.max(this.tagSuggestionIndex - 1, 0);
      this.updateActiveSuggestion(items);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (this.tagSuggestionIndex >= 0) {
        e.preventDefault();
        const selectedTag = items[this.tagSuggestionIndex].textContent;
        this.selectTag(selectedTag);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.hideTagSuggestions();
    }
  }

  updateActiveSuggestion(items) {
    items.forEach((item, idx) => {
      item.classList.toggle('active', idx === this.tagSuggestionIndex);
    });
  }

  selectTag(tag) {
    const input = document.getElementById('prompt-tags');
    const tags = input.value.split(',').map(t => t.trim()).filter(Boolean);
    tags.pop();
    tags.push(tag);
    input.value = tags.join(', ') + ', ';
    this.hideTagSuggestions();
    input.focus();
  }

  async toggleBackupPanel() {
    const panel = document.getElementById('backup-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      this.loadBackups();
    }
  }

  async loadBackups() {
    try {
      const backups = await promptStorage.getBackups();
      const list = document.getElementById('backup-list');
      
      if (!backups || backups.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.textContent = t('backup.empty');
        list.replaceChildren(emptyDiv);
        return;
      }

      list.replaceChildren();
      backups.forEach(backup => {
        const item = document.createElement('div');
        item.className = 'backup-item';
        
        const date = new Date(backup.timestamp).toLocaleString();
        const reason = t(`backup.reason.${backup.reason}`) || backup.reason;
        
        const info = document.createElement('div');
        info.className = 'backup-item-info';
        const dateSpan = document.createElement('span');
        dateSpan.className = 'backup-item-date';
        dateSpan.textContent = date;
        const reasonSpan = document.createElement('span');
        reasonSpan.className = 'backup-item-reason';
        reasonSpan.textContent = reason;
        const countSpan = document.createElement('span');
        countSpan.className = 'backup-item-count';
        countSpan.textContent = `${backup.promptCount} prompts`;
        info.append(dateSpan, reasonSpan, countSpan);
        const btn = document.createElement('button');
        btn.className = 'btn btn--sm btn--primary';
        btn.dataset.id = backup.id;
        btn.textContent = t('btn.restore');
        item.append(info, btn);
        
        btn.addEventListener('click', () => this.restoreBackup(backup.id));
        list.appendChild(item);
      });
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  }

  async restoreBackup(backupId) {
    if (!confirm(t('confirm.restore'))) return;
    
    try {
      await promptStorage.restoreBackup(backupId);
      await this.loadPromptsAndTags();
      this.showNotification(t('notify.restored', 0), 'success');
      this.toggleBackupPanel();
    } catch (error) {
      console.error('Error restoring backup:', error);
      this.showNotification(t('notify.restoreError'), 'error');
    }
  }

  setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const fakeEvent = {
          target: { files: files }
        };
        this.handleImportFile(fakeEvent);
      }
    });
  }

  setupPasteTextarea() {
    const textarea = document.getElementById('paste-json');
    if (!textarea) return;

    textarea.addEventListener('input', () => {
      this.updateImportButtonState();
    });

    textarea.addEventListener('paste', () => {
      setTimeout(() => {
        this.updateImportButtonState();
      }, 10);
    });
  }

  toggleImportMode() {
    const dropZone = document.getElementById('drop-zone');
    const promptList = document.getElementById('prompt-list');
    const backupPanel = document.getElementById('backup-panel');

    if (dropZone.classList.contains('hidden')) {
      dropZone.classList.remove('hidden');
      promptList.style.display = 'none';
      backupPanel.classList.add('hidden');
      document.getElementById('import-btn').textContent = t('btn.cancel');
      const textarea = document.getElementById('paste-json');
      textarea.value = '';
      this.updateImportButtonState();
      this.highlightRecommendedMethod();
      setTimeout(() => {
        textarea.focus();
      }, 100);
    } else {
      dropZone.classList.add('hidden');
      promptList.style.display = '';
      document.getElementById('import-btn').textContent = t('btn.import');
    }
  }

  highlightRecommendedMethod() {
    const methods = document.querySelectorAll('.import-method');
    methods[0]?.classList.add('recommended');
    methods[2]?.classList.remove('recommended');
  }

  async importFromPaste() {
    const textarea = document.getElementById('paste-json');
    const jsonText = textarea.value.trim();

    if (!jsonText) {
      this.showNotification(t('notify.pasteFirst'));
      return;
    }

    await promptStorage.createBackup('preImport');
    
    const fakeEvent = {
      target: {
        files: [{
          text: () => Promise.resolve(jsonText),
          name: 'pasted-content.json'
        }]
      }
    };

    await this.handleImportFile(fakeEvent);
  }

  updateImportButtonState() {
    const textarea = document.getElementById('paste-json');
    const importBtn = document.getElementById('import-from-paste');

    if (textarea && importBtn) {
      importBtn.disabled = !textarea.value.trim();
    }
  }

  showForm(promptId = null) {
    this.currentEditId = promptId;
    const form = document.getElementById('prompt-form');
    const title = document.getElementById('form-title');
    const titleInput = document.getElementById('prompt-title');
    const contentInput = document.getElementById('prompt-content');
    const tagsInput = document.getElementById('prompt-tags');

    if (promptId) {
      title.textContent = t('form.editPrompt');
      this.loadPromptForEdit(promptId);
    } else {
      title.textContent = t('form.newPrompt');
      titleInput.value = '';
      contentInput.value = '';
      tagsInput.value = '';
    }

    form.classList.remove('hidden');
    document.getElementById('prompt-list').style.display = 'none';
    titleInput.focus();
  }

  hideForm() {
    document.getElementById('prompt-form').classList.add('hidden');
    document.getElementById('prompt-list').style.display = '';
    this.currentEditId = null;
    this.hideTagSuggestions();
  }

  async loadPromptForEdit(promptId) {
    try {
      const prompt = await promptStorage.getPromptById(promptId);
      if (prompt) {
        document.getElementById('prompt-title').value = prompt.label || '';
        document.getElementById('prompt-content').value = prompt.template || '';
        document.getElementById('prompt-tags').value = prompt.tags ? prompt.tags.join(', ') : '';
      }
    } catch (error) {
      console.error('Error loading prompt for edit:', error);
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('prompt-title').value.trim();
    const content = document.getElementById('prompt-content').value.trim();
    const tagsInput = document.getElementById('prompt-tags').value.trim();

    if (!title || !content) {
      alert(t('alert.titleContentRequired'));
      return;
    }

    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    const prompt = {
      id: this.currentEditId,
      label: title,
      template: content,
      tags: tags
    };

    try {
      await promptStorage.savePrompt(prompt);
      this.hideForm();
      await this.loadPromptsAndTags();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert(t('alert.saveError'));
    }
  }

  async loadPromptsAndTags() {
    try {
      const prompts = await promptStorage.getPrompts();
      this.allTags = extractTags(prompts);
      this.renderPrompts(prompts);
      this.renderTagFilter();
    } catch (error) {
      console.error('Error loading:', error);
    }
  }

  renderTagFilter() {
    const select = document.getElementById('tag-filter');
    const currentValue = select.value;

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = t('filter.allTags');
    select.replaceChildren(defaultOption);

    this.allTags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      if (tag === currentValue) option.selected = true;
      select.appendChild(option);
    });
  }

  renderPrompts(prompts) {
    const container = document.getElementById('prompt-list');
    const emptyState = document.getElementById('empty-state');

    if (!prompts || prompts.length === 0) {
      container.replaceChildren();
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    container.replaceChildren();
    prompts.forEach(prompt => {
      const element = this.createPromptElementDOM(prompt);
      container.appendChild(element);
    });

    // Apply filter/search visibility
    let visibleCount = 0;
    const items = container.querySelectorAll('.prompt-item');
    items.forEach(item => {
      const id = item.dataset.id;
      const prompt = prompts.find(p => p.id === id);
      if (!prompt) {
        item.classList.add('hidden');
        return;
      }

      let visible = true;
      if (this.currentSearchFilter) {
        visible = prompt.label.toLowerCase().includes(this.currentSearchFilter);
      }
      if (visible && this.currentFilter) {
        visible = prompt.tags && prompt.tags.includes(this.currentFilter);
      }

      item.classList.toggle('hidden', !visible);
      if (visible) visibleCount++;
    });

    // Show "no results" if all filtered out
    let noResults = container.querySelector('.no-results');
    if (visibleCount === 0) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = t('filter.noResults');
        container.appendChild(noResults);
      }
      noResults.classList.remove('hidden');
    } else if (noResults) {
      noResults.classList.add('hidden');
    }
  }

  createPromptElementDOM(prompt) {
    const promptItem = document.createElement('div');
    promptItem.className = 'prompt-item';
    promptItem.dataset.id = prompt.id;

    const header = document.createElement('div');
    header.className = 'prompt-header';

    const title = document.createElement('h3');
    title.className = 'prompt-title';
    title.textContent = prompt.label;

    const star = document.createElement('span');
    star.className = prompt.favorite ? 'favorite-star favorited' : 'favorite-star';
    star.dataset.id = prompt.id;
    star.setAttribute('role', 'button');
    star.setAttribute('tabindex', '0');
    star.setAttribute('aria-label', prompt.favorite ? t('aria.removeFavorite', prompt.label) : t('aria.addFavorite', prompt.label));
    star.textContent = prompt.favorite ? '★' : '☆';

    header.appendChild(title);
    header.appendChild(star);

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'prompt-tags';
    if (prompt.tags && prompt.tags.length > 0) {
      prompt.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.dataset.tag = tag;
        tagSpan.textContent = tag;
        tagSpan.setAttribute('role', 'button');
        tagsContainer.appendChild(tagSpan);
      });
    }

    const actions = document.createElement('div');
    actions.className = 'prompt-actions';

    const buttons = [
      { class: 'btn btn--success btn--sm insert-btn', text: t('btn.insert'), aria: t('aria.insertPrompt', prompt.label) },
      { class: 'btn btn--primary btn--sm copy-btn', text: t('btn.copy'), aria: t('aria.copyPrompt', prompt.label) },
      { class: 'btn btn--sm edit-btn', text: t('btn.edit'), aria: t('aria.editPrompt', prompt.label) },
      { class: 'btn btn--danger btn--sm delete-btn', text: t('btn.delete'), aria: t('aria.deletePrompt', prompt.label) }
    ];

    buttons.forEach(btnConfig => {
      const button = document.createElement('button');
      button.className = btnConfig.class;
      button.dataset.id = prompt.id;
      button.textContent = btnConfig.text;
      button.setAttribute('aria-label', btnConfig.aria);
      actions.appendChild(button);
    });

    promptItem.appendChild(header);
    promptItem.appendChild(tagsContainer);
    promptItem.appendChild(actions);

    return promptItem;
  }

  async filterPrompts(tag) {
    this.currentFilter = tag;
    await this.loadPromptsAndTags();
  }

  async searchPrompts(searchTerm) {
    this.currentSearchFilter = searchTerm.toLowerCase().trim();
    await this.loadPromptsAndTags();
  }

  async exportPrompts() {
    try {
      const jsonData = await promptStorage.exportPrompts();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting prompts:', error);
      alert(t('alert.exportError'));
    }
  }

  async importPrompts() {
    try {
      if ('showOpenFilePicker' in window) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'JSON files',
            accept: {
              'application/json': ['.json']
            }
          }]
        });

        const file = await fileHandle.getFile();
        const fakeEvent = {
          target: {
            files: [file]
          }
        };

        await this.handleImportFile(fakeEvent);
        return;
      }
    } catch (error) {
    }

    const importFile = document.getElementById('import-file');
    if (!importFile) {
      this.showNotification(t('notify.importElementError'));
      return;
    }

    importFile.value = '';
    const handleFileSelect = async (e) => {
      importFile.removeEventListener('change', handleFileSelect);
      await this.handleImportFile(e);
    };

    importFile.addEventListener('change', handleFileSelect);
    importFile.click();
  }

  async handleImportFile(e) {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    try {
      if (!file.name.toLowerCase().endsWith('.json')) {
        this.showNotification(t('notify.selectJson'));
        e.target.value = '';
        return;
      }

      await promptStorage.createBackup('preImport');
      
      const text = await file.text();
      const result = await promptStorage.importPrompts(text);

      if (result.imported === 0) {
        this.showNotification(t('notify.noNewImported'));
      } else if (result.imported === result.total) {
        this.showNotification(t('notify.importedAll', result.imported), 'success');
      } else {
        this.showNotification(t('notify.importedPartial', result.imported, result.total));
      }

      await this.loadPromptsAndTags();

      const dropZone = document.getElementById('drop-zone');
      if (dropZone && !dropZone.classList.contains('hidden')) {
        this.toggleImportMode();
      }
    } catch (error) {
      console.error('Error importing prompts:', error);
      this.showNotification(t('notify.importError', error.message));
    }

    e.target.value = '';
  }

  async insertPrompt(promptId) {
    const prompt = await promptStorage.getPromptById(promptId);
    if (!prompt) return;

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        alert(t('alert.noActiveTab'));
        return;
      }

      const tabId = tabs[0].id;

      // Inject content script (idempotent - load guard prevents re-init)
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });

      // Send injection command via Chrome message API
      await chrome.tabs.sendMessage(tabId, {
        type: 'inject',
        text: prompt.template,
        locale: I18N_LOCALE
      });

      window.close();
    } catch (error) {
      console.error('Error inserting prompt:', error);
      await this.copyToClipboard(prompt.template);
      this.showNotification(t('notify.cannotInject'), 'warning');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    notification.className = 'notification';
    if (type === 'success') notification.classList.add('notification--success');
    else if (type === 'error') notification.classList.add('notification--error');
    else if (type === 'warning') notification.classList.add('notification--warning');

    notificationText.textContent = message;
    notification.classList.remove('hidden');

    const duration = type === 'warning' ? 6000 : 4000;
    setTimeout(() => {
      notification.classList.add('hidden');
    }, duration);
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  }

  async copyPromptToClipboard(promptId) {
    try {
      const prompt = await promptStorage.getPromptById(promptId);
      if (!prompt) {
        return;
      }

      await this.copyToClipboard(prompt.template);
      this.showNotification(t('notify.copied'), 'success');
    } catch (error) {
      console.error('Error copying prompt to clipboard:', error);
      this.showNotification(t('notify.copyError'), 'error');
    }
  }

  async deletePrompt(promptId) {
    if (!confirm(t('confirm.delete'))) return;

    try {
      await promptStorage.deletePrompt(promptId);
      await this.loadPromptsAndTags();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert(t('alert.deleteError'));
    }
  }

  async toggleFavorite(promptId) {
    try {
      const newFavoriteStatus = await promptStorage.toggleFavorite(promptId);
      await this.loadPromptsAndTags();

      if (newFavoriteStatus) {
        this.showNotification(t('notify.addedFavorite'), 'success');
      } else {
        this.showNotification(t('notify.removedFavorite'), 'success');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      this.showNotification(t('notify.favoriteError'), 'error');
    }
  }
}

export { PromptManager };

document.addEventListener('DOMContentLoaded', () => {
  const manager = new PromptManager();

  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('insert-btn')) {
      const promptId = e.target.dataset.id;
      await manager.insertPrompt(promptId);
    } else if (e.target.classList.contains('copy-btn')) {
      const promptId = e.target.dataset.id;
      await manager.copyPromptToClipboard(promptId);
    } else if (e.target.classList.contains('edit-btn')) {
      const promptId = e.target.dataset.id;
      manager.showForm(promptId);
    } else if (e.target.classList.contains('delete-btn')) {
      const promptId = e.target.dataset.id;
      await manager.deletePrompt(promptId);
    } else if (e.target.classList.contains('favorite-star')) {
      e.stopPropagation();
      const promptId = e.target.dataset.id;
      await manager.toggleFavorite(promptId);
    } else if (e.target.classList.contains('tag')) {
      const tag = e.target.dataset.tag;
      document.getElementById('tag-filter').value = tag;
      await manager.filterPrompts(tag);
    } else if (e.target.classList.contains('prompt-item') || e.target.closest('.prompt-item')) {
      if (e.target.closest('.prompt-actions') ||
        e.target.classList.contains('tag') ||
        e.target.classList.contains('favorite-star')) {
        return;
      }

      const promptItem = e.target.classList.contains('prompt-item')
        ? e.target
        : e.target.closest('.prompt-item');
      const promptId = promptItem.dataset.id;
      await manager.insertPrompt(promptId);
    }
  });
});
