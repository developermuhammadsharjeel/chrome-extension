
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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
    case 'editBlurAreas':
      toggleEditMode();
      break;
  }
  
  return true;
});

// Store blur areas
let blurAreas = [];
let isSelecting = false;
let isEditing = false;
let startX, startY;
let currentBlurArea = null;
let selectedBlurAreaIndex = -1;
let dragOffsetX = 0, dragOffsetY = 0;

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
    case 'editBlurAreas':
      toggleEditMode();
      break;
  }
  return true;
});

// Load saved blur areas for this page
window.addEventListener('load', function() {
  const pageUrl = window.location.href;
  chrome.storage.local.get([pageUrl], function(result) {
    if (result[pageUrl]) {
      blurAreas = result[pageUrl];
      renderBlurAreas();
      chrome.storage.local.set({hasBlurAreas: blurAreas.length > 0});
    }
  });
});

function startBlurSelection() {
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  isSelecting = true;
  isEditing = false;
}

function stopBlurSelection() {
  document.body.style.cursor = 'default';
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  selectionOverlay.style.display = 'none';
  isSelecting = false;
  isEditing = false;
}

function handleMouseDown(e) {
  if (!isSelecting) return;
  
  // Ignore if click is on a blur area handle while in edit mode
  if (e.target.classList.contains('blur-handle')) return;
  
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
}

function handleMouseMove(e) {
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
}

function handleMouseUp(e) {
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
}

function renderBlurAreas() {
  // Clear existing blur areas
  overlayContainer.innerHTML = '';
  
  // Create and add blur areas to the container
  blurAreas.forEach((area, index) => {
    const blurDiv = document.createElement('div');
    blurDiv.classList.add('privacy-blur-area');
    blurDiv.dataset.index = index;
    
    blurDiv.style.left = area.x + 'px';
    blurDiv.style.top = area.y + 'px';
    blurDiv.style.width = area.width + 'px';
    blurDiv.style.height = area.height + 'px';
    
    // Add resize handles if in edit mode
    if (isEditing) {
      const positions = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'];
      positions.forEach(pos => {
        const handle = document.createElement('div');
        handle.classList.add('blur-handle', `blur-handle-${pos}`);
        handle.dataset.position = pos;
        handle.dataset.index = index;
        blurDiv.appendChild(handle);
      });
      
      // Add move handle
      blurDiv.classList.add('editable');
    }
    
    overlayContainer.appendChild(blurDiv);
  });
  
  // Show container if there are blur areas
  overlayContainer.style.display = blurAreas.length > 0 ? 'block' : 'none';
  
  // Update storage flag
  chrome.storage.local.set({hasBlurAreas: blurAreas.length > 0});
}

function saveBlurAreas() {
  const pageUrl = window.location.href;
  const data = {};
  data[pageUrl] = blurAreas;
  chrome.storage.local.set(data);
  chrome.storage.local.set({hasBlurAreas: blurAreas.length > 0});
}

function clearAllBlurs() {
  blurAreas = [];
  renderBlurAreas();
  saveBlurAreas();
}

function toggleEditMode() {
  isEditing = !isEditing;
  
  if (isEditing) {
    isSelecting = false;
    setupEditEventListeners();
  } else {
    removeEditEventListeners();
  }
  
  renderBlurAreas();
}

function setupEditEventListeners() {
  document.addEventListener('mousedown', handleEditMouseDown);
  document.addEventListener('mousemove', handleEditMouseMove);
  document.addEventListener('mouseup', handleEditMouseUp);
}

function removeEditEventListeners() {
  document.removeEventListener('mousedown', handleEditMouseDown);
  document.removeEventListener('mousemove', handleEditMouseMove);
  document.removeEventListener('mouseup', handleEditMouseUp);
}

function handleEditMouseDown(e) {
  if (!isEditing) return;
  
  // Check if clicking on a blur area or handle
  if (e.target.classList.contains('privacy-blur-area')) {
    // Moving the entire blur area
    selectedBlurAreaIndex = parseInt(e.target.dataset.index);
    dragOffsetX = e.clientX - blurAreas[selectedBlurAreaIndex].x;
    dragOffsetY = e.clientY - blurAreas[selectedBlurAreaIndex].y;
    document.body.style.cursor = 'move';
  } else if (e.target.classList.contains('blur-handle')) {
    // Resizing blur area
    selectedBlurAreaIndex = parseInt(e.target.dataset.index);
    const position = e.target.dataset.position;
    document.body.style.cursor = position + '-resize';
  }
}

function handleEditMouseMove(e) {
  if (!isEditing || selectedBlurAreaIndex === -1) return;
  
  const selectedArea = blurAreas[selectedBlurAreaIndex];
  
  if (e.target.classList.contains('blur-handle')) {
    // Resize logic based on which handle is being dragged
    const position = e.target.dataset.position;
    
    switch(position) {
      case 'nw':
        // Update top-left corner
        break;
      case 'ne':
        // Update top-right corner
        break;
      // Add other cases for different handles
    }
  } else {
    // Moving the entire blur area
    selectedArea.x = e.clientX - dragOffsetX;
    selectedArea.y = e.clientY - dragOffsetY;
    
    renderBlurAreas();
  }
}

function handleEditMouseUp(e) {
  if (!isEditing) return;
  
  if (selectedBlurAreaIndex !== -1) {
    saveBlurAreas();
    selectedBlurAreaIndex = -1;
    document.body.style.cursor = 'default';
  }
}
