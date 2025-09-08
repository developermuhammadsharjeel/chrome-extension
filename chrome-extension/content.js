// Store blur areas
let blurAreas = [];
let isSelecting = false;
let startX, startY;
let currentBlurArea = null;

// Create overlay container
const overlayContainer = document.createElement('div');
overlayContainer.id = 'privacy-blur-overlay-container';
overlayContainer.style.display = 'none';
document.body.appendChild(overlayContainer);

// Create selection overlay
const selectionOverlay = document.createElement('div');
selectionOverlay.id = 'privacy-blur-selection';
selectionOverlay.style.display = 'none';
document.body.appendChild(selectionOverlay);

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  try {
    if (request.action === "ping") {
      sendResponse({status: "ok"});
      return true;
    }
    
    switch(request.action) {
      case 'startBlurSelection':
        startBlurSelection();
        break;
      case 'stopBlurSelection':
        stopBlurSelection();
        break;
      case 'clearAllBlurs':
        clearAllBlurs();
        break;
    }
    
    sendResponse({status: "ok"});
  } catch (e) {
    console.error("Error handling message:", e);
    sendResponse({status: "error", message: e.message});
  }
  
  return true;
});

// Load saved blur areas for this page
window.addEventListener('load', function() {
  try {
    const pageUrl = window.location.href;
    chrome.storage.local.get([pageUrl], function(result) {
      if (chrome.runtime.lastError) {
        console.error("Error loading blur areas:", chrome.runtime.lastError);
        return;
      }
      
      if (result[pageUrl]) {
        blurAreas = result[pageUrl];
        renderBlurAreas();
        chrome.storage.local.set({hasBlurAreas: blurAreas.length > 0});
      }
    });
  } catch (e) {
    console.error("Error in load event:", e);
  }
});

function startBlurSelection() {
  try {
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    isSelecting = true;
  } catch (e) {
    console.error("Error starting blur selection:", e);
  }
}

function stopBlurSelection() {
  try {
    document.body.style.cursor = 'default';
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    selectionOverlay.style.display = 'none';
    isSelecting = false;
  } catch (e) {
    console.error("Error stopping blur selection:", e);
  }
}

function handleMouseDown(e) {
  try {
    if (!isSelecting) return;
    
    startX = e.clientX;
    startY = e.clientY;
    
    selectionOverlay.style.left = startX + 'px';
    selectionOverlay.style.top = startY + 'px';
    selectionOverlay.style.width = '0px';
    selectionOverlay.style.height = '0px';
    selectionOverlay.style.display = 'block';
    
    currentBlurArea = {
      x: startX,
      y: startY,
      width: 0,
      height: 0
    };
    
    // Prevent default browser selection behavior
    e.preventDefault();
  } catch (e) {
    console.error("Error in mouse down handler:", e);
  }
}

function handleMouseMove(e) {
  try {
    if (!isSelecting || currentBlurArea === null) return;
    
    const width = e.clientX - startX;
    const height = e.clientY - startY;
    
    // Update selection overlay
    if (width < 0) {
      selectionOverlay.style.left = e.clientX + 'px';
      selectionOverlay.style.width = Math.abs(width) + 'px';
    } else {
      selectionOverlay.style.width = width + 'px';
    }
    
    if (height < 0) {
      selectionOverlay.style.top = e.clientY + 'px';
      selectionOverlay.style.height = Math.abs(height) + 'px';
    } else {
      selectionOverlay.style.height = height + 'px';
    }
    
    // Prevent default browser selection behavior
    e.preventDefault();
  } catch (e) {
    console.error("Error in mouse move handler:", e);
  }
}

function handleMouseUp(e) {
  try {
    if (!isSelecting || currentBlurArea === null) return;
    
    // Calculate final dimensions
    let width = e.clientX - startX;
    let height = e.clientY - startY;
    let x = startX;
    let y = startY;
    
    if (width < 0) {
      width = Math.abs(width);
      x = e.clientX;
    }
    
    if (height < 0) {
      height = Math.abs(height);
      y = e.clientY;
    }
    
    // Only add if area is big enough
    if (width > 10 && height > 10) {
      blurAreas.push({
        x: x,
        y: y,
        width: width,
        height: height
      });
      
      renderBlurAreas();
      saveBlurAreas();
    }
    
    currentBlurArea = null;
    selectionOverlay.style.display = 'none';
    
    // Auto-stop selection after an area is selected
    stopBlurSelection();
    chrome.storage.local.set({blurActive: false});
    
    // Prevent default browser selection behavior
    e.preventDefault();
  } catch (e) {
    console.error("Error in mouse up handler:", e);
  }
}

function renderBlurAreas() {
  try {
    // Clear existing blur areas
    overlayContainer.innerHTML = '';
    
    // Create and add blur areas to the container
    blurAreas.forEach((area, index) => {
      const blurDiv = document.createElement('div');
      blurDiv.classList.add('privacy-blur-area');
      blurDiv.dataset.index = index;
      
      // Apply sanitized dimensions (ensure they're valid numbers)
      const sanitizeValue = (val) => {
        const num = parseFloat(val);
        return isNaN(num) ? 0 : Math.max(0, num);
      };
      
      blurDiv.style.left = sanitizeValue(area.x) + 'px';
      blurDiv.style.top = sanitizeValue(area.y) + 'px';
      blurDiv.style.width = sanitizeValue(area.width) + 'px';
      blurDiv.style.height = sanitizeValue(area.height) + 'px';
      
      overlayContainer.appendChild(blurDiv);
    });
    
    // Show container if there are blur areas
    overlayContainer.style.display = blurAreas.length > 0 ? 'block' : 'none';
    
    // Update storage flag
    chrome.storage.local.set({hasBlurAreas: blurAreas.length > 0});
  } catch (e) {
    console.error("Error rendering blur areas:", e);
  }
}

function saveBlurAreas() {
  try {
    const pageUrl = window.location.href;
    const data = {};
    data[pageUrl] = blurAreas;
    chrome.storage.local.set(data);
    chrome.storage.local.set({hasBlurAreas: blurAreas.length > 0});
  } catch (e) {
    console.error("Error saving blur areas:", e);
  }
}

function clearAllBlurs() {
  try {
    blurAreas = [];
    renderBlurAreas();
    saveBlurAreas();
  } catch (e) {
    console.error("Error clearing blur areas:", e);
  }
}

// Listen for page resize events to ensure blur areas stay in the right place
window.addEventListener('resize', function() {
  try {
    if (blurAreas.length > 0) {
      renderBlurAreas();
    }
  } catch (e) {
    console.error("Error handling resize event:", e);
  }
});
