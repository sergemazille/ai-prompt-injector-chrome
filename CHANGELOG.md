# Changelog

## 1.3.0

### Added
- Internationalization (i18n): English and French support with `data-i18n` attribute system
- Theme toggle: cycle between auto/light/dark modes (persisted in storage)
- Dark mode support via `prefers-color-scheme` media query
- CSS design tokens (custom properties) for colors, shadows, radii, and transitions
- Tag autocomplete in prompt form with keyboard navigation (Arrow keys, Enter, Tab, Escape)
- Accessibility: `aria-label` on interactive elements, `aria-live` on notifications, `role` and `tabindex` on stars and tags, keyboard support (Enter/Space) for non-button interactive elements
- Typed notifications (`success`, `error`, `warning`, `info`) with matching colors and durations
- BEM-style button system (`.btn`, `.btn--primary`, `.btn--success`, `.btn--danger`)

### Changed
- Popup UI restyled: gradient title, colored top-border on prompt cards, slide-in notifications (top-right), improved tag pills
- Responsive prompt grid (`auto-fill` instead of fixed 3 columns)
- Replaced all hardcoded colors with CSS custom properties

### Removed
- Dead code: `createPromptElement()` (innerHTML-based) and `escapeHtml()` helper
- Dead code: selector storage methods (`getSelectors`, `saveSelectors`, `getDefaultSelectors`)
- All debug `console.log` statements from production code
- Unused `browser-polyfill.js` script reference
- `host_permissions` from manifest (replaced by `activeTab`)
- `content_scripts` block from manifest (on-demand injection)

### Fixed
- Replaced `innerHTML` with dynamic values by DOM API

## 1.2.0

### Changed
- Switch to on-demand injection via `scripting.executeScript` — works on any website, no more hardcoded site list
- 3-tier insertion strategy: direct DOM, then `execCommand('insertText')`, then clipboard as last resort
- Clipboard is no longer silently overwritten — clear warning notification when used as fallback

### Added
- Automatic backup system (on browser startup, extension update, and before each import)
- Backup restore UI in popup (Backups button)

### Removed
- `content_scripts` block from manifest (no longer needed)
- `host_permissions` site list (replaced by `activeTab`)
- Message-based communication (`chrome.tabs.sendMessage` / `chrome.runtime.onMessage`)
