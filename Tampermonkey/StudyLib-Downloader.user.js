// ==UserScript==
// @name         StudyLib Downloader
// @namespace    https://github.com/rh45-one/StudyLib-Downloader
// @version      1.0.0
// @description  Download documents from StudyLib easily
// @author       rh45-one
// @match        https://*.studylib.net/*
// @match        https://*.studylib.com/*
// @match        https://*.studylib.es/*
// @match        https://*.studylib.fr/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=studylib.net
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
    
    /**
     * SECTION 1: STYLES
     * Define CSS styles for UI elements including the download button and status overlay
     */
    GM_addStyle(`
        #studylib-downloader-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #3D4A63;
            color: white;
            padding: 12px 18px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            z-index: 9999;
            font-family: 'Roboto', Arial, sans-serif;
        }
        
        #studylib-downloader-button:hover {
            background-color: #4d5a73;
            transform: translateY(-2px);
            box-shadow: 0 6px 10px rgba(0,0,0,0.25);
        }
        
        #studylib-downloader-overlay {
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
        }
    `);
    
    /**
     * SECTION 2: UI CREATION
     * Functions to create and manage UI elements
     */
    
    /**
     * Creates and adds the main download button to StudyLib document pages
     * This button initiates the document search and download process
     */
    function addDownloadButton() {
        const button = document.createElement('button');
        button.id = 'studylib-downloader-button';
        button.innerHTML = 'Download Document';
        button.addEventListener('click', findAndProcessDocumentUrl);
        document.body.appendChild(button);
    }
    
    /**
     * SECTION 3: DOCUMENT DETECTION
     * Functions to find and process the document URL
     */
    
    /**
     * Main function that searches for the document URL using multiple methods:
     * 1. Look for iframes containing the viewer URL
     * 2. Search for #document pattern in HTML
     * 3. Look in script tags
     * 4. Scan JS variables
     */
    function findAndProcessDocumentUrl() {
        showStatusOverlay("Searching for document...");
        
        // Method 1: Direct search for iframe
        // StudyLib often embeds the document in an iframe with a specific URL pattern
        const iframes = Array.from(document.querySelectorAll('iframe'));
        const iframe = iframes.find(iframe => iframe.src && iframe.src.includes('viewer_next/web/study'));
        
        if (iframe && iframe.src) {
            processDocumentUrl(iframe.src);
            return;
        }
        
        // Method 2: Search for #document pattern
        // Sometimes the document URL is referenced in a #document function call
        const html = document.documentElement.outerHTML;
        const docMatch = html.match(/#document\(['"]([^'"]+)['"]\)/);
        
        if (docMatch && docMatch[1]) {
            processDocumentUrl(docMatch[1]);
            return;
        }
        
        // Method 3: Search in scripts
        // The URL might be hidden in inline script tags
        const scripts = document.querySelectorAll('script:not([src])');
        for (const script of scripts) {
            const docMatch = script.textContent.match(/#document\(['"]([^'"]+)['"]\)/);
            if (docMatch && docMatch[1]) {
                processDocumentUrl(docMatch[1]);
                return;
            }
        }
        
        // Method 4: Try to find in JS variables
        // Last resort - scan global variables for the URL pattern
        try {
            for (const key in window) {
                if (typeof window[key] === 'string' && 
                    window[key].includes('viewer_next/web/study')) {
                    processDocumentUrl(window[key]);
                    return;
                }
            }
        } catch (e) { 
            // Silently catch errors - some properties might not be accessible
        }
        
        // No document URL found after trying all methods
        updateStatusOverlay("No document URL found. Try refreshing the page.", "error");
        setTimeout(removeStatusOverlay, 3000);
    }
    
    /**
     * Process the found document URL by opening it in a new tab
     * and providing appropriate feedback to the user
     * 
     * @param {string} url - The document viewer URL to open
     */
    function processDocumentUrl(url) {
        updateStatusOverlay(`Document URL found! Opening document viewer...`, "success");
        
        // Open the document URL in a new tab
        const newTab = window.open(url, '_blank');
        
        // Check if the new tab was successfully opened
        if (newTab) {
            // If successful, provide instructions for the next step
            updateStatusOverlay("Document viewer opened in new tab. Click the download button there.", "success");
        } else {
            // If popup was blocked, provide a clickable link instead
            updateStatusOverlay("Popup blocked. Click here to open document viewer.", "error");
            
            // Make the overlay clickable to open the URL
            const overlay = document.getElementById('studylib-downloader-overlay');
            if (overlay) {
                overlay.style.cursor = 'pointer';
                overlay.onclick = function() {
                    window.open(url, '_blank');
                };
            }
        }
        
        // Remove the status overlay after a delay
        setTimeout(removeStatusOverlay, 5000);
    }
    
    /**
     * SECTION 4: UI FEEDBACK
     * Helper functions to show status messages and notifications
     */
    
    /**
     * Creates and displays a status overlay with the given message
     * 
     * @param {string} message - The message to display in the overlay
     */
    function showStatusOverlay(message) {
        // Remove any existing overlay first
        removeStatusOverlay();
        
        // Create the overlay container
        const overlay = document.createElement('div');
        overlay.id = 'studylib-downloader-overlay';
        
        // Add the message text
        const statusText = document.createElement('p');
        statusText.id = 'studylib-status-text';
        statusText.textContent = message;
        statusText.style.margin = '0';
        
        // Add to the page
        overlay.appendChild(statusText);
        document.body.appendChild(overlay);
    }
    
    /**
     * Updates an existing status overlay with a new message and type
     * 
     * @param {string} message - The new message to display
     * @param {string} type - Message type ("error" or "success") to determine color
     */
    function updateStatusOverlay(message, type) {
        const statusText = document.getElementById('studylib-status-text');
        if (statusText) {
            statusText.textContent = message;
            
            // Change background color based on message type
            const overlay = document.getElementById('studylib-downloader-overlay');
            if (overlay) {
                if (type === "error") {
                    overlay.style.backgroundColor = "#c0392b"; // Red for errors
                } else if (type === "success") {
                    overlay.style.backgroundColor = "#27ae60"; // Green for success
                }
            }
        }
    }
    
    /**
     * Removes the status overlay from the page
     */
    function removeStatusOverlay() {
        const overlay = document.getElementById('studylib-downloader-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    /**
     * SECTION 5: PAGE-SPECIFIC BEHAVIOR
     * Different behavior based on which page we're on
     */
    
    // If we're on a document viewer page, add a custom download button
    if (window.location.href.includes('viewer_next/web/study')) {
        setTimeout(() => {
            // Create custom download button for the viewer page
            const customDownloadBtn = document.createElement('button');
            customDownloadBtn.id = 'studylib-custom-download-button';
            customDownloadBtn.innerHTML = 'Download Document';
            customDownloadBtn.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #3D4A63;
                color: white;
                padding: 12px 18px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                z-index: 9999;
                font-family: 'Roboto', Arial, sans-serif;
            `;
            
            // Add hover effects to make the button more interactive
            customDownloadBtn.addEventListener('mouseover', () => {
                customDownloadBtn.style.backgroundColor = '#4d5a73';
                customDownloadBtn.style.transform = 'translateY(-2px)';
                customDownloadBtn.style.boxShadow = '0 6px 10px rgba(0,0,0,0.25)';
            });
            
            customDownloadBtn.addEventListener('mouseout', () => {
                customDownloadBtn.style.backgroundColor = '#3D4A63';
                customDownloadBtn.style.transform = 'translateY(0)';
                customDownloadBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';
            });
            
            // When the button is clicked, find and click the actual download button
            customDownloadBtn.addEventListener('click', () => {
                // Look for StudyLib's native download button
                const downloadBtn = document.getElementById("download");
                if (downloadBtn) {
                    // If found, click it to initiate the download
                    downloadBtn.click();
                    
                    // Show a success notification
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
                        font-family: Arial, sans-serif;
                    `;
                    notification.textContent = "Download initiated!";
                    document.body.appendChild(notification);
                    
                    // Remove notification after a delay
                    setTimeout(() => {
                        notification.remove();
                    }, 3000);
                } else {
                    // If the download button can't be found, show an error
                    const notification = document.createElement('div');
                    notification.style.cssText = `
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background-color: #c0392b;
                        color: white;
                        padding: 16px;
                        border-radius: 4px;
                        z-index: 9999;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                        font-family: Arial, sans-serif;
                    `;
                    notification.textContent = "Download button not found. Try reloading the page.";
                    document.body.appendChild(notification);
                    
                    // Remove notification after a delay
                    setTimeout(() => {
                        notification.remove();
                    }, 3000);
                }
            });
            
            // Add the button to the page
            document.body.appendChild(customDownloadBtn);
        }, 2000); // Delay to ensure page is fully loaded
    } 
    // If we're on a regular StudyLib document page (but not the viewer itself)
    else if (window.location.href.includes('studylib') && 
             (document.title.includes('Document') || document.title.includes('PDF'))) {
        // Add the initial download button that will search for and open the document
        setTimeout(addDownloadButton, 1500);
    }
})();