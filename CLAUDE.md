# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Extension Development Commands

### Installation & Testing
```bash
# Manual installation for development:
# 1. Chrome: Go to chrome://extensions > Enable "Developer mode" > "Load unpacked" > select project folder

# After any code changes, reload extension in browser extension management page
# After content.js changes, refresh any open web pages for content script to update
```

### Debugging
- **Extension popup**: Right-click extension icon > "Inspect" or use extension developer tools
- **Content script**: F12 on target webpage, look for `[ai_prompt_injector]` logs
- **Background**: Check extension service worker logs in browser extension management

## Architecture Overview

### Core Components

**Storage Layer (`storage.js`)**
- `PromptStorage` class manages local storage with `chrome.storage.local`
- Handles prompt CRUD operations with automatic data normalization
- Export format: `{version, exported, prompts[]}` with backward compatibility
- Import system supports multiple JSON formats with field mapping (`label`/`title`/`name`, `template`/`content`/`text`)
- Duplicate detection based on normalized labels (case-insensitive)

**Content Injection (`content.js`)**
- `PromptInjector` handles DOM insertion across different AI chat interfaces
- Domain-specific selectors with fallback to generic patterns
- Insertion strategy: contentEditable vs input fields with proper event dispatching
- Automatic clipboard fallback when DOM injection fails
- Supports: ChatGPT, Claude, Gemini, Mistral, Grok, Perplexity, DeepSeek, and others

**Popup Interface (`popup.js` + HTML/CSS)**
- `PromptManager` class orchestrates UI state and user interactions  
- Three import methods: File System Access API, drag & drop zone, traditional file input
- Real-time notification system with temporary overlays
- Tag-based filtering with dynamic tag collection
- Responsive layout optimized for extension popup constraints

**Message Passing**
- Extension popup ↔ content script communication via `chrome.tabs.sendMessage`
- Actions: `insertPrompt`, `checkTarget` for debugging
- Native Chrome extension APIs

### Data Structure

```javascript
// Normalized prompt object
{
  id: "prompt_timestamp_random",     // Auto-generated unique ID
  label: "string",                   // Required: prompt title
  template: "string",                // Required: prompt content  
  tags: ["string"]                   // Array of tag strings
}
```

### DOM Injection Strategy

1. **Domain-specific selectors**: Optimized patterns for known AI sites
2. **Generic fallback**: textarea, contenteditable, role=textbox patterns
3. **Visibility validation**: Checks element dimensions, disabled state, computed styles
4. **Event simulation**: Dispatches input/change/keyup events for framework compatibility
5. **Clipboard fallback**: Automatic copy-to-clipboard when injection fails

## Development Notes

### Critical Considerations
- Content script modifications require page refreshes on target websites
- Storage operations use await/async patterns throughout
- Import system is defensive with extensive validation and error handling
- Notification system automatically clears after 2 seconds
- Extension permissions require `<all_urls>` for universal injection

### Selector Maintenance
When AI chat interfaces change their DOM structure, update:
- `content.js` domainSelectors mapping for site-specific patterns
- Generic selectors array for broader compatibility
- Test with Debug button in extension popup

### Import Format Flexibility
The import system accepts various JSON structures:
- Standard: `{prompts: [{label, template, tags}]}`  
- Legacy: `[{title, content, labels}]`
- Custom field mappings supported via `pick()` helper function

### Browser Compatibility
- Manifest V3 for Chrome

- File System Access API with fallback to traditional file input
- Clipboard API with document.execCommand fallback