// service_worker.js -- background logic for Privacy_Blur_screen

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-selection") {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (!tab || !tab.id) return;
      await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: () => {
          window.postMessage({privacy_blur_screen__start_selection: true}, '*');
        }
      });
    } catch (err) {
      // Log error
      await chrome.storage.local.set({privacy_blur_last_error: err.message});
    }
  }
});

// On install, set defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    privacy_blur_color: '#ffffff',
    privacy_blur_density: 13,
    privacy_blur_persist: false
  });
});

// Keep popup open
chrome.action.onClicked.addListener((tab) => {
  chrome.action.setPopup({ popup: 'popup.html' });
});
