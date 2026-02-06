// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "downloadDocument") {
      // Navigate to the document URL
      chrome.tabs.create({ url: message.documentUrl }, (tab) => {
        // After the tab is created, wait for it to load, then execute download script
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            // Remove the listener to avoid multiple executions
            chrome.tabs.onUpdated.removeListener(listener);
            
            // Execute script to click download button
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: clickDownloadButton
            });
          }
        });
      });
      
      sendResponse({ status: "processing" });
      return true;
    }
    
    if (message.action === "downloadDirectPdf") {
      // Handle direct PDF download for studylib.es
      const filename = message.pdfUrl.split('/').pop().split('?')[0] || 'studylib-document.pdf';
      
      chrome.downloads.download({
        url: message.pdfUrl,
        filename: filename,
        saveAs: false
      }, (downloadId) => {
        if (downloadId) {
          sendResponse({ status: "processing" });
        }
      });
      
      return true;
    }
    
    if (message.action === "analyzeCurrentPage") {
      // Tell the content script to analyze the current page
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "findDocumentUrl" });
      });
      sendResponse({ status: "analyzing" });
      return true;
    }
  });
  
  // Function to click the download button in the document viewer page
  function clickDownloadButton() {
    // Wait for the download button to appear
    const checkButton = setInterval(() => {
      const downloadBtn = document.getElementById("download");
      if (downloadBtn) {
        clearInterval(checkButton);
        downloadBtn.click();
        
        // Add visual feedback
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #4CAF50;
          color: white;
          padding: 16px;
          border-radius: 4px;
          z-index: 9999;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        `;
        notification.textContent = "Download initiated!";
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.remove();
        }, 3000);
      }
    }, 500);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkButton);
    }, 10000);
  }