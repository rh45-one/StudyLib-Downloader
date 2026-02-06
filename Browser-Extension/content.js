// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "findDocumentUrl") {
      findAndSendDocumentUrl();
      return true;
    }
  });
  
  // Function to find document URL using various methods
  function findAndSendDocumentUrl() {
    // Show a status indicator
    showStatusOverlay("Searching for document...");
    
    // Method 1: Direct search for iframe
    const iframes = Array.from(document.querySelectorAll('iframe'));
    const iframe = iframes.find(iframe => iframe.src && iframe.src.includes('viewer_next/web/study'));
    
    if (iframe && iframe.src) {
      sendDocumentUrl(iframe.src);
      return;
    }
    
    // Method 2: Search for #document pattern
    const html = document.documentElement.outerHTML;
    const docMatch = html.match(/#document\(['"]([^'"]+)['"]\)/);
    
    if (docMatch && docMatch[1]) {
      sendDocumentUrl(docMatch[1]);
      return;
    }
    
    // Method 3: Search in scripts
    const scripts = document.querySelectorAll('script:not([src])');
    for (const script of scripts) {
      const docMatch = script.textContent.match(/#document\(['"]([^'"]+)['"]\)/);
      if (docMatch && docMatch[1]) {
        sendDocumentUrl(docMatch[1]);
        return;
      }
    }
    
    // Method 4: Try to find in JS variables
    try {
      for (const key in window) {
        if (typeof window[key] === 'string' && 
            window[key].includes('viewer_next/web/study')) {
          sendDocumentUrl(window[key]);
          return;
        }
      }
    } catch (e) { }
    
    // Method 5: Search for studylib.es preconnect link
    // On studylib.es, the PDF URL is stored in a preconnect link tag
    const links = document.querySelectorAll('link[rel="preconnect"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && href.includes('studylib.es') && href.includes('.pdf')) {
        // Direct download for studylib.es
        downloadDirectPdf(href);
        return;
      }
    }
    
    // No document URL found
    updateStatusOverlay("No document URL found. Try refreshing the page.", "error");
    setTimeout(removeStatusOverlay, 3000);
  }
  
  // Download a PDF file directly (used for studylib.es)
  function downloadDirectPdf(url) {
    updateStatusOverlay(`PDF found! Starting download...`, "success");
    
    // Send message to background script to handle download
    chrome.runtime.sendMessage({
      action: "downloadDirectPdf",
      pdfUrl: url
    }, (response) => {
      if (response && response.status === "processing") {
        updateStatusOverlay("Download initiated! Check your downloads folder.", "success");
        setTimeout(removeStatusOverlay, 3000);
      }
    });
  }
  
  // Send document URL to background script
  function sendDocumentUrl(url) {
    updateStatusOverlay(`Document URL found! Initiating download...`, "success");
    
    chrome.runtime.sendMessage({
      action: "downloadDocument",
      documentUrl: url
    }, (response) => {
      if (response && response.status === "processing") {
        setTimeout(removeStatusOverlay, 2000);
      }
    });
  }
  
  // UI Helper Functions
  function showStatusOverlay(message) {
    // Remove any existing overlay
    removeStatusOverlay();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'studylib-downloader-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #333;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 9999;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      max-width: 300px;
    `;
    
    const statusText = document.createElement('p');
    statusText.id = 'studylib-status-text';
    statusText.textContent = message;
    
    overlay.appendChild(statusText);
    document.body.appendChild(overlay);
  }
  
  function updateStatusOverlay(message, type) {
    const statusText = document.getElementById('studylib-status-text');
    if (statusText) {
      statusText.textContent = message;
      
      const overlay = document.getElementById('studylib-downloader-overlay');
      if (overlay) {
        if (type === "error") {
          overlay.style.backgroundColor = "#c0392b";
        } else if (type === "success") {
          overlay.style.backgroundColor = "#27ae60";
        }
      }
    }
  }
  
  function removeStatusOverlay() {
    const overlay = document.getElementById('studylib-downloader-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
  
  // Auto-detect StudyLib document pages and offer download (optional)
  if (window.location.href.includes('studylib') && 
      document.title.includes('Document') || document.title.includes('PDF')) {
    setTimeout(() => {
      findAndSendDocumentUrl();
    }, 1500);
  }