// popup.js handles UI logic and messaging to background for Privacy_Blur_screen

const selectBtn = document.getElementById('select-blur');
const removeAllBtn = document.getElementById('remove-all');
const persistCheckbox = document.getElementById('persist-overlays');
const blurRadiusRange = document.getElementById('blur-radius');
const blurValueSpan = document.getElementById('blur-value');
const maxOverlaysInput = document.getElementById('max-overlays');
const statusDiv = document.getElementById('status');

function setStatus(msg, type = 'info', timeout = 2500) {
  statusDiv.textContent = msg;
  statusDiv.style.opacity = 1;
  statusDiv.setAttribute('aria-live', 'polite');
  if (timeout) setTimeout(() => statusDiv.style.opacity = 0, timeout);
}

selectBtn.onclick = async () => {
  setStatus("Entering selection mode...", 'info');
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab || !tab.id) throw new Error('No active tab found.');
    await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        window.postMessage({privacy_blur_screen__start_selection: true}, '*');
      }
    });
    setStatus("Selection mode activated. Drag on page.", 'info');
  } catch (err) {
    setStatus("Failed: " + err.message, 'error', 3500);
  }
};

removeAllBtn.onclick = async () => {
  setStatus("Removing all blurred regions...", 'info');
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab || !tab.id) throw new Error('No active tab found.');
    await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        window.postMessage({privacy_blur_screen__remove_all: true}, '*');
      }
    });
    setStatus("All blurred overlays removed.", 'success');
  } catch (err) {
    setStatus("Failed: " + err.message, 'error', 3500);
  }
};

// Settings
blurRadiusRange.oninput = () => {
  blurValueSpan.textContent = blurRadiusRange.value + 'px';
  chrome.storage.local.set({privacy_blur_radius: parseInt(blurRadiusRange.value)});
};
maxOverlaysInput.onchange = () => {
  chrome.storage.local.set({privacy_blur_max_overlays: parseInt(maxOverlaysInput.value)});
};
persistCheckbox.onchange = () => {
  chrome.storage.local.set({privacy_blur_persist: persistCheckbox.checked});
};

async function restorePrefs() {
  try {
    const prefs = await chrome.storage.local.get([
      'privacy_blur_radius',
      'privacy_blur_max_overlays',
      'privacy_blur_persist'
    ]);
    if (prefs.privacy_blur_radius) blurRadiusRange.value = prefs.privacy_blur_radius;
    blurValueSpan.textContent = blurRadiusRange.value + 'px';
    if (prefs.privacy_blur_max_overlays) maxOverlaysInput.value = prefs.privacy_blur_max_overlays;
    persistCheckbox.checked = !!prefs.privacy_blur_persist;
  } catch (err) {
    // safe fallback
  }
}
restorePrefs();

window.addEventListener('keydown', (e) => {
  if ((e.altKey && e.shiftKey && e.code === 'KeyB')) {
    selectBtn.click();
  }
});