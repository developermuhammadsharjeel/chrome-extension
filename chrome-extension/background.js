// Initialize extension state
chrome.runtime.onInstalled.addListener(function() {
  try {
    chrome.storage.local.set({
      blurActive: false,
      hasBlurAreas: false
    });
    
    console.log("ScreenBlur: Privacy extension installed successfully!");
  } catch (e) {
    console.error("Error initializing extension:", e);
  }
});

// Listen for tab changes to update the extension icon state
chrome.tabs.onActivated.addListener(function(activeInfo) {
  try {
    updateIconState(activeInfo.tabId);
  } catch (e) {
    console.error("Error in tab activated handler:", e);
  }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  try {
    if (changeInfo.status === 'complete') {
      updateIconState(tabId);
    }
  } catch (e) {
    console.error("Error in tab updated handler:", e);
  }
});

function updateIconState(tabId) {
  try {
    chrome.storage.local.get(['blurActive', 'hasBlurAreas'], function(result) {
      if (chrome.runtime.lastError) {
        console.error("Error getting state:", chrome.runtime.lastError);
        return;
      }
      
      const isActive = result.blurActive || false;
      const hasAreas = result.hasBlurAreas || false;
      
      // You can implement different icon states here if needed
    });
  } catch (e) {
    console.error("Error updating icon state:", e);
  }
}
