document.addEventListener("DOMContentLoaded", async function () {
    const apiKey = "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"; // Your API key
    const textarea = document.getElementById("formalizedText");
    const copyBtn = document.getElementById("copyBtn");
    const applyBtn = document.getElementById("applyBtn");
    const loadingIndicator = document.getElementById("loadingIndicator");
    
    // Show the popup immediately with the original text while processing
    chrome.storage.local.get(["formalizedResult", "selectedText"], async (data) => {
        // If we have a previous result, show it
        if (data.formalizedResult) {
            textarea.value = data.formalizedResult;
            loadingIndicator.style.display = "none";
        } 
        // If we have selected text but no formalized result yet
        else if (data.selectedText) {
            // Show the original text immediately for better UX
            textarea.value = data.selectedText;
            
            // Show loading indicator at the top of popup
            loadingIndicator.style.display = "flex";
            loadingIndicator.innerText = "Formalizing text...";
            
            console.log("Selected Text:", data.selectedText);
            console.log("🚀 Preparing to send API request...");
            
            try {
                const requestBody = {
                    messages: [{ 
                        role: "user", 
                        content: `Make this more formal with minimal changes (no need to use unusual words do not change words unless necessary). If there are any errors on the sentence also fix them. If you cannot understand what it is just return the same input. Input may not be english if that is the case you should return the sentence with that language (do not translate to english). Only give me the plain text of the sentence.: ${data.selectedText}` 
                    }]
                };
        
                console.log("📡 Sending API Request");
        
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "mistralai/mistral-7b-instruct:free",
                        messages: requestBody.messages,
                        extra_body: {}
                    }),
                });
        
                const result = await response.json();
                console.log("📜 Parsed API Response:", result);
        
                if (result.choices && result.choices[0] && result.choices[0].message) {
                    const formalText = result.choices[0]?.message?.content.trim() || "";
                    
                    // Visually highlight that the text has been updated
                    textarea.style.backgroundColor = "#f0f9ff";
                    setTimeout(() => {
                        textarea.style.backgroundColor = "";
                    }, 500);
                    
                    textarea.value = formalText;
                    
                    // Store the formalized result
                    chrome.storage.local.set({ formalizedResult: formalText });
                } else {
                    console.error("API response missing expected data:", result);
                    // Keep the original text visible but show error
                    loadingIndicator.innerText = "Error: Could not formalize text.";
                    loadingIndicator.style.color = "red";
                }
            } catch (error) {
                console.error("API Request Failed:", error);
                loadingIndicator.innerText = "Error: API request failed.";
                loadingIndicator.style.color = "red";
            } finally {
                // Hide loading indicator after process completes
                setTimeout(() => {
                    loadingIndicator.style.display = "none";
                }, 1000);
            }
        } else {
            // No text selected and no previous result
            textarea.value = "No text selected. Please select text and try again.";
            loadingIndicator.style.display = "none";
        }
    });
   
    // Copy text to clipboard
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(textarea.value);
        
        // Visual feedback for copy
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "Copied!";
        setTimeout(() => {
            copyBtn.innerText = originalText;
        }, 1500);
    });
    
    // Apply text to the page - improved approach
    applyBtn.addEventListener("click", async () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
            
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: (formalText) => {
                    // Try to use document.execCommand for better compatibility
                    try {
                        // Focus on the active element if it's a text input or editable area
                        if (document.activeElement && 
                            (document.activeElement.isContentEditable || 
                             document.activeElement.tagName === 'INPUT' || 
                             document.activeElement.tagName === 'TEXTAREA')) {
                            
                            // For input and textarea elements
                            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                                const start = document.activeElement.selectionStart;
                                const end = document.activeElement.selectionEnd;
                                const value = document.activeElement.value;
                                
                                document.activeElement.value = value.substring(0, start) + 
                                                           formalText + 
                                                           value.substring(end);
                                return true;
                            }
                            // For contentEditable elements
                            else if (document.activeElement.isContentEditable) {
                                document.execCommand('insertText', false, formalText);
                                return true;
                            }
                        }
                        
                        // If selection exists but no focused editable element
                        if (window.getSelection) {
                            const selection = window.getSelection();
                            if (selection.rangeCount > 0) {
                                const range = selection.getRangeAt(0);
                                range.deleteContents();
                                range.insertNode(document.createTextNode(formalText));
                                return true;
                            }
                        }
                        
                        return false;
                    } catch (e) {
                        console.error("Error applying text:", e);
                        return false;
                    }
                },
                args: [textarea.value]
            }, (results) => {
                if (results && results[0] && results[0].result === false) {
                    alert("Couldn't apply changes. Try selecting text first or using the Copy button.");
                } else {
                    // Visual feedback for successful apply
                    const originalText = applyBtn.innerText;
                    applyBtn.innerText = "Applied!";
                    setTimeout(() => {
                        applyBtn.innerText = originalText;
                    }, 1500);
                }
            });
        });
    });
});