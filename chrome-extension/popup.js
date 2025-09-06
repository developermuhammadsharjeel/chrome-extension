let blurActive = false;

document.addEventListener('DOMContentLoaded', function() {
  const toggleBlurBtn = document.getElementById('toggleBlur');
  const clearAllBtn = document.getElementById('clearAll');
  const statusDiv = document.getElementById('status');

  checkCurrentTab();
  
  toggleBlurBtn.addEventListener('click', handleToggleBlur);
  clearAllBtn.addEventListener('click', handleClearAll);
  
  function checkCurrentTab() {
    try {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        
        if (!currentTab) {
          displayError("No active tab found");
          disableAllButtons();
          return;
        }
        
        if (currentTab.url && (
            currentTab.url.startsWith('chrome://') || 
            currentTab.url.startsWith('chrome-extension://') ||
            currentTab.url.startsWith('devtools://') ||
            currentTab.url.startsWith('view-source:') ||
            currentTab.url.startsWith('about:') ||
            currentTab.url.startsWith('data:') ||
            currentTab.url.startsWith('file:')
        )) {
          displayError("Extension cannot work on this page");
          disableAllButtons();
          return;
        }
        
        try {
          chrome.tabs.sendMessage(currentTab.id, {action: "ping"}, function(response) {
            if (chrome.runtime.lastError) {
       
              loadInitialState();
            } else {
              loadInitialState();
            }
          });
        } catch (e) {
          console.error("Error checking tab:", e);
          displayError("Error connecting to page");
          disableAllButtons();
        }
      });
    } catch (e) {
      console.error("Error in checkCurrentTab:", e);
      displayError("Extension error");
      disableAllButtons();
    }
  }
  
  function loadInitialState() {
    try {
      chrome.storage.local.get(['blurActive', 'hasBlurAreas'], function(result) {
        if (chrome.runtime.lastError) {
          console.error("Storage error:", chrome.runtime.lastError);
          return;
        }
        
        blurActive = result.blurActive || false;
        const hasBlurAreas = result.hasBlurAreas || false;
        
        updateUI(blurActive, hasBlurAreas);
      });
    } catch (e) {
      console.error("Error loading state:", e);
      displayError("Failed to load extension state");
    }
  }
  
  function handleToggleBlur() {
    try {
      blurActive = !blurActive;
      
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs[0]) {
          displayError("No active tab found");
          return;
        }
        
        // Try to send message to content script
        sendMessageToContentScript({
          action: blurActive ? 'startBlurSelection' : 'stopBlurSelection'
        }, function() {
          chrome.storage.local.set({blurActive: blurActive});
          updateUI(blurActive, blurActive ? true : false);
        });
      });
    } catch (e) {
      console.error("Error in toggle blur:", e);
      displayError("Failed to toggle blur mode");
    }
  }
  
  function handleClearAll() {
    try {
      sendMessageToContentScript({action: 'clearAllBlurs'}, function() {
        chrome.storage.local.set({hasBlurAreas: false});
        updateUI(false, false);
      });
    } catch (e) {
      console.error("Error clearing blurs:", e);
      displayError("Failed to clear blur areas");
    }
  }
  
  function sendMessageToContentScript(message, callback) {
    try {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs[0]) {
          displayError("No active tab found");
          return;
        }
        
        try {
          chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
            if (chrome.runtime.lastError) {
              console.log("Trying to inject content script first...");
              
              // Try to inject the content script
              chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                files: ['content.js']
              }, function() {
                if (chrome.runtime.lastError) {
                  console.error("Failed to inject content script:", chrome.runtime.lastError);
                  displayError("Cannot access this page");
                  return;
                }
                
                // Try sending the message again
                setTimeout(function() {
                  chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
                    if (chrome.runtime.lastError) {
                      console.error("Still failed after injection:", chrome.runtime.lastError);
                      displayError("Cannot execute on this page");
                    } else if (callback) {
                      callback(response);
                    }
                  });
                }, 100); // Small delay to ensure content script is initialized
              });
            } else if (callback) {
              callback(response);
            }
          });
        } catch (e) {
          console.error("Error sending message:", e);
          displayError("Communication error");
        }
      });
    } catch (e) {
      console.error("Error in sendMessageToContentScript:", e);
      displayError("Extension communication error");
    }
  }
  
  function updateUI(isActive, hasAreas) {
    try {
      if (isActive) {
        toggleBlurBtn.textContent = 'Stop Blur Selection';
        statusDiv.textContent = 'Blur mode active';
        statusDiv.classList.remove('inactive', 'error');
        statusDiv.classList.add('active');
      } else {
        toggleBlurBtn.textContent = 'Start Blur Selection';
        statusDiv.textContent = 'Blur mode inactive';
        statusDiv.classList.remove('active', 'error');
        statusDiv.classList.add('inactive');
      }
      
      clearAllBtn.disabled = !hasAreas;
    } catch (e) {
      console.error("Error updating UI:", e);
    }
  }
  
  function displayError(message) {
    try {
      statusDiv.textContent = message || "An error occurred";
      statusDiv.classList.remove('active', 'inactive');
      statusDiv.classList.add('error');
    } catch (e) {
      console.error("Error displaying error message:", e);
    }
  }
  
  function disableAllButtons() {
    try {
      toggleBlurBtn.disabled = true;
      clearAllBtn.disabled = true;
    } catch (e) {
      console.error("Error disabling buttons:", e);
    }
  }
});
