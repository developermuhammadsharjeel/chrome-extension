(function() {

  let shadowHost = null, shadowRoot = null;
  let overlays = [];
  let selectionActive = false;
  let selectionOverlay = null;
  let tooltip = null;
  let startPoint = null;
  let blurRadius = 8;
  let blurColor = "rgba(255,255,255,0.13)";
  let blurDensity = 13;
  let persistOverlays = false;
  let ariaLiveDiv = null;
  let toastTimeout = null;

 
  function announce(msg, timeout = 2500) {
    if (!ariaLiveDiv) {
      ariaLiveDiv = document.createElement('div');
      ariaLiveDiv.setAttribute('aria-live', 'polite');
      ariaLiveDiv.style.position = 'fixed';
      ariaLiveDiv.style.left = '8px';
      ariaLiveDiv.style.bottom = '8px';
      ariaLiveDiv.style.zIndex = '2147483647';
      ariaLiveDiv.style.background = 'rgba(42,78,154,0.7)';
      ariaLiveDiv.style.color = '#fff';
      ariaLiveDiv.style.fontSize = '1em';
      ariaLiveDiv.style.padding = '8px 14px';
      ariaLiveDiv.style.borderRadius = '9px';
      ariaLiveDiv.style.boxShadow = '0 2px 16px rgba(0,0,0,0.13)';
      ariaLiveDiv.style.pointerEvents = 'none';
      ariaLiveDiv.style.transition = 'opacity 0.22s';
      document.body.appendChild(ariaLiveDiv);
    }
    ariaLiveDiv.textContent = msg;
    ariaLiveDiv.style.opacity = 1;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      ariaLiveDiv.style.opacity = 0;
      ariaLiveDiv.textContent = "";
    }, timeout);
  }

  function hexToRgba(hex, alpha = 13) {

    hex = hex.replace('#', '');
    
  
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    

    return `rgba(${r}, ${g}, ${b}, ${alpha/100})`;
  }


  async function loadPrefs() {
    try {
      const prefs = await chrome.storage.local.get([
        'privacy_blur_color',
        'privacy_blur_density',
        'privacy_blur_persist'
      ]);
      
      blurDensity = prefs.privacy_blur_density || 13;
      
      if (prefs.privacy_blur_color) {
        const hexColor = prefs.privacy_blur_color;
        blurColor = hexToRgba(hexColor, blurDensity);
      } else {
        blurColor = hexToRgba('#ffffff', blurDensity);
      }
      
      persistOverlays = !!prefs.privacy_blur_persist;
    } catch (err) {
      blurColor = "rgba(255,255,255,0.13)";
      blurDensity = 13;
      persistOverlays = false;
    }
  }


  function ensureShadowHost() {
    if (!shadowHost || !document.body.contains(shadowHost)) {
      shadowHost = document.createElement('div');
      shadowHost.setAttribute('id', 'privacy-blur-screen-shadow-host');
      shadowHost.style.position = 'fixed';
      shadowHost.style.left = '0';
      shadowHost.style.top = '0';
      shadowHost.style.width = '100vw';
      shadowHost.style.height = '100vh';
      shadowHost.style.zIndex = '2147483646';
      shadowHost.style.pointerEvents = 'none'; 
      shadowHost.style.userSelect = 'none';
      shadowRoot = shadowHost.attachShadow({mode: 'open'});
      document.body.appendChild(shadowHost);
    }
  }


  function removeAllOverlays() {
    if (shadowRoot) {
      shadowRoot.innerHTML = '';
    }
    overlays = [];
    announce("All blurred overlays removed.");
    saveOverlays();
  }


  function removeOverlay(idx, animate = true) {
    const overlay = overlays[idx];
    if (!overlay) return;
    if (animate) {
      overlay.el.style.transform = 'scale(0.8)';
      overlay.el.style.opacity = '0';
      setTimeout(() => {
        if (overlay.el && overlay.el.parentNode) overlay.el.parentNode.removeChild(overlay.el);
        overlays.splice(idx, 1);
        saveOverlays();
      }, 220);
    } else {
      if (overlay.el && overlay.el.parentNode) overlay.el.parentNode.removeChild(overlay.el);
      overlays.splice(idx, 1);
      saveOverlays();
    }
  }

 
  function saveOverlays() {
    if (!persistOverlays) return;
 
    const data = overlays.map(o => ({
      left: o.left, top: o.top, width: o.width, height: o.height, type: o.type, color: o.color
    }));
    chrome.storage.local.set({privacy_blur_overlays: data});
  }

  async function restoreOverlays() {
    if (!persistOverlays) return;
    try {
      const {privacy_blur_overlays} = await chrome.storage.local.get(['privacy_blur_overlays']);
      if (privacy_blur_overlays && Array.isArray(privacy_blur_overlays)) {
        for (const o of privacy_blur_overlays) {
          createBlurOverlay(o.left, o.top, o.width, o.height, o.type, true, o.color);
        }
      }
    } catch (err) {}
  }

  function updateOverlaysStyle() {
    overlays.forEach(overlay => {
      if (overlay.el && overlay.type === 'backdrop-filter') {
        overlay.el.style.background = blurColor;
        overlay.color = blurColor;
      }
    });
    saveOverlays();
  }

  async function createBlurOverlay(left, top, width, height, type = 'auto', restoring = false, overlayColor = null) {
    ensureShadowHost();

    if (overlays.length >= 20) {
      announce("Overlay limit reached (20). Remove some overlays.", 3000);
      return;
    }

    const useColor = overlayColor || blurColor;

    let blurSupported = CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
    let useFallback = false;
    let overlayType = 'backdrop-filter';

    if (type !== 'auto') {
      overlayType = type;
      blurSupported = (type === 'backdrop-filter');
      useFallback = !blurSupported;
    } else {
      useFallback = !blurSupported;
    }

    const overlay = document.createElement('div');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('role', 'region');
    overlay.setAttribute('aria-label', 'Blurred area overlay');
    overlay.style.position = 'fixed';
    overlay.style.left = left + 'px';
    overlay.style.top = top + 'px';
    overlay.style.width = width + 'px';
    overlay.style.height = height + 'px';
    overlay.style.zIndex = '2147483647';
    overlay.style.borderRadius = '12px';
    overlay.style.boxShadow = '0 4px 32px rgba(0,0,0,0.14)';
    overlay.style.border = '1.5px solid rgba(255,255,255,0.06)';
    overlay.style.overflow = 'hidden';
    overlay.style.pointerEvents = 'none'; 
    overlay.style.transition = 'opacity 0.22s, transform 0.22s';
    overlay.style.opacity = '0';
    overlay.style.transform = 'scale(0.85)';

    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) overlay.style.transition = 'none';


    if (!useFallback) {
      overlay.style.backdropFilter = `blur(${blurRadius}px)`;
      overlay.style.webkitBackdropFilter = `blur(${blurRadius}px)`;
      overlay.style.background = useColor;
    } else {

      try {
        announce("Creating snapshot blur (fallback)...", 1800);
  
        const loadScript = () => new Promise((resolve, reject) => {
          if (window.html2canvas) return resolve();
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL('libs/html2canvas.min.js');
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        await loadScript();

        const canvas = await window.html2canvas(document.body, {
          x: left,
          y: top,
          width,
          height,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          useCORS: true,
          backgroundColor: null,
          logging: false
        });
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.filter = `blur(${blurRadius}px)`;
        img.style.pointerEvents = 'none'; 
        overlay.appendChild(img);
        overlay.style.background = useColor;
        overlayType = 'snapshot';
      } catch (err) {
     
        overlay.style.background = useColor;
        overlay.innerHTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          color:#fff;font-size:1em;text-align:center;">
          <span style="background:rgba(0,0,0,0.3);padding:6px 16px;border-radius:6px;">
            Blur not available on this page.<br>
            <button style="margin-top:6px;font-size:1em;border-radius:5px;border:none;background:#3A7BD5;color:#fff;padding:4px 12px;cursor:pointer;"
              aria-label="Retry with snapshot" tabindex="0" id="privacy-blur-retry">Retry with snapshot</button>
          </span>
        </div>`;
        overlayType = 'unavailable';
        const retryBtn = overlay.querySelector('#privacy-blur-retry');
        if (retryBtn) {
          retryBtn.style.pointerEvents = 'auto';
          retryBtn.onclick = (e) => {
            createBlurOverlay(left, top, width, height, 'snapshot');
            removeOverlay(overlays.length-1, false);
          };
        }
      }
    }

    
    const closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', 'Remove this blurred area');
    closeBtn.setAttribute('tabindex', '0');
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '8px';
    closeBtn.style.right = '8px';
    closeBtn.style.width = '28px';
    closeBtn.style.height = '28px';
    closeBtn.style.borderRadius = '50%';
    closeBtn.style.background = 'rgba(0,0,0,0.19)';
    closeBtn.style.border = 'none';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.boxShadow = '0 1px 7px rgba(0,0,0,0.12)';
    closeBtn.style.transition = 'background 0.13s, transform 0.13s';
    closeBtn.style.outline = 'none';
    closeBtn.style.pointerEvents = 'auto'; 
    closeBtn.style.zIndex = '2147483648'; 

    closeBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="8" fill="none"/>
      <path d="M5 5l6 6M11 5l-6 6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
    </svg>
    `;
    closeBtn.onmouseenter = () => closeBtn.style.background = 'rgba(58,123,213,0.37)';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'rgba(0,0,0,0.19)';
    closeBtn.onfocus = () => closeBtn.style.background = 'rgba(58,123,213,0.6)';
    closeBtn.onblur = () => closeBtn.style.background = 'rgba(0,0,0,0.19)';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      const idx = overlays.findIndex(o => o.el === overlay);
      if (idx !== -1) removeOverlay(idx);
      announce("Blurred area removed.");
    };

    overlay.appendChild(closeBtn);

    setTimeout(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'scale(1)';
    }, 10);

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const idx = overlays.findIndex(o => o.el === overlay);
        if (idx !== -1) removeOverlay(idx);
      }
    });

    shadowRoot.appendChild(overlay);
    overlays.push({
      el: overlay,
      left, top, width, height,
      type: overlayType,
      color: useColor
    });

    announce("Blur applied. Click × to remove or use Remove All in extension.", 2400);
    saveOverlays();
  }


  function startSelectionMode() {
    if (selectionActive) return;
    selectionActive = true;

    ensureShadowHost();

 
    selectionOverlay = document.createElement('div');
    selectionOverlay.setAttribute('id', 'privacy-blur-selection-overlay');
    selectionOverlay.style.position = 'fixed';
    selectionOverlay.style.left = '0';
    selectionOverlay.style.top = '0';
    selectionOverlay.style.width = '100vw';
    selectionOverlay.style.height = '100vh';
    selectionOverlay.style.zIndex = '2147483648';
    selectionOverlay.style.cursor = 'crosshair';
    selectionOverlay.style.background = 'rgba(58,123,213,0.07)';
    selectionOverlay.style.pointerEvents = 'auto';
    selectionOverlay.style.userSelect = 'none';

   
    tooltip = document.createElement('div');
    tooltip.setAttribute('id', 'privacy-blur-tooltip');
    tooltip.style.position = 'fixed';
    tooltip.style.top = '0';
    tooltip.style.left = '0';
    tooltip.style.zIndex = '2147483649';
    tooltip.style.background = 'rgba(42,78,154,0.92)';
    tooltip.style.color = '#fff';
    tooltip.style.fontSize = '1em';
    tooltip.style.padding = '6px 14px';
    tooltip.style.borderRadius = '7px';
    tooltip.style.boxShadow = '0 2px 12px rgba(0,0,0,0.11)';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.transition = 'opacity 0.18s';
    tooltip.textContent = "Drag to select — Esc to cancel";

    shadowRoot.appendChild(selectionOverlay);
    shadowRoot.appendChild(tooltip);

    let rect = null;
    let dragRect = null;

 
    function onMouseDown(e) {
      if (e.button !== 0) return;
      startPoint = {x: e.clientX, y: e.clientY};
      dragRect = document.createElement('div');
      dragRect.style.position = 'fixed';
      dragRect.style.border = '2.5px dashed #3A7BD5';
      dragRect.style.borderRadius = '12px';
      dragRect.style.background = 'rgba(58,123,213,0.09)';
      dragRect.style.zIndex = '2147483650';
      dragRect.style.pointerEvents = 'none';
      shadowRoot.appendChild(dragRect);
      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);
    }

    function onMouseMove(e) {
      if (!startPoint || !dragRect) return;
      let x = Math.min(e.clientX, startPoint.x);
      let y = Math.min(e.clientY, startPoint.y);
      let w = Math.abs(e.clientX - startPoint.x);
      let h = Math.abs(e.clientY - startPoint.y);
      dragRect.style.left = x + 'px';
      dragRect.style.top = y + 'px';
      dragRect.style.width = w + 'px';
      dragRect.style.height = h + 'px';
      // Move tooltip near cursor
      tooltip.style.left = (e.clientX + 16) + 'px';
      tooltip.style.top = (e.clientY + 16) + 'px';
    }

    function onMouseUp(e) {
      if (!startPoint || !dragRect) return;
      let x = Math.min(e.clientX, startPoint.x);
      let y = Math.min(e.clientY, startPoint.y);
      let w = Math.abs(e.clientX - startPoint.x);
      let h = Math.abs(e.clientY - startPoint.y);
      dragRect.parentNode.removeChild(dragRect);
      rect = {left: x, top: y, width: w, height: h};
      cleanupSelection();
      if (w < 18 || h < 18) {
        announce("Selection too small. Try again.", 2000);
        return;
      }
      createBlurOverlay(rect.left, rect.top, rect.width, rect.height);
    }

    function cleanupSelection() {
      selectionActive = false;
      if (selectionOverlay && selectionOverlay.parentNode) selectionOverlay.parentNode.removeChild(selectionOverlay);
      if (tooltip && tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
      document.removeEventListener('keydown', onKeyDown, true);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
    
        announce("Selection cancelled.", 1800);
        cleanupSelection();
      }
    }

    selectionOverlay.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);

    announce("Selection started. Drag to select. Esc to cancel.", 1800);
  }


  function cleanupOnUnload() {
    removeAllOverlays();
    if (shadowHost && shadowHost.parentNode) shadowHost.parentNode.removeChild(shadowHost);
    shadowHost = null;
    shadowRoot = null;
    overlays = [];
    selectionActive = false;
    startPoint = null;
    ariaLiveDiv = null;
    if (toastTimeout) clearTimeout(toastTimeout);
  }
  window.addEventListener('beforeunload', cleanupOnUnload);
  window.addEventListener('pagehide', cleanupOnUnload);

  function isSupportedPage() {
    const url = window.location.href;
 
    return !(url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('https://chrome.google.com/webstore'));
  }


  window.addEventListener('message', async (e) => {
    if (!e.data) return;
    if (e.data.privacy_blur_screen__start_selection) {
      if (!isSupportedPage()) {
        announce("Cannot run Privacy_Blur_screen on this page (system/webstore).", 3500);
        return;
      }
      await loadPrefs();
      startSelectionMode();
    }
    if (e.data.privacy_blur_screen__remove_all) {
      removeAllOverlays();
    }
    if (e.data.privacy_blur_screen__update_settings) {
      await loadPrefs();
      updateOverlaysStyle();
      announce("Color settings updated for existing overlays.", 2000);
    }
  }, false);


  (async () => {
    await loadPrefs();
    await restoreOverlays();
  })();

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      let needsUpdate = false;
      
      if (changes.privacy_blur_color) {
        needsUpdate = true;
      }
      
      if (changes.privacy_blur_density) {
        blurDensity = changes.privacy_blur_density.newValue || 13;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        loadPrefs().then(() => {
          updateOverlaysStyle();
        });
      }
    }
  });

  window.PrivacyBlurScreen = {
    startSelectionMode,
    removeAllOverlays,
    overlays
  };
})();
