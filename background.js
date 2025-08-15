chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Prompt Injector extension installed');
});

chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});