const AI_PROMPT_INJECTOR_NS = 'ai_prompt_injector';

const PromptInjector = {
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

    console.log(`[${AI_PROMPT_INJECTOR_NS}] Searching for input field on ${hostname}`);
    console.log(`[${AI_PROMPT_INJECTOR_NS}] Using selectors:`, allSelectors);

    for (const selector of allSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`[${AI_PROMPT_INJECTOR_NS}] Found ${elements.length} elements for selector: ${selector}`);

        for (const element of elements) {
          if (this.isValidTarget(element)) {
            console.log(`[${AI_PROMPT_INJECTOR_NS}] Valid target found:`, element);
            return element;
          }
        }
      } catch (error) {
        console.warn(`[${AI_PROMPT_INJECTOR_NS}] Error with selector ${selector}:`, error);
      }
    }

    console.warn(`[${AI_PROMPT_INJECTOR_NS}] No suitable input field found`);
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
    console.log(`[${AI_PROMPT_INJECTOR_NS}] Attempting to insert text:`, text.substring(0, 100) + '...');

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

      console.log(`[${AI_PROMPT_INJECTOR_NS}] Text inserted successfully`);
      return true;
    } catch (error) {
      console.error(`[${AI_PROMPT_INJECTOR_NS}] Insertion failed:`, error);
      throw error;
    }
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

  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        console.log(`[${AI_PROMPT_INJECTOR_NS}] Text copied to clipboard`);
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
          console.log(`[${AI_PROMPT_INJECTOR_NS}] Text copied to clipboard (fallback method)`);
          return true;
        }
      }
    } catch (error) {
      console.error(`[${AI_PROMPT_INJECTOR_NS}] Clipboard copy failed:`, error);
    }
    return false;
  }
};

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
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
  }, 4000);
}



if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log(`[${AI_PROMPT_INJECTOR_NS}] Received message:`, message);

    if (message.action === 'insertPrompt') {
      try {
        const success = await PromptInjector.insertText(message.text);
        if (success) {
          showNotification('Prompt inserted successfully!', 'success');
          return { success: true };
        }
      } catch (error) {
        console.error(`[${AI_PROMPT_INJECTOR_NS}] Insert failed, trying clipboard:`, error);

        const clipboardSuccess = await PromptInjector.copyToClipboard(message.text);
        if (clipboardSuccess) {
          showNotification('Could not insert directly. Content copied to clipboard!', 'info');
          return { success: true, fallback: 'clipboard' };
        } else {
          showNotification('Insert failed and clipboard unavailable', 'error');
          return { success: false, error: error.message };
        }
      }
    }

    if (message.action === 'checkTarget') {
      const target = PromptInjector.findTarget();
      return {
        hasTarget: !!target,
        targetInfo: target ? {
          tagName: target.tagName,
          type: target.type || 'N/A',
          isContentEditable: target.isContentEditable,
          placeholder: target.placeholder || 'N/A'
        } : null
      };
    }
  });
}

console.log(`[${AI_PROMPT_INJECTOR_NS}] Content script loaded on ${window.location.hostname}`);