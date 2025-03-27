document.addEventListener('DOMContentLoaded', function() {
    const downloadBtn = document.getElementById('download-btn');
    
    downloadBtn.addEventListener('click', function() {
      downloadBtn.textContent = 'Processing...';
      downloadBtn.disabled = true;
      
      chrome.runtime.sendMessage({
        action: "analyzeCurrentPage"
      }, function(response) {
        if (response && response.status === "analyzing") {
          // Close popup after initiating the process
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          downloadBtn.textContent = 'Error';
          downloadBtn.disabled = false;
        }
      });
    });
    
    // Check if we're on a StudyLib site
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const url = tabs[0].url;
      if (!url.includes('studylib')) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Not a StudyLib page';
        document.querySelector('.instructions').innerHTML = 
          '<p>This extension only works on StudyLib pages.</p>' +
          '<p>Please navigate to a StudyLib document first.</p>';
      }
    });
  });