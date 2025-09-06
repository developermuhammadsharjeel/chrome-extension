let blurActive = false;

document.addEventListener('DOMContentLoaded', function() {
  const toggleBlurBtn = document.getElementById('toggleBlur');
  const clearAllBtn = document.getElementById('clearAll');
  const editBlursBtn = document.getElementById('editBlurs');
  const statusDiv = document.getElementById('status');
  
  // Check current state
  chrome.storage.local.get(['blurActive', 'hasBlurAreas'], function(result) {
    blurActive = result.blurActive || false;
    const hasBlurAreas = result.hasBlurAreas || false;
    
    updateUI(blurActive, hasBlurAreas);
  });
  
  toggleBlurBtn.addEventListener('click', function() {
    blurActive = !blurActive;
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        // Check if we can send a message to this tab
        chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(response) {
          if (chrome.runtime.lastError) {
            // Content script not loaded yet, inject it
            chrome.scripting.executeScript({
              target: {tabId: tabs[0].id},
              files: ['content.js']
            }, function() {
              // Now send the actual message
              chrome.tabs.sendMessage(tabs[0].id, {
                action: blurActive ? 'startBlurSelection' : 'stopBlurSelection'
              });
            });
          } else {
            // Content script is already there, send message directly
            chrome.tabs.sendMessage(tabs[0].id, {
              action: blurActive ? 'startBlurSelection' : 'stopBlurSelection'
            });
          }
        });
      } else {
        console.error("No active tab found");
        statusDiv.textContent = "Error: Cannot access this page";
        statusDiv.classList.add("error");
      }
    });
    
    chrome.storage.local.set({blurActive: blurActive});
    updateUI(blurActive, blurActive ? true : false);
  });
  
  clearAllBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'clearAllBlurs'}, function(response) {
          if (chrome.runtime.lastError) {
            console.log("Error sending message: ", chrome.runtime.lastError);
          }
        });
      }
    });
    
    chrome.storage.local.set({hasBlurAreas: false});
    updateUI(false, false);
  });
  
  editBlursBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'editBlurAreas'}, function(response) {
          if (chrome.runtime.lastError) {
            console.log("Error sending message: ", chrome.runtime.lastError);
          }
        });
      }
    });
  });
  
  function updateUI(isActive, hasAreas) {
    if (isActive) {
      toggleBlurBtn.textContent = 'Stop Blur Selection';
      statusDiv.textContent = 'Blur mode active';
      statusDiv.classList.remove('inactive');
      statusDiv.classList.add('active');
    } else {
      toggleBlurBtn.textContent = 'Start Blur Selection';
      statusDiv.textContent = 'Blur mode inactive';
      statusDiv.classList.remove('active');
      statusDiv.classList.add('inactive');
    }
    
    clearAllBtn.disabled = !hasAreas;
    editBlursBtn.disabled = !hasAreas;
  }
});
