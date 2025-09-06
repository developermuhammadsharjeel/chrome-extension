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
      chrome.tabs.sendMessage(tabs[0].id, {
        action: blurActive ? 'startBlurSelection' : 'stopBlurSelection'
      });
    });
    
    chrome.storage.local.set({blurActive: blurActive});
    updateUI(blurActive, blurActive ? true : false);
  });
  
  clearAllBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'clearAllBlurs'});
    });
    
    chrome.storage.local.set({hasBlurAreas: false});
    updateUI(false, false);
  });
  
  editBlursBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'editBlurAreas'});
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