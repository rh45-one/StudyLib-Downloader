/**
 * This script controls the extension popup UI, validates if the current page 
 * is a StudyLib document, and initiates the download process.
 */

document.addEventListener('DOMContentLoaded', function() {
    const downloadBtn = document.getElementById('download-btn');
    
    // Set up click handler for the download button
    downloadBtn.addEventListener('click', function() {
      downloadBtn.textContent = 'Processing...';
      downloadBtn.disabled = true;
      
      // Send message to the background script to analyze the current page
      // This will trigger the content script to look for document URLs
      chrome.runtime.sendMessage({
        action: "analyzeCurrentPage"
      }, function(response) {
        if (response && response.status === "analyzing") {
          // Close popup after initiating the process to get out of user's way
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // Restore button state if there was an error
          downloadBtn.textContent = 'Error';
          downloadBtn.disabled = false;
        }
      });
    });
    
    // Validate that we're on a StudyLib site before enabling the download button
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const url = tabs[0].url;
      if (!url.includes('studylib')) {
        // Disable the button and show a helpful message when not on StudyLib
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Not a StudyLib page';
        document.querySelector('.instructions').innerHTML = 
          '<p>This extension only works on StudyLib pages.</p>' +
          '<p>Please navigate to a StudyLib document first.</p>';
      }
    });
  });