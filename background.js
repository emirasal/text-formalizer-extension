// background.js
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "formalizeText",
        title: "Make Text Formal",
        contexts: ["selection"],
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "formalizeText" && info.selectionText) {
      // Open popup FIRST for instant visual feedback
      chrome.action.openPopup();
      
      // Then store data asynchronously (won't block popup)
      chrome.storage.local.set({
        selectedText: info.selectionText,
        formalizedResult: null
      });
    }
  });