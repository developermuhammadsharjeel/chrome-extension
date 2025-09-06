# Privacy_Blur_screen

## Overview

**Privacy_Blur_screen** is a Chrome Extension that lets you instantly blur any rectangular region on any web page by simply selecting it. Great for privacy, presentations, or content screenshots. Multiple overlays, beautiful design, robust error handling, no data leaves your browser.

---

## Features

- **Select Blur Area:** Draw a rectangle anywhere on the page to blur that area.
- **Remove All Blurred_Area:** Instantly remove all overlays.
- **Multiple overlays:** Each overlay is independent, can be closed.
- **Beautiful design:** Modern gradients, glassmorphism, soft shadows.
- **Accessibility:** Keyboard, ARIA, tooltips, live status.
- **Fallbacks:** If CSS blur unsupported, uses snapshot (html2canvas) or clear fallback.
- **Persistence:** Optional overlay persistence on SPA navigation/reload.
- **Settings:** Blur radius, max overlays, persistence toggle.
- **Keyboard shortcut:** Alt+Shift+B opens selection.
- **No data leaves your browser.**

---

## Install / Build / Load

1. **Clone or download this repo**.

2. **Add icons:**
   - Place PNG icon files in `/icons`. (16x16, 48x48, 128x128). You can use any gradient logo.

3. **Vendor html2canvas:**
   - Download [html2canvas.min.js](https://github.com/niklasvh/html2canvas/releases/download/v1.4.1/html2canvas.min.js) and place it in `/libs`.

4. **Load extension in Chrome:**
   - Go to `chrome://extensions`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the extension's root directory.

5. **Usage:**
   - Click the toolbar icon.
   - Use "Select Blur Area" to enter selection mode.
   - Drag to select region on the page.
   - Each region blurs instantly. Click × to remove.
   - "Remove All Blurred_Area" in popup deletes all overlays.

---

## Packaging (.crx)

1. Run `zip -r Privacy_Blur_screen.zip .` in the extension directory.
2. Use Chrome's extension packer (or `chrome-cli`) to package as .crx if needed.

---

## Development

- All logic is client-side, modularized for easy edits.
- Popup UI: `popup.html`, `popup.css`, `popup.js`
- Background: `service_worker.js`
- In-page: `content_script.js`
- Libraries: `/libs/`
- Icons: `/icons/`
- Shadow DOM isolates all overlay styles.

---

## Manual QA / Test Checklist

- [ ] Install unpacked extension.
- [ ] Open example web page, click "Select Blur Area", drag region.
- [ ] Create, then remove single overlay (× button).
- [ ] Click "Remove All Blurred_Area" to clear overlays.
- [ ] Try on pages with fixed elements, zoom, transforms.
- [ ] Keyboard navigation to all popup and overlay buttons.
- [ ] Test on pages with iframes (cross-origin: verify error message).
- [ ] Test on Chrome internal pages (chrome://, webstore, file://) — friendly error shown.
- [ ] Create 20 overlays, verify performance and overlay limit message.
- [ ] Test fallback: disable backdrop-filter in DevTools, verify snapshot fallback.
- [ ] Accessibility: all buttons are focusable, ARIA labels present.
- [ ] Reduced motion: set system reduced motion, verify fewer animations.

---

## Example Screenshots

- ![Popup UI](screenshots/popup_example.png)
- ![Blurred overlays](screenshots/blur_overlay_example.png)

---

## Limitations

- **Cannot run** on `chrome://`, browser internal pages, or Chrome Web Store.
- **Selection inside cross-origin iframes** is not possible (browser security).
- **Backdrop-filter** is not supported on all browsers/sites. Fallbacks are used, but some pages may block snapshotting (CORS, WebGL, CSP).
- **Overlay persistence** works best on SPA pages. If DOM layout changes, overlays may not match. User is informed.
- **No remote server calls** — all processing is local.

---

## Changelog

- **v1.0.0** — Initial release.

---

## Security & Privacy

- No page data or screenshots ever leave your browser.
- All overlays and settings stored only locally (`chrome.storage.local`).

---

## Dev Notes

- To change default blur radius, max overlays, or enable persistence, use popup settings.
- All async Chrome API calls and DOM ops are wrapped for robust error handling.
- Shadow DOM used for overlays: no style clashes.
- Fully keyboard accessible, ARIA live status.

---

## Credits

- [html2canvas](https://github.com/niklasvh/html2canvas) (vendored for snapshot fallback).