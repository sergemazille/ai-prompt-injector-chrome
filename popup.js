class PromptManager {
  constructor() {
    this.currentEditId = null;
    this.currentFilter = '';
    this.currentSearchFilter = '';
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.loadPrompts();
    await this.loadTags();

    // Auto-focus search input when popup opens
    setTimeout(() => {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  }

  bindEvents() {
    console.log('Binding events...');

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
    };

    for (const [id, handler] of Object.entries(elements)) {
      const element = document.getElementById(id);
      console.log(`Element ${id}:`, element);

      if (!element) {
        console.error(`Element with id '${id}' not found!`);
        continue;
      }

      if (id === 'prompt-form-element') {
        element.addEventListener('submit', handler);
      } else if (id === 'tag-filter') {
        element.addEventListener('change', handler);
      } else if (id === 'search-input') {
        element.addEventListener('input', handler);
      } else {
        element.addEventListener('click', handler);
      }

      console.log(`Event bound for ${id}`);
    }

    console.log('All events bound');

    // Setup drag and drop for import
    this.setupDragAndDrop();

    // Setup paste textarea input listener
    this.setupPasteTextarea();
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
      // Small delay to let the paste content be processed
      setTimeout(() => {
        this.updateImportButtonState();
      }, 10);
    });
  }

  toggleImportMode() {
    console.log('Toggling import mode');
    const dropZone = document.getElementById('drop-zone');
    const promptList = document.getElementById('prompt-list');

    if (dropZone.classList.contains('hidden')) {
      // Show drop zone
      dropZone.classList.remove('hidden');
      promptList.style.display = 'none';
      document.getElementById('import-btn').textContent = 'Cancel';
      // Clear previous paste content
      const textarea = document.getElementById('paste-json');
      textarea.value = '';
      this.updateImportButtonState();
      this.highlightRecommendedMethod();

      // Auto-focus textarea for better user experience
      setTimeout(() => {
        textarea.focus();
      }, 100);
    } else {
      // Hide drop zone  
      dropZone.classList.add('hidden');
      promptList.style.display = '';  // Reset to use CSS default (grid)
      document.getElementById('import-btn').textContent = 'Import';
    }
  }

  highlightRecommendedMethod() {
    const methods = document.querySelectorAll('.import-method');

    // Highlight recommended method
    methods[0]?.classList.add('recommended');
    methods[2]?.classList.remove('recommended');
  }


  async importFromPaste() {
    console.log('Importing from pasted content');
    const textarea = document.getElementById('paste-json');
    const jsonText = textarea.value.trim();

    if (!jsonText) {
      this.showNotification('Please paste JSON content first');
      return;
    }

    // Create a fake event object to reuse existing import logic
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
      title.textContent = 'Edit Prompt';
      this.loadPromptForEdit(promptId);
    } else {
      title.textContent = 'New Prompt';
      titleInput.value = '';
      contentInput.value = '';
      tagsInput.value = '';
    }

    form.classList.remove('hidden');
    titleInput.focus();
  }

  hideForm() {
    document.getElementById('prompt-form').classList.add('hidden');
    this.currentEditId = null;
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
      alert('Title and content are required');
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
      await this.loadPrompts();
      await this.loadTags();
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Error saving prompt. Please try again.');
    }
  }

  async loadPrompts() {
    try {
      const prompts = await promptStorage.getPrompts();
      this.renderPrompts(prompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  }

  async loadTags() {
    try {
      const tags = await promptStorage.getAllTags();
      const select = document.getElementById('tag-filter');
      const currentValue = select.value;

      select.innerHTML = '<option value="">All tags</option>';

      tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        if (tag === currentValue) option.selected = true;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }

  renderPrompts(prompts) {
    const container = document.getElementById('prompt-list');
    const emptyState = document.getElementById('empty-state');

    if (prompts.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    let filteredPrompts = prompts;

    // Apply search filter first (primary filter)
    if (this.currentSearchFilter) {
      filteredPrompts = filteredPrompts.filter(prompt =>
        prompt.label.toLowerCase().includes(this.currentSearchFilter)
      );
    }

    // Apply tag filter second (secondary filter)
    if (this.currentFilter) {
      filteredPrompts = filteredPrompts.filter(prompt =>
        prompt.tags && prompt.tags.includes(this.currentFilter)
      );
    }

    if (filteredPrompts.length === 0) {
      container.innerHTML = '';
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'No prompts match the current filter.';
      container.appendChild(noResults);
      return;
    }

    // Clear container and add prompts safely
    container.innerHTML = '';
    filteredPrompts.forEach(prompt => {
      const element = this.createPromptElementDOM(prompt);
      container.appendChild(element);
    });
  }

  createPromptElementDOM(prompt) {
    // Create main container
    const promptItem = document.createElement('div');
    promptItem.className = 'prompt-item';
    promptItem.dataset.id = prompt.id;

    // Create header
    const header = document.createElement('div');
    header.className = 'prompt-header';

    const title = document.createElement('h3');
    title.className = 'prompt-title';
    title.textContent = prompt.label;

    const star = document.createElement('span');
    star.className = prompt.favorite ? 'favorite-star favorited' : 'favorite-star';
    star.dataset.id = prompt.id;
    star.title = prompt.favorite ? 'Remove from favorites' : 'Add to favorites';
    star.textContent = prompt.favorite ? '★' : '☆';

    header.appendChild(title);
    header.appendChild(star);

    // Create tags container
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'prompt-tags';
    if (prompt.tags && prompt.tags.length > 0) {
      prompt.tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tag';
        tagSpan.dataset.tag = tag;
        tagSpan.textContent = tag;
        tagsContainer.appendChild(tagSpan);
      });
    }

    // Create actions container
    const actions = document.createElement('div');
    actions.className = 'prompt-actions';

    const buttons = [
      { class: 'insert-btn', text: 'Insert' },
      { class: 'copy-btn', text: 'Copy' },
      { class: 'edit-btn', text: 'Edit' },
      { class: 'delete-btn', text: 'Delete' }
    ];

    buttons.forEach(btnConfig => {
      const button = document.createElement('button');
      button.className = btnConfig.class;
      button.dataset.id = prompt.id;
      button.textContent = btnConfig.text;
      actions.appendChild(button);
    });

    // Assemble the prompt item
    promptItem.appendChild(header);
    promptItem.appendChild(tagsContainer);
    promptItem.appendChild(actions);

    return promptItem;
  }

  createPromptElement(prompt) {
    const tagsHtml = prompt.tags && prompt.tags.length > 0
      ? prompt.tags.map(tag => `<span class="tag" data-tag="${tag}">${tag}</span>`).join('')
      : '';

    const starIcon = prompt.favorite ? '★' : '☆';
    const starClass = prompt.favorite ? 'favorite-star favorited' : 'favorite-star';

    return `
      <div class="prompt-item" data-id="${prompt.id}">
        <div class="prompt-header">
          <h3 class="prompt-title">${this.escapeHtml(prompt.label)}</h3>
          <span class="${starClass}" data-id="${prompt.id}" title="${prompt.favorite ? 'Remove from favorites' : 'Add to favorites'}">${starIcon}</span>
        </div>
        <div class="prompt-tags">${tagsHtml}</div>
        <div class="prompt-actions">
          <button class="insert-btn" data-id="${prompt.id}">Insert</button>
          <button class="copy-btn" data-id="${prompt.id}">Copy</button>
          <button class="edit-btn" data-id="${prompt.id}">Edit</button>
          <button class="delete-btn" data-id="${prompt.id}">Delete</button>
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async filterPrompts(tag) {
    this.currentFilter = tag;
    await this.loadPrompts();
  }

  async searchPrompts(searchTerm) {
    this.currentSearchFilter = searchTerm.toLowerCase().trim();
    await this.loadPrompts();
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
      alert('Error exporting prompts. Please try again.');
    }
  }

  async importPrompts() {
    console.log('Import button clicked');

    try {
      // Try modern File System Access API first
      if ('showOpenFilePicker' in window) {
        console.log('Using File System Access API');
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'JSON files',
            accept: {
              'application/json': ['.json']
            }
          }]
        });

        const file = await fileHandle.getFile();
        console.log('File selected via File System Access API:', file);

        // Create a fake event object to maintain compatibility
        const fakeEvent = {
          target: {
            files: [file]
          }
        };

        await this.handleImportFile(fakeEvent);
        return;
      }
    } catch (error) {
      console.log('File System Access API failed or cancelled:', error);
      // Fall through to traditional method
    }

    // Fallback to traditional input file method
    console.log('Falling back to input file method');
    const importFile = document.getElementById('import-file');

    if (!importFile) {
      console.error('Import file element not found!');
      this.showNotification('Error: import-file element not found');
      return;
    }

    // Reset the input value to ensure change event fires even for same file
    importFile.value = '';

    // Add a temporary event listener for this specific import
    const handleFileSelect = async (e) => {
      console.log('Temporary file handler called');
      importFile.removeEventListener('change', handleFileSelect);
      await this.handleImportFile(e);
    };

    importFile.addEventListener('change', handleFileSelect);

    console.log('Triggering file dialog...');
    importFile.click();
  }

  async handleImportFile(e) {
    console.log('handleImportFile called with event:', e);
    console.log('Event target:', e.target);
    console.log('Files:', e.target.files);

    const file = e.target.files[0];
    console.log('Import file selected:', file);

    if (!file) {
      console.log('No file selected');
      return;
    }

    try {
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });

      // Check file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        console.log('File is not JSON format');
        this.showNotification('Please select a JSON file');
        e.target.value = '';
        return;
      }

      console.log('Reading file content...');
      const text = await file.text();
      console.log('File content read, length:', text.length);
      console.log('File content preview:', text.substring(0, 200) + '...');

      console.log('Calling importPrompts...');
      const result = await promptStorage.importPrompts(text);
      console.log('Import result:', result);

      if (result.imported === 0) {
        this.showNotification('No new prompts imported');
        console.log('No prompts were imported');
      } else if (result.imported === result.total) {
        this.showNotification(`${result.imported} prompts imported successfully!`);
        console.log(`Successfully imported all ${result.imported} prompts`);
      } else {
        this.showNotification(`${result.imported}/${result.total} prompts imported`);
        console.log(`Partially imported ${result.imported} out of ${result.total} prompts`);
      }

      console.log('Reloading prompts and tags...');
      await this.loadPrompts();
      await this.loadTags();
      console.log('Import process completed');

      // Close import mode if it's open
      const dropZone = document.getElementById('drop-zone');
      if (dropZone && !dropZone.classList.contains('hidden')) {
        this.toggleImportMode();
      }
    } catch (error) {
      console.error('Error importing prompts:', error);
      console.error('Error stack:', error.stack);
      this.showNotification(`Import error: ${error.message}`);
    }

    e.target.value = '';
  }

  async insertPrompt(promptId) {
    try {
      const prompt = await promptStorage.getPromptById(promptId);
      if (!prompt) {
        console.error('Prompt not found:', promptId);
        return;
      }

      console.log('Inserting prompt:', prompt.label);

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        alert('No active tab found');
        return;
      }

      const tabId = tabs[0].id;
      console.log('Active tab ID:', tabId, 'URL:', tabs[0].url);

      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          action: 'insertPrompt',
          text: prompt.template
        });

        console.log('Message response:', response);

        if (response && response.success) {
          if (response.fallback === 'clipboard') {
            console.log('Insertion fell back to clipboard');
          } else {
            console.log('Prompt inserted successfully');
          }
          window.close();
        } else {
          throw new Error(response?.error || 'Unknown insertion error');
        }
      } catch (error) {
        console.error('Message sending failed:', error);

        await this.copyToClipboard(prompt.template);
        console.log('Could not communicate with page. Content copied to clipboard instead.');
        window.close();
      }
    } catch (error) {
      console.error('Error inserting prompt:', error);
      console.log('Error inserting prompt: ' + error.message);
    }
  }

  showNotification(message) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');

    notificationText.textContent = message;
    notification.classList.remove('hidden');

    setTimeout(() => {
      notification.classList.add('hidden');
    }, 2000);
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Content copied to clipboard');
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  }


  async copyPromptToClipboard(promptId) {
    try {
      const prompt = await promptStorage.getPromptById(promptId);
      if (!prompt) {
        console.error('Prompt not found:', promptId);
        return;
      }

      await this.copyToClipboard(prompt.template);
      this.showNotification('Prompt copied!');
      console.log('Prompt copied to clipboard:', prompt.label);
    } catch (error) {
      console.error('Error copying prompt to clipboard:', error);
      this.showNotification('Error copying prompt');
    }
  }

  async deletePrompt(promptId) {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      await promptStorage.deletePrompt(promptId);
      await this.loadPrompts();
      await this.loadTags();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Error deleting prompt. Please try again.');
    }
  }

  async toggleFavorite(promptId) {
    try {
      // Get prompt info before toggling for better notification
      const prompt = await promptStorage.getPromptById(promptId);
      const wasInitiallyFavorite = prompt.favorite;

      const newFavoriteStatus = await promptStorage.toggleFavorite(promptId);
      console.log('Favorite toggled:', promptId, 'New status:', newFavoriteStatus);

      // Reload prompts to reflect the new sorting order
      await this.loadPrompts();

      // Show a more informative notification
      let message;
      if (newFavoriteStatus) {
        message = '★ Added to favorites (moved to top)';
      } else {
        message = '☆ Removed from favorites (repositioned by date)';
      }
      this.showNotification(message);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      this.showNotification('Error updating favorite status');
    }
  }
}

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
      e.stopPropagation(); // Prevent triggering prompt insertion
      const promptId = e.target.dataset.id;
      await manager.toggleFavorite(promptId);
    } else if (e.target.classList.contains('tag')) {
      const tag = e.target.dataset.tag;
      document.getElementById('tag-filter').value = tag;
      await manager.filterPrompts(tag);
    } else if (e.target.classList.contains('prompt-item') || e.target.closest('.prompt-item')) {
      // Ignore clicks on buttons, tags, and stars - they have their own handlers
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