#!/bin/bash

# =======================================================================
# StudyLib Document Downloader
# =======================================================================
#
# This script helps download documents from StudyLib websites by:
#   1. Creating a temporary environment with Puppeteer
#   2. Navigating to the StudyLib page
#   3. Finding the actual document URL using multiple strategies
#   4. Automatically clicking the download button
#
# For educational purposes only. Always respect copyright laws.
# =======================================================================

# Check if a URL was provided as an argument
if [ $# -eq 0 ]; then
    echo "Usage: $0 <URL>"
    echo "Example: $0 https://studylib.net/doc/12345678"
    exit 1
fi

URL="$1"

# Create a temporary directory for our work
# This keeps everything clean and self-contained
TEMP_DIR=$(mktemp -d)
echo "Setting up temporary environment in: $TEMP_DIR"
cd "$TEMP_DIR"

# Create package.json for the Node.js dependencies
# Puppeteer is a headless browser that allows us to simulate user actions
cat > package.json << 'EOL'
{
  "dependencies": {
    "puppeteer": "^20.0.0"
  },
  "type": "module"
}
EOL

# Create the actual scraper script that does the magic
# This is where we define our document extraction strategies
echo "Creating scraper script..."
cat > studylib-scraper.js << 'EOL'
import puppeteer from 'puppeteer';

const url = process.argv[2];

async function scrape() {
  // Launch a headless browser
  // The arguments disable sandbox for compatibility with some environments
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Use a standard desktop user agent to avoid being detected as a bot
    // StudyLib might block or behave differently with non-standard user agents
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
    
    // Navigate to the StudyLib page
    // We use a longer timeout since StudyLib can be slow to load sometimes
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
    
    // Wait a bit more to ensure JavaScript fully executes
    // This is important as StudyLib loads content dynamically
    await page.waitForTimeout(2000);
    
    // ===== DETECTION METHOD 1 =====
    // Look for iframes that contain the document viewer
    // This is the most common way StudyLib embeds documents
    console.log("Searching for document iframe...");
    const studylibUrl = await page.evaluate(() => {
      const iframe = Array.from(document.querySelectorAll('iframe'))
        .find(iframe => iframe.src && iframe.src.includes('viewer_next/web/study'));
      return iframe ? iframe.src : null;
    });
    
    // ===== DETECTION METHOD 2 =====
    // Search for the #document function call pattern in the page source
    // StudyLib often uses this pattern to load documents
    console.log("Searching for document pattern in page source...");
    const documentPattern = await page.evaluate(() => {
      // Search in the entire page source
      const html = document.documentElement.outerHTML;
      const docMatch = html.match(/#document\(['"]([^'"]+)['"]\)/);
      if (docMatch) return docMatch[1];
      
      // If not found in HTML, check all inline scripts
      // Sometimes the URL is only in specific script tags
      for (const script of document.querySelectorAll('script:not([src])')) {
        const docMatch = script.textContent.match(/#document\(['"]([^'"]+)['"]\)/);
        if (docMatch) return docMatch[1];
      }
      
      // Last resort: try to find it in window variables
      // This is a bit hacky but sometimes works when other methods fail
      try {
        for (const key in window) {
          if (typeof window[key] === 'string' && 
              window[key].includes('viewer_next/web/study')) {
            return window[key];
          }
        }
      } catch (e) {} // Silently fail if this causes any errors
      
      return null;
    });
    
    // Determine which URL to use based on our findings
    let documentUrl = null;
    
    if (studylibUrl) {
      console.log("Found StudyLib document URL in iframe:");
      console.log(studylibUrl);
      documentUrl = studylibUrl;
    }
    
    if (documentPattern) {
      console.log("\nFound URL in #document pattern:");
      console.log(documentPattern);
      if (!documentUrl) documentUrl = documentPattern;
    }
    
    // ===== DETECTION METHOD 3 =====
    // If we still don't have a URL, monitor network requests
    // This can catch document URLs that are loaded via AJAX or other means
    if (!documentUrl) {
      console.log("\nPrevious methods failed. Checking network requests for document URLs...");
      const documentUrls = [];
      
      // Listen for any requests that match our document pattern
      page.on('request', request => {
        const reqUrl = request.url();
        if (reqUrl.includes('viewer_next/web/study')) {
          documentUrls.push(reqUrl);
          console.log("Found in network request:", reqUrl);
        }
      });
      
      // Refresh the page to trigger new requests
      // This often reveals the document URL in network traffic
      console.log("Refreshing page to capture network requests...");
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);
      
      if (documentUrls.length > 0) {
        documentUrl = documentUrls[0];
      }
    }
    
    // If we found a document URL, navigate to it and download
    if (documentUrl) {
      console.log("\nSuccess! Navigating to document URL to download...");
      
      // Navigate to the document viewer
      await page.goto(documentUrl, { waitUntil: 'networkidle0', timeout: 90000 });
      
      // Wait for the viewer to fully load
      // The download button might not be immediately available
      await page.waitForTimeout(3000);
      
      // Find and click the download button
      console.log("Looking for download button...");
      const downloadResult = await page.evaluate(() => {
        const downloadBtn = document.getElementById("download");
        if (downloadBtn) {
          // Found it! Click to start download
          downloadBtn.click();
          return "Download button clicked successfully";
        } else {
          return "Download button not found - the page layout might have changed";
        }
      });
      
      console.log(downloadResult);
      
      // Wait for download to initialize
      // This gives the browser time to process the download request
      await page.waitForTimeout(5000);
      
      console.log("Download initiated. Please check your downloads folder.");
      console.log("Note: On Linux, downloads might go to ~/Downloads or your home directory.");
    } else {
      // We couldn't find the document URL using any method
      console.log("No document URL found. This could be because:");
      console.log("- The URL doesn't contain a valid StudyLib document");
      console.log("- StudyLib has changed their document embedding method");
      console.log("- The document requires login or special access");
    }

  } catch (error) {
    console.error("Error during scraping:", error);
    console.log("Tip: If you're seeing timeout errors, try running the script again");
  } finally {
    // Always close the browser to prevent memory leaks
    await browser.close();
    console.log("Browser closed.");
  }
}

// Run the scraper function
scrape();
EOL

# Install required Node.js dependencies
# This might take a minute the first time you run it
echo "Installing dependencies (this might take a moment)..."
npm install --quiet

# Execute the script with the provided URL
echo "Starting document extraction from: $URL"
echo "----------------------------------------"
node studylib-scraper.js "$URL"
echo "----------------------------------------"

# Clean up after ourselves by returning to original directory
# and removing the temporary folder
echo "Cleaning up temporary files..."
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo "Process complete!"
echo "If download was successful, check your downloads folder for the document."