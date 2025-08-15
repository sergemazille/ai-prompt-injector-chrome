# AI Prompt Injector - Chrome Extension

A minimalist Chrome extension to manage and insert prompts into AI chat interfaces.

![AI Prompt Injector](screenshots/AI%20Prompt%20Injector.jpg)

## Features

- **Prompt Management**: Create, edit, delete and organize your prompts
- **Favorites System**: Mark important prompts as favorites for priority display
- **Real-time Search**: Instantly search through your prompt collection
- **Tags**: Organize your prompts with tags and filter by tag
- **Universal Insertion**: Automatically insert into ChatGPT, Claude, Gemini, Mistral, Grok, Perplexity, DeepSeek and others
- **Import/Export**: Save and share your prompt collection in JSON format
- **Clipboard Fallback**: Automatic copy if DOM insertion fails

## Installation

### Manual Installation (Development)

#### Chrome
1. Clone or download this project
2. Open Chrome and go to `chrome://extensions`
3. Enable "Developer mode" toggle in the top right
4. Click "Load unpacked"
5. Select the project folder
6. The extension appears in the Chrome toolbar

**Important**: After installation, refresh open web pages for the content script to load.

### Usage

1. Click the "AI Prompt Injector" icon in the toolbar
2. Create your first prompts with "New Prompt"
3. Organize with tags (separated by commas)
4. On an AI chat page, click "Insert" to insert the prompt
5. Use the "Debug" button to diagnose insertion issues
6. Use Import/Export to save your collection

### Troubleshooting

If insertion doesn't work:

1. **Refresh the page**: The content script must be loaded
2. **Use the "Debug" button**: Check if an input field is detected
3. **Check permissions**: The extension requires authorization on all sites
4. **Check the console**: Open developer tools (F12) to see errors

## File Structure

```
├── manifest.json          # Extension configuration
├── popup.html             # User interface
├── popup.css              # Styles
├── popup.js               # Interface logic
├── storage.js             # Storage management
├── content.js             # Page injection script

├── background.js          # Background script
├── icons/                 # Extension icons
│   ├── icon16.png         # 16x16 icon
│   ├── icon48.png         # 48x48 icon
│   └── icon128.png        # 128x128 icon
├── CLAUDE.md              # Development instructions
└── README.md              # Documentation
```

## Data Format

Prompts are stored in JSON format:

```json
{
  "id": "prompt_123456789_abc",
  "label": "Prompt title",
  "template": "Prompt content",
  "tags": ["tag1", "tag2"]
}
```

## Compatibility

- Chrome MV3
- Supported sites by default:
  - ChatGPT (chat.openai.com)
  - Claude (claude.ai)
  - Gemini (gemini.google.com)
  - Mistral (chat.mistral.ai)
  - Grok (grok.x.ai)
  - Perplexity (www.perplexity.ai)
  - DeepSeek (chat.deepseek.com)
  - Poe (poe.com)
  - LMSYS Chat (chat.lmsys.org)
  - And all other sites with textarea or contenteditable

## Permissions

- `activeTab`: Access to active tab for insertion
- `storage`: Local storage of prompts
- `scripting`: Script injection for DOM insertion

See our [Privacy Policy](PRIVACY.md) for detailed information about data handling and permissions.

## Development

The extension uses the standard Chrome Extensions API (Manifest V3). No external dependencies required.

To modify DOM selectors by site, edit the `domainSelectors` object in `content.js`.