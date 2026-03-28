# Changelog

## 1.5.1

### Fixed
- Editing a prompt title now updates the card immediately (was requiring popup reopen)
- Favorite star now toggles visually with a single prompt (was only working with 2+ prompts)
- Clipboard fallback on non-injectable pages copies actual prompt text (was copying "undefined")
- Clipboard fallback notification now visible (popup stays open instead of closing immediately)
- Escape key in tag autocomplete closes dropdown only, not the entire popup
- Edit form now hides prompt list underneath (cosmetic fix)

### Changed
- Remove premature DOM rebuild optimization in `renderPrompts()` — always rebuild for correctness
- Move prompt retrieval outside try/catch in `insertPrompt()` to fix variable scoping
- Export `PromptManager` class for testability

### Added
- Regression tests for all 5 bug fixes (84 total tests, up from 79)
- `chrome.scripting` mock in test infrastructure

## 1.5.0

### Security
- Content script encapsulated in IIFE — `PromptInjector` and `showNotification` no longer exposed on `window`
- Replace `window._aiPromptPending` data passing with `chrome.runtime.onMessage` / `chrome.tabs.sendMessage`
- Add import limits: 5 MB max file size, 500 prompts max per import
- Build script uses explicit JS file list and safe Python argument passing (no shell interpolation)

### Performance
- In-memory cache in `PromptStorage` with automatic invalidation on writes
- Combined `loadPromptsAndTags()` replaces separate `loadPrompts()` + `loadTags()` (1 storage read instead of 2-3)
- Search debounce (200ms) prevents cascading DOM updates
- DOM visibility toggle for search/filter instead of full rebuild
- CSS theme variables deduplicated (4 blocks → 3)
- Replace `JSON.parse(JSON.stringify())` with `structuredClone` for backup cloning

### Changed
- `background.js` imports from `storage.js` instead of duplicating backup logic
- Theme state stored in `this.currentTheme` property instead of reading emoji from DOM
- Synthetic events reduced from 5 to 2 per insertion (`Event('input')` + `InputEvent`)
- Unit tests rewritten to import and test real production code

### Removed
- Dead test wrappers using `eval()` and `new Function()`
- Unused `getPromptById` call in `toggleFavorite`
- Redundant `[data-theme="light"]` CSS block

## 1.4.1

### Fixed
- Replace remaining `innerHTML` with DOM construction in tag autocomplete and backup list
- Escape regex special characters in tag search to prevent crashes on special inputs

### Changed
- Add Chrome Web Store Developer Program Policies to PRIVACY.md compliance section

## 1.4.0

### Changed
- Convert popup scripts to ES modules (`import`/`export` instead of global `<script>` tags)

## 1.3.1

### Fixed
- Prompt action buttons (Insert, Copy, Edit, Delete) not working due to missing functional classes in button definitions

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
