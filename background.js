// background.js
import { promptStorage } from './storage.js';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    promptStorage.createBackup('update');
  }
});

chrome.runtime.onStartup.addListener(() => {
  promptStorage.createBackup('startup');
});
