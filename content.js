if (!window._aiPromptInjectorLoaded) {
window._aiPromptInjectorLoaded = true;

const AI_PROMPT_INJECTOR_NS = 'ai_prompt_injector';

window.PromptInjector = {
  selectors: [
    '#prompt-textarea',
    'textarea[placeholder*="message"]',
    'textarea[placeholder*="question"]',
    'textarea[placeholder*="prompt"]',
    'textarea[placeholder*="chat"]',
    '[contenteditable="true"]',
    '[role="textbox"]',
    'textarea:not([readonly]):not([disabled])',
    'input[type="text"]:not([readonly]):not([disabled])'
  ],

  domainSelectors: {
    'chatgpt.com': ['#prompt-textarea', '[contenteditable="true"]'],
    'claude.ai': ['[contenteditable="true"]', '[role="textbox"]'],
    'chat.mistral.ai': ['textarea', '[contenteditable="true"]'],
    'gemini.google.com': ['[contenteditable="true"]', '[role="textbox"]'],
    'dust.tt': ['.tiptap.ProseMirror[contenteditable="true"]', '[contenteditable="true"]'],
    'chat.deepseek.com': ['textarea', '[contenteditable="true"]'],
    'chat.qwen.ai': ['textarea', '[contenteditable="true"]'],
    'grok.com': ['textarea', '[contenteditable="true"]'],
    'notebooklm.google.com': ['textarea', '[contenteditable="true"]', '[role="textbox"]'],
    'aistudio.google.com': ['textarea', '[contenteditable="true"]', '[role="textbox"]']
  },

  findTarget() {
    const hostname = window.location.hostname;
    const specificSelectors = this.domainSelectors[hostname] || [];
    const allSelectors = [...specificSelectors, ...this.selectors];

    for (const selector of allSelectors) {
      try {
        const elements = document.querySelectorAll(selector);

        for (const element of elements) {
          if (this.isValidTarget(element)) {
            return element;
          }
        }
      } catch (error) {
      }
    }

    return null;
  },

  isValidTarget(element) {
    if (!element) return false;

    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      return false;
    }

    if (element.disabled || element.readOnly) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    return true;
  },

  async insertText(text) {
    const target = this.findTarget();
    if (!target) {
      throw new Error('No suitable input field found');
    }

    try {
      if (target.isContentEditable || target.contentEditable === 'true') {
        this.insertIntoContentEditable(target, text);
      } else {
        this.insertIntoInput(target, text);
      }
      return true;
    } catch (error) {
    }

    try {
      this.insertViaExecCommand(target, text);
      return true;
    } catch (error) {
    }

    throw new Error('All insertion methods failed');
  },

  insertIntoContentEditable(element, text) {
    element.focus();

    if (element.innerText || element.textContent) {
      element.innerText = text;
    } else {
      element.textContent = text;
    }

    const events = ['input', 'change', 'keyup', 'paste'];
    events.forEach(eventType => {
      element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
    });

    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }));
  },

  insertIntoInput(element, text) {
    element.focus();
    element.value = text;

    const events = ['input', 'change', 'keyup', 'paste'];
    events.forEach(eventType => {
      element.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
    });

    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: text
    }));

    if (element.setSelectionRange) {
      element.setSelectionRange(text.length, text.length);
    }
  },

  insertViaExecCommand(element, text) {
    element.focus();

    if (element.isContentEditable || element.contentEditable === 'true') {
      const selection = window.getSelection();
      selection.selectAllChildren(element);
    } else {
      element.select();
    }

    const result = document.execCommand('insertText', false, text);
    if (!result) {
      throw new Error('execCommand insertText returned false');
    }
  },

  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          return true;
        }
      }
    } catch (error) {
    }
    return false;
  }
};

window.showNotification = function(message, type = 'info', duration = 4000) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : type === 'warning' ? '#F59E0B' : '#3B82F6'};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    max-width: 300px;
    word-wrap: break-word;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, duration);
};

}

if (window._aiPromptPending) {
  const text = window._aiPromptPending;
  const locale = window._aiPromptLocale || 'en';
  delete window._aiPromptPending;
  delete window._aiPromptLocale;

  const _t = {
    en: {
      inserted: 'Prompt inserted successfully!',
      clipboard: 'Insertion failed. Prompt copied to clipboard.',
      failed: 'Insert failed and clipboard unavailable'
    },
    fr: {
      inserted: 'Prompt inséré avec succès !',
      clipboard: 'Échec de l\'insertion. Prompt copié dans le presse-papiers.',
      failed: 'Échec de l\'insertion et presse-papiers indisponible'
    }
  };
  const msg = _t[locale] || _t.en;

  window.PromptInjector.insertText(text).then(() => {
    window.showNotification(msg.inserted, 'success');
  }).catch(async (error) => {
    const ok = await window.PromptInjector.copyToClipboard(text);
    if (ok) {
      window.showNotification(msg.clipboard, 'warning', 6000);
    } else {
      window.showNotification(msg.failed, 'error');
    }
  });
}
