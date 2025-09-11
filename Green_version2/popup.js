const selectBtn = document.getElementById('select-blur');
const removeAllBtn = document.getElementById('remove-all');
const persistCheckbox = document.getElementById('persist-overlays');
const blurColorPicker = document.getElementById('blur-color');
const blurDensitySlider = document.getElementById('blur-density');
const densityValueSpan = document.getElementById('density-value');
const minimizeBtn = document.getElementById('minimize-btn');
const statusDiv = document.getElementById('status');

document.addEventListener('DOMContentLoaded', () => {
  chrome.action.setPopup({ popup: '' });
  
  document.body.style.display = 'flex';
});

minimizeBtn.onclick = () => {
  window.close();
};

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

async function notifySettingsChanged() {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab || !tab.id) return;
    await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        window.postMessage({privacy_blur_screen__update_settings: true}, '*');
      }
    });
  } catch (err) {
    console.error("Failed to notify content script:", err);
  }
}

blurColorPicker.onchange = () => {
  chrome.storage.local.set({privacy_blur_color: blurColorPicker.value}, () => {
    setStatus("Blur color updated!", 'success');
    notifySettingsChanged();
  });
};

blurDensitySlider.oninput = () => {
  const value = blurDensitySlider.value;
  densityValueSpan.textContent = value + '%';
};

blurDensitySlider.onchange = () => {
  const value = blurDensitySlider.value;
  chrome.storage.local.set({privacy_blur_density: parseInt(value)}, () => {
    setStatus("Density updated!", 'success');
    notifySettingsChanged();
  });
};

persistCheckbox.onchange = () => {
  chrome.storage.local.set({privacy_blur_persist: persistCheckbox.checked});
};

async function restorePrefs() {
  try {
    const prefs = await chrome.storage.local.get([
      'privacy_blur_color',
      'privacy_blur_density',
      'privacy_blur_persist'
    ]);
    if (prefs.privacy_blur_color) blurColorPicker.value = prefs.privacy_blur_color;
    if (prefs.privacy_blur_density) {
      blurDensitySlider.value = prefs.privacy_blur_density;
      densityValueSpan.textContent = prefs.privacy_blur_density + '%';
    }
    persistCheckbox.checked = !!prefs.privacy_blur_persist;
  } catch (err) {
  }
}
restorePrefs();

window.addEventListener('keydown', (e) => {
  if ((e.altKey && e.shiftKey && e.code === 'KeyB')) {
    selectBtn.click();
  }
});
