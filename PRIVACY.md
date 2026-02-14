# Privacy Policy for AI Prompt Injector

*Last updated: February 2026*

## Overview

AI Prompt Injector is committed to protecting your privacy. This browser extension is designed with privacy-first principles: **we do not collect, store, or transmit any personal data to external servers**. All functionality operates locally on your device.

## Data Collection

### What We DO NOT Collect

- ❌ Personal information (name, email, etc.)
- ❌ Browsing history
- ❌ Usage analytics or telemetry
- ❌ IP addresses
- ❌ Device information
- ❌ Cookies or tracking identifiers
- ❌ Any form of user behavior data

### What Is Stored Locally

The extension stores the following data **exclusively on your device** using the browser's local storage API:

- **Prompts**: Your custom prompt templates
- **Labels**: Titles for your prompts
- **Tags**: Organizational tags you create
- **Favorites**: Your favorite prompt selections

This data:
- Never leaves your device
- Is not accessible to the developer or any third party
- Can be exported/imported by you at any time
- Is automatically deleted when you uninstall the extension

## Permissions Explained

The extension requires minimal permissions to function:

### `activeTab` Permission
- **Purpose**: To inject prompts into the current AI chat interface when you click "Insert"
- **Scope**: Only accesses the tab where you explicitly trigger the action
- **Duration**: Access ends immediately after prompt insertion

### `storage` Permission
- **Purpose**: To save your prompts locally on your device
- **Scope**: Uses chrome.storage.local API (device-only storage)
- **Control**: You can clear this data at any time through your browser settings

### `scripting` Permission
- **Purpose**: To execute the content script that inserts prompts into text fields
- **Scope**: Combined with `activeTab`, only executes on the current tab when you click "Insert"
- **Timing**: Only executes when you explicitly trigger a prompt insertion

### Host Permissions
**Note**: The extension does not use host permissions or a predefined list of websites. Thanks to the `activeTab` permission, it can insert prompts on any page you are actively viewing, but only when you explicitly trigger the action.

## Data Security

### Local Storage Security
- All data is stored using the browser's secure storage API
- Data is isolated to your browser profile
- No encryption keys or passwords are stored
- No network requests are made

### No External Communication
- The extension has no backend servers
- No API calls to external services
- No data synchronization across devices
- No automatic updates that could access your data

## User Rights and Control

You have complete control over your data:

### Access Your Data
- View all stored prompts directly in the extension popup
- Export your entire prompt collection as JSON at any time

### Modify Your Data
- Edit prompts, tags, and labels freely
- Organize with favorites and tags
- Import prompts from JSON files

### Delete Your Data
- Delete individual prompts using the delete button
- Clear all data by uninstalling the extension
- Use your browser's extension data clearing tools

## Third-Party Services

This extension does not use any third-party services, including:
- No analytics platforms (Google Analytics, etc.)
- No crash reporting services
- No advertising networks
- No social media integrations
- No CDNs or external resources

## Children's Privacy

This extension does not knowingly collect any information from children under 13 years of age. The extension stores data only locally and does not transmit any information that could identify users of any age.

## Changes to This Policy

If this privacy policy changes:
1. The updated policy will be posted in the extension repository
2. The "Last updated" date will be modified
3. For significant changes, the version number will be incremented

## Open Source Transparency

This extension is open source. You can:
- Review the complete source code at: https://github.com/sergemazille/ai-prompt-injector
- Verify that no data collection occurs
- Contribute to the project or fork it for your own use
- Report issues or concerns via GitHub Issues

## Data Breach Notification

Since no data is collected or transmitted to any servers, there is no risk of data breach from our end. Your data remains exclusively on your device under your control.

## Compliance

This extension is designed to comply with:
- Mozilla's Add-on Policies
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Other applicable privacy regulations

## Contact Information

For privacy-related questions or concerns:

- **GitHub Issues**: https://github.com/sergemazille/ai-prompt-injector/issues
- **Developer**: Serge Mazille
- **Project Repository**: https://github.com/sergemazille/ai-prompt-injector

## Summary

**Your privacy is absolute with AI Prompt Injector:**
- ✅ Zero data collection
- ✅ No tracking whatsoever
- ✅ Everything stays on your device
- ✅ You have full control
- ✅ Open source for transparency

We believe your prompts are your intellectual property and should remain private. This extension is a tool that respects that principle completely.

---

*This privacy policy applies to the AI Prompt Injector browser extension version 1.3.0 and later.*