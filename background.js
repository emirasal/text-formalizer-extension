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
        console.log("Selected Text:", info.selectionText);
        // Store selected text and clear previous formalized result
        chrome.storage.local.set({ 
            selectedText: info.selectionText,
            formalizedResult: null  // Clear previous result when new text is selected
        }, () => {
            // Open the popup immediately
            chrome.action.openPopup();
        });
    }
  });