<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

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

### Testing
```bash
npm test           # Run tests in watch mode
npm run test:run   # Single test run
```

### Debugging
- **Extension popup**: Right-click extension icon > "Inspect" or use extension developer tools
- **Content script**: F12 on target webpage, look for logs
- **Background**: Check extension service worker logs in browser extension management

## Architecture Overview

### Core Components

**Storage Layer (`storage.js`)**
- `PromptStorage` class manages local storage with `chrome.storage.local`
- Handles prompt CRUD operations with automatic data normalization
- Export format: `{version, exported, prompts[]}` with backward compatibility
- Import system supports multiple JSON formats with field mapping
- **Backup system**: Automatic backups (max 3), 1h anti-spam, restore functionality

**Content Injection (`content.js`)**
- `PromptInjector` (global) handles DOM insertion across different AI chat interfaces
- Domain-specific selectors with fallback to generic patterns
- **3-tier insertion**: direct DOM → execCommand('insertText') → clipboard fallback
- Supports: ChatGPT, Claude, Gemini, Mistral, DeepSeek, Grok, Qwen, Dust, NotebookLM, Google AI Studio
- **Load guard**: Prevents duplicate execution
- **Global exposure**: window.PromptInjector, window.showNotification

**Popup Interface (`popup.js` + HTML/CSS)**
- `PromptManager` class orchestrates UI state and user interactions
- **i18n**: English/French with `data-i18n` attribute system
- **Theme toggle**: Auto/Light/Dark with CSS custom properties
- **Tag autocomplete**: Keyboard navigation (arrows, Enter, Tab, Escape)
- Three import methods: File System Access API, drag & drop zone, paste JSON
- Notification system with semantic colors (success/error/warning/info)
- Responsive layout with auto-fill grid

**Internationalization (`i18n.js`)**
- `I18N_TRANSLATIONS` object with en/fr translations
- `I18N_LOCALE` auto-detection from navigator.language
- `t(key, ...params)` translation function with parameter support
- `applyI18nToDOM()` for DOM element translation

**Background Script (`background.js`)**
- Auto-backup on browser startup
- Auto-backup on extension update

### Data Structure

```javascript
// Normalized prompt object
{
  id: "prompt_timestamp_random",     // Auto-generated unique ID
  label: "string",                   // Required: prompt title
  template: "string",                // Required: prompt content
  tags: ["string"],                  // Array of tag strings
  favorite: false,                   // Boolean
  createdAt: 1234567890              // Unix timestamp
}
```

### Injection Strategy

1. **On-demand injection**: Uses `chrome.scripting.executeScript` (no content_scripts in manifest)
2. **Pending injection**: Popup passes data via `window._aiPromptPending`, `window._aiPromptLocale`
3. **3-tier insertion**:
   - Tier 1: Direct DOM (innerText/textContent)
   - Tier 2: execCommand('insertText')
   - Tier 3: Clipboard fallback (with warning notification)

### Permissions

- `activeTab`: Access current tab only when Insert is clicked
- `storage`: Local prompt storage
- `scripting`: On-demand content script injection

**No host_permissions**. Works on any website via activeTab.

## Development Notes

### Critical Considerations
- Content script injected on-demand (not pre-loaded)
- Storage operations use await/async patterns throughout
- Import system is defensive with extensive validation
- Notification system auto-clears (4s default, 6s for warnings)
- No host permissions - uses activeTab for universal compatibility

### Browser Compatibility
- Manifest V3 for Chrome
- File System Access API with fallback to traditional file input
- Clipboard API with document.execCommand fallback

## Key Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (V3, no host_permissions) |
| `i18n.js` | Internationalization system |
| `popup.js` | UI logic, theme, autocomplete |
| `storage.js` | CRUD + backup system |
| `content.js` | DOM injection with 3-tier strategy |
| `background.js` | Auto-backup on startup/update |
