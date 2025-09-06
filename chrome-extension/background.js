// Initialize extension state
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.set({
    blurActive: false,
    hasBlurAreas: false
  });
});

// Listen for tab changes to update the extension icon state
chrome.tabs.onActivated.addListener(function(activeInfo) {
  updateIconState(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    updateIconState(tabId);
  }
});

function updateIconState(tabId) {
  chrome.storage.local.get(['blurActive', 'hasBlurAreas'], function(result) {
    const isActive = result.blurActive || false;
    
    // You can implement different icon states here if needed
  });
}