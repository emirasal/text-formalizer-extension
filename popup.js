document.addEventListener("DOMContentLoaded", async function () {
    const apiKey = "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"; // Your API key
    const textarea = document.getElementById("formalizedText");
    const copyBtn = document.getElementById("copyBtn");
    const applyBtn = document.getElementById("applyBtn");
    const loadingIndicator = document.getElementById("loadingIndicator");
    
    // First, check if we have a stored formalized text result
    chrome.storage.local.get(["formalizedResult", "selectedText"], async (data) => {
        // If we have a previous result, show it
        if (data.formalizedResult) {
            textarea.value = data.formalizedResult;
            loadingIndicator.style.display = "none";
        } 
        // If we have a selected text but no formalized result yet, process it
        else if (data.selectedText && !data.formalizedResult) {
            // Show loading state 
            loadingIndicator.style.display = "flex";
            
            const selectedText = data.selectedText;
            console.log("Selected Text:", selectedText);
            console.log("🚀 Preparing to send API request...");
        
            try {
                const requestBody = {
                    model: "deepseek/deepseek-r1:free",
                    messages: [{ role: "user", content: `Make this more formal with minimal changes (no need to use unusual words). Do not change words unless necessary. If there are any errors on the sentence also fix them. Only give me the plain text of the sentence.: ${selectedText}` }]
                };
        
                console.log("📡 Sending API Request:", requestBody);
        
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "mistralai/mistral-7b-instruct:free",
                        messages: requestBody.messages, // Ensure requestBody follows OpenAI's Chat API format
                        extra_body: {}
                    }),
                });
        
                console.log("🛜 Raw API Response:", response);
        
                const result = await response.json();
                console.log("📜 Parsed API Response:", result);
        
                if (result.choices && result.choices[0] && result.choices[0].message) {

                    //const formalText = result.choices[0].message.content;
                    const formalText = result.choices[0]?.message?.content.trim() || "";
                    textarea.value = formalText;
                    
                    // Store the formalized result
                    chrome.storage.local.set({ formalizedResult: formalText });
                    
                    // Hide loading indicator
                    loadingIndicator.style.display = "none";
                } else {
                    console.error("API response missing expected data:", result);
                    textarea.value = "Error: Could not fetch formalized text.";
                    loadingIndicator.style.display = "none";
                }
            } catch (error) {
                console.error("API Request Failed:", error);
                textarea.value = "Error: API request failed.";
                loadingIndicator.style.display = "none";
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
        alert("Text copied to clipboard!");
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
                }
            });
        });
    });
});