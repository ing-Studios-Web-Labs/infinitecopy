// Global variable to store the current filter state
// Can be 'all', 'text', or 'image'

let currentFilter = 'all';
let storageMode = chrome.storage.sync;
let imageStorageState;

async function retrieveTheme(getValue = false) {
    const storageKey = "extensionTheme";
    const result = await storageMode.get(storageKey);
    let themeColor = result[storageKey] || [];
    if (getValue === true) {
        console.log('getValue === true!');
        return themeColor;
    } else {
        console.log('getValue === false!');
        try {
            const root = document.documentElement;
            root.style.setProperty('--primary-color', themeColor[0]);
            root.style.setProperty('--primary-light', themeColor[1]);
            root.style.setProperty('--primary-dark', themeColor[2]);
            root.style.setProperty('--primary-darkest', themeColor[3]);
            root.style.setProperty('--secondary-color', themeColor[4]);
            root.style.setProperty('--background-color', themeColor[5]);
            root.style.setProperty('--accent-color', themeColor[6]);
            console.log('Primary color changed to:', themeColor[0]);
        } catch (error) {
            console.error("Error fetching array:", error);
        }
    }
}

/**
 * Filters and displays copied items based on the currentFilter.
 */

function isValidUrl(urlString) {
    try {
        new URL(urlString);
        return true;
    } catch (e) {
        return false;
    }
}

// --- MODIFIED: togglePinStatus to re-insert based on timestamp ---
async function togglePinStatus(originalIndex) {
    console.log('Toggling pin status for item at original index:', originalIndex);

    try {
        const data = await storageMode.get('copiedItems');
        let copiedItems = data.copiedItems || [];

        // --- CRITICAL FIX START ---
        // Step 1: Ensure all items have an 'id'. This handles old data formats.
        copiedItems = copiedItems.map(item => {
            if (item && typeof item === 'object' && item.value !== undefined && item.timestamp !== undefined && item.id === undefined) {
                // If 'id' is missing, assign a new one.
                // Using item.timestamp or Date.now() for the base, plus a random suffix for uniqueness.
                return { ...item, id: `${item.timestamp || Date.now()}_${Math.random().toString(36).substring(2, 8)}` };
            }
            return item; // Return item as is if it's already good or null/undefined (to be filtered later)
        });

        // Step 2: Now, filter out any truly invalid or malformed items *after* attempting to add an 'id'.
        copiedItems = copiedItems.filter(item =>
            item && typeof item === 'object' &&
            item.value !== undefined &&
            item.timestamp !== undefined &&
            item.id !== undefined // Ensure it has an ID after the map operation
        );
        // --- CRITICAL FIX END ---

        // Log the state of copiedItems after normalization and filtering for debugging
        console.log('copiedItems after normalization and filtering:', copiedItems);

        if (originalIndex < 0 || originalIndex >= copiedItems.length) {
            console.error('Invalid index provided for toggling pin status. Current copiedItems.length:', copiedItems.length, 'Original index requested:', originalIndex);
            showAlert('Error: Invalid item index. The list might have changed.');
            throw new Error('Invalid index');
        }

        const itemToToggle = copiedItems[originalIndex];
        const isCurrentlyPinned = itemToToggle.isPinned;

        // Update the pin status
        itemToToggle.isPinned = !isCurrentlyPinned;

        // Remove the item from its current position
        copiedItems.splice(originalIndex, 1);

        if (itemToToggle.isPinned) {
            // If pinning, add it to the beginning of the array
            copiedItems.unshift(itemToToggle);
            showAlert('Item successfully pinned!');
        } else {
            // If unpinning, re-insert it into its chronological position among unpinned items.
            const currentPinnedItems = copiedItems.filter(item => item.isPinned);
            let currentUnpinnedItems = copiedItems.filter(item => !item.isPinned);

            // Add the itemToToggle (now unpinned) to the unpinned array
            currentUnpinnedItems.push(itemToToggle);

            // Sort the unpinned items by timestamp to maintain chronological order
            currentUnpinnedItems.sort((a, b) => b.timestamp - a.timestamp); // Newest first for unpinned

            // Recombine the arrays: pinned items first, then chronologically sorted unpinned items
            copiedItems = currentPinnedItems.concat(currentUnpinnedItems);
            showAlert('Item successfully unpinned!');
        }

        // <<< CRITICAL FIX from previous round: AWAIT the storage.sync.set call
        await storageMode.set({ 'copiedItems': copiedItems });
        console.log('Item pin status toggled and storage updated.');

        // Re-render the list in the popup UI
        checkCopiedItems();
        updateStorage();

        // <<< CRITICAL FIX from previous round: Send message to background script *only once* and *after* storage is updated
        chrome.runtime.sendMessage({ action: "refreshPasteSubmenus" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message to background to refresh menus:", chrome.runtime.lastError.message);
            } else {
                console.log("Background response for menu refresh:", response);
            }
        });

        return true; // Resolve the async function successfully

    } catch (error) {
        console.error('Error during pin status toggle:', error);
        showAlert('An error occurred during pin status toggle.');
        return false; // Indicate failure for the async function
    }
}

async function checkStorageMode() {
    const data = await chrome.storage.local.get('storageMode');
    // Check for the *string value* of the mode preference
    if (data.storageMode === 'sync') { // Assuming you save "sync" or "local" as strings
        console.log('Storage mode is valid: sync');
        storageMode = chrome.storage.sync; // Assign the actual storageMode object
    } else if (data.storageMode === 'local') { // Explicitly check for "local"
        console.log('Storage mode is valid: local');
        storageMode = chrome.storage.local; // Assign the actual chrome.storage.local object
    } else {
        // If not set or invalid, default to 'sync' (or 'local', align with your log)
        console.log('Mode is not set or has an unexpected value. Defaulting to sync.');
        storageMode = chrome.storage.sync;
        // Optionally, save this default preference for next time
        await chrome.storage.local.set({ 'storageMode': 'sync' }); 
    }
}

function checkCopiedItems() {
    const copied_items_div = document.getElementById('copied-items');
    storageMode.get('copiedItems', function(data) {
        let copiedItems = data.copiedItems || [];

        const pinnedItems = copiedItems.filter(item => item.isPinned);
        const unpinnedItems = copiedItems.filter(item => !item.isPinned);

        copiedItems = pinnedItems.concat(unpinnedItems);

        console.log('Retrieved and reordered copiedItems:', copiedItems);

        copied_items_div.innerHTML = '';

        const filteredItems = copiedItems.filter(itemObject => { // Renamed 'value' to 'itemObject' for clarity
            const actualValue = itemObject.value; // Get the actual string value
            if (currentFilter === 'all') {
                return true;
            } else if (currentFilter === 'text') {
                return !actualValue.includes('<img'); // Use actualValue here
            } else if (currentFilter === 'image') {
                return actualValue.includes('<img'); // Use actualValue here
            }
            return true;
        });

        if (filteredItems.length > 0) {
            filteredItems.forEach(function(itemObject, displayIndex) {
                const value = itemObject.value; // Assign the actual string value to 'value' for convenience inside the loop
                const isPinned = itemObject.isPinned;

                const copied_list = document.createElement('div');
                copied_list.classList.add('copied-list');
                const originalIndexInStorage = copiedItems.indexOf(itemObject);
                copied_list.dataset.index = originalIndexInStorage;
                copied_list.dataset.rawValue = value;

                const contentElement = document.createElement('div');
                if (value.includes('<img')) { // This line is now correct because 'value' is the string
                    const imgdiv = document.createElement('div');
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = value;
                    const imgElement = tempDiv.querySelector('img');

                    if (imgElement) {
                        // Check if image is using base64 or URL
                        const imgSrc = imgElement.src;

                        imgdiv.innerHTML = `<h2>${displayIndex+1}: Image</h2>`;
                        
                        const displayedImg = document.createElement('img');
                        displayedImg.src = imgElement.src;
                        displayedImg.alt = imgElement.alt || 'Copied Image';
                        displayedImg.style.width = '100%';
                        displayedImg.style.height = 'auto';
                        displayedImg.style.borderRadius = '25px';
                        imgdiv.appendChild(displayedImg);
                    } else {
                        imgdiv.innerHTML = `<h2>${displayIndex+1}: Image (HTML snippet)</h2>`;
                    }
                    contentElement.appendChild(imgdiv);

                } else {
                    const copiedText = document.createElement('h2');
                    copiedText.textContent = `${displayIndex + 1}: ${value}`;
                    contentElement.appendChild(copiedText);
                }
                copied_list.appendChild(contentElement);

                const itemDropdown = document.createElement('div');
                itemDropdown.classList.add('item-dropdown');

                const menuButton = document.createElement('div');
                menuButton.classList.add('button-style', 'item-menu-button');
                menuButton.innerHTML = `
                <span class="material-symbols-outlined">
                    more_vert
                </span>`;
                itemDropdown.appendChild(menuButton);

                const dropdownContent = document.createElement('div');
                dropdownContent.classList.add('item-dropdown-content');

                const deleteButton = document.createElement('div');
                deleteButton.classList.add('button-style');
                deleteButton.innerHTML = `
                    <span class="material-symbols-outlined">
                        delete
                    </span>
                `;
                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    handleDeleteItem(originalIndexInStorage);
                });

                const pinToggleButton = document.createElement('div');
                pinToggleButton.classList.add('button-style');
                if (isPinned) {
                    copied_list.style.border = '2px solid var(--accent-color)';
                    pinToggleButton.classList.add('is-pinned');
                    pinToggleButton.innerHTML = `
                        <span class="material-symbols-outlined">
                            keep_off
                        </span>
                    `;
                } else {
                    pinToggleButton.innerHTML = `
                        <span class="material-symbols-outlined">
                            keep
                        </span>
                    `;
                }
                pinToggleButton.addEventListener('click', () => {
                    togglePinStatus(originalIndexInStorage);
                });

                dropdownContent.appendChild(pinToggleButton);
                dropdownContent.appendChild(deleteButton);
                itemDropdown.appendChild(dropdownContent);
                copied_list.appendChild(itemDropdown);

                menuButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    document.querySelectorAll('.item-dropdown-content.show-item-dropdown').forEach(openDropdown => {
                        if (openDropdown !== dropdownContent) {
                            openDropdown.classList.remove('show-item-dropdown');
                        }
                    });
                    dropdownContent.classList.toggle('show-item-dropdown');
                });

                copied_items_div.appendChild(copied_list);
            });

            const copiedLists = copied_items_div.querySelectorAll('.copied-list');
            copiedLists.forEach(item => {
                item.addEventListener('click', handleCopiedItemClick);
            });
            buttonRippleEffect();

        } else {
            const message = document.createElement('p');
            message.classList.add('no-copied-msg');
            message.innerHTML = `No copied content!\nJust copy some text or an image and press the paste button below to get started!`;
            copied_items_div.appendChild(message);
        }
    });
}

// Function to close all open item dropdowns when clicking anywhere else on the document
document.addEventListener('click', (event) => {
    const openDropdowns = document.querySelectorAll('.item-dropdown-content.show-item-dropdown');
    openDropdowns.forEach(dropdown => {
        const parentDropdownContainer = dropdown.closest('.item-dropdown');
        if (parentDropdownContainer && !parentDropdownContainer.contains(event.target)) {
            dropdown.classList.remove('show-item-dropdown');
        }
    });
});


/**
 * Handles clicks on the filter buttons.
 * @param {string} type - The type of content to filter ('text' or 'image').
 */
function handleFilterClick(type) {
    if (currentFilter === type) {
        // If the same filter button is pressed again, turn off filtering
        currentFilter = 'all';
    } else {
        // Otherwise, set the new filter type
        currentFilter = type;
    }
    // Re-render the list with the new filter
    checkCopiedItems();
        updateStorage();

    // Optionally, update button styles to show active filter
    updateFilterButtonStyles();
}

/**
 * Updates the visual state of the filter buttons.
 */
function updateFilterButtonStyles() {
    const textButton = document.getElementById('filter-text');
    const imageButton = document.getElementById('filter-image');

    if (textButton) {
        if (currentFilter === 'text') {
            textButton.classList.add('content-filtered');
            imageButton.classList.remove('content-filtered');
        } else if (currentFilter === 'image') {
            textButton.classList.remove('content-filtered');
            imageButton.classList.add('content-filtered');
        } else {
            // No filter active, remove active class from both
            textButton.classList.remove('content-filtered');
            imageButton.classList.remove('content-filtered');
        }
    }
}

async function checkClipboardType() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
            const clipboardTypes = clipboardItem.types;
            console.log('Clipboard types detected:', clipboardTypes);

            // Scenario: imageStorageState is 'srcurl'
            if (imageStorageState === 'srcurl') {
                if (clipboardTypes.includes('text/html')) {
                    const htmlBlob = await clipboardItem.getType('text/html');
                    const htmlText = await htmlBlob.text();
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = htmlText;
                    const imgElement = tempDiv.querySelector('img');

                    if (imgElement && imgElement.src) {
                        console.log('Image found in HTML, storing as SRC URL:', imgElement.src);
                        pasteItem(htmlText); // Pass the original HTML
                    } else {
                        // HTML found, but no <img> with src. Alert the user.
                        console.log('HTML found, but no image source URL detected.');
                        showAlert('Image source URL could not be found. Please turn on Base64 encoding to paste images without URLs.');
                    }
                } else if (clipboardTypes.includes('text/plain')) {
                    // Handle plain text as fallback
                    console.log('Plain text detected in srcurl mode.');
                    pasteTextFromClipboard();
                } else {
                    // No HTML found on clipboard when srcurl is desired. Alert the user.
                    console.log('No HTML detected on clipboard for srcurl state.');
                    showAlert('Image source URL could not be found. Please turn on Base64 encoding to paste images without URLs.');
                }
            }
            // Scenario: imageStorageState is 'base64'
            else if (imageStorageState === 'base64') {
                // Check for any image type, not just PNG
                const imageTypes = clipboardTypes.filter(type => type.startsWith('image/'));
                
                if (imageTypes.length > 0) {
                    // Prioritize common image formats
                    let imageType = imageTypes.find(type => type === 'image/png') || 
                                   imageTypes.find(type => type === 'image/jpeg') || 
                                   imageTypes.find(type => type === 'image/gif') ||
                                   imageTypes.find(type => type === 'image/webp') ||
                                   imageTypes[0]; // fallback to first available image type
                    
                    console.log(`${imageType} Image detected, converting to Base64.`);
                    
                    try {
                        const imageBlob = await clipboardItem.getType(imageType);
                        const reader = new FileReader();
                        
                        reader.onloadend = () => {
                            const base64data = reader.result;
                            console.log('Saving as Base64:', base64data.substring(0, 100) + '...');
                            
                            // Check if there's also HTML available
                            if (clipboardTypes.includes('text/html')) {
                                clipboardItem.getType('text/html')
                                    .then(htmlBlob => htmlBlob.text())
                                    .then(html => {
                                        // Create HTML with base64 image
                                        const htmlWithBase64 = html.replace(
                                            /<img[^>]*src\s*=\s*["'][^"']*["'][^>]*>/gi,
                                            `<img src="${base64data}" alt="Copied Image">`
                                        );
                                        pasteItem(htmlWithBase64);
                                    })
                                    .catch(error => {
                                        console.error('Error processing HTML:', error);
                                        // Fallback to just base64 image
                                        pasteItem(`<img src="${base64data}" alt="Copied Image">`);
                                    });
                            } else {
                                // No HTML, just create simple img tag with base64
                                pasteItem(`<img src="${base64data}" alt="Copied Image">`);
                            }
                        };
                        
                        reader.onerror = (error) => {
                            console.error('FileReader error:', error);
                            showAlert('Failed to convert image to Base64. Please try again.');
                        };
                        
                        reader.readAsDataURL(imageBlob);
                        
                    } catch (error) {
                        console.error('Error processing image blob:', error);
                        showAlert('Failed to process image. Please try again.');
                    }
                    
                } else if (clipboardTypes.includes('text/html')) {
                    // If base64 is desired, but no image, but there is HTML, paste HTML
                    const htmlBlob = await clipboardItem.getType('text/html');
                    const htmlText = await htmlBlob.text();
                    console.log('HTML detected but no image. Pasting HTML.');
                    pasteItem(htmlText);
                } else if (clipboardTypes.includes('text/plain')) {
                    // If base64 is desired, but no image or html, then plain text
                    console.log('Plain text detected in base64 mode.');
                    pasteTextFromClipboard();
                }
            }
            // Default: Handle plain text if no specific image state matches
            else if (clipboardTypes.includes('text/plain')) {
                console.log('Plain text detected (default case).');
                pasteTextFromClipboard();
            }
            
            // Break after processing the first clipboard item
            break;
        }
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        showAlert('Failed to read clipboard. Please grant permission or try again.');
    }
}

// Adjusted handleDeleteItem to correctly use the originalIndex
function handleDeleteItem(originalIndex) {
    console.log('Deleting item at original index:', originalIndex);
    storageMode.get('copiedItems', function(data) {
        const copiedItems = data.copiedItems || [];
        // Filter based on the original index
        const updatedItems = copiedItems.filter((_, i) => i !== originalIndex);

        storageMode.set({ 'copiedItems': updatedItems }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error updating storage after deletion:', chrome.runtime.lastError);
            } else {
                console.log('Item deleted and storage updated.');
                checkCopiedItems();
                updateStorage();
            }
        });
        chrome.runtime.sendMessage({ action: "refreshPasteSubmenus" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to background:", chrome.runtime.lastError.message);
                } else {
                    console.log("Background response:", response);
                }
        });
    });
}

async function getImageAsPngBlob(rawValue) {
    let imageUrl = '';
    let isSVGString = false;

    // Check if rawValue is an <img> tag with a src
    if (rawValue.includes('<img')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawValue;
        const imgElement = tempDiv.querySelector('img');
        if (imgElement && imgElement.src) {
            imageUrl = imgElement.src;
        } else {
            return null; // No valid image source found in the HTML
        }
    } else if (rawValue.trim().startsWith('<svg')) {
        // If it's a raw SVG string
        isSVGString = true;
        imageUrl = 'data:image/svg+xml;base64,' + btoa(rawValue); // Convert SVG string to data URL
    } else {
        // Assume rawValue might be a direct image URL
        imageUrl = rawValue;
    }

    if (!imageUrl) {
        return null;
    }

    try {
        let response = await fetch(imageUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const imageBlob = await response.blob();
        const imageType = imageBlob.type;

        // If it's already a PNG, return it directly
        if (imageType === 'image/png') {
            return imageBlob;
        }

        // Create an Image element to load the image
        const img = new Image();
        const objectURL = URL.createObjectURL(imageBlob);
        img.src = objectURL;

        // Wait for the image to load
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');

        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0);

        // Revoke the object URL to free up memory
        URL.revokeObjectURL(objectURL);

        // Convert the canvas content to a PNG blob
        return new Promise(resolve => {
            canvas.toBlob(blob => {
                resolve(blob);
            }, 'image/png');
        });

    } catch (error) {
        console.error('Error converting image to PNG:', error);
        return null;
    }
}

async function handleCopiedItemClick(event) {
    const hoveredElement = event.target.closest('.copied-list');
    if (hoveredElement) {
        const rawValue = hoveredElement.dataset.rawValue;

        // Prevent opening dropdown if clicking on the dropdown 'M' button or delete button
        if (event.target.closest('.item-dropdown') || event.target.closest('.item-delete-button') || event.target.closest('.item-pin-button')) {
            return;
        }

        // Attempt to get the image as a PNG blob
        const pngBlob = await getImageAsPngBlob(rawValue);

        if (pngBlob) {
            try {
                const clipboardItem = new ClipboardItem({
                    [pngBlob.type]: pngBlob,
                });
                await navigator.clipboard.write([clipboardItem]);
                showAlert('Image copied to clipboard successfully!');
            } catch (error) {
                console.error('Failed to copy image to clipboard:', error);
                showAlert(`Failed to copy image: ${error.message}. Attempting to copy HTML/text instead.`);
                // Fallback to copying rawValue as text if image copy fails
                try {
                    await navigator.clipboard.writeText(rawValue);
                    showAlert('Failed to copy image, copied HTML/text instead.');
                } catch (textCopyError) {
                    console.error('Also failed to copy HTML/text:', textCopyError);
                    showAlert('Failed to copy HTML/text.');
                }
            }
        } else {
            // Handle cases where it's not an image or image conversion failed
            if (isValidUrl(rawValue)) {
                if (event.ctrlKey || event.metaKey) {
                    try {
                        chrome.tabs.create({ url: rawValue, active: true }, (newTab) => {
                            console.log('Opened new tab with ID:', newTab.id, 'and URL:', newTab.url);
                        });
                        showAlert('URL opened in a new tab.');
                    } catch (error) {
                        console.error('Failed to open URL:', error);
                        showAlert('Failed to open URL.');
                    }
                } else {
                    try {
                        await navigator.clipboard.writeText(rawValue);
                        showAlert(`Text '${rawValue.substring(0, 50)}...' copied to clipboard.`);
                    } catch (error) {
                        console.error('Failed to copy text:', error);
                        showAlert('Failed to copy text.');
                    }
                }
            } else {
                try {
                    await navigator.clipboard.writeText(rawValue);
                    showAlert(`Text '${rawValue.substring(0, 50)}...' copied to clipboard.`);
                } catch (error) {
                    console.error('Failed to copy text:', error);
                    showAlert('Failed to copy text.');
                }
            }
        }
    }
}

async function handleAddText(value) {
    try {
        storageMode.get('copiedItems', function(data) {
            let copiedItems = data.copiedItems || [];

            // Add this filter to clean up potential bad data before processing
            copiedItems = copiedItems.filter(item => item && typeof item === 'object' && item.value !== undefined && item.timestamp !== undefined);


            const newItem = { value: value, type: 'text', isPinned: false, timestamp: Date.now() }; // Add timestamp
            
            const pinnedItems = copiedItems.filter(item => item.isPinned);
            let unpinnedItems = copiedItems.filter(item => !item.isPinned);

            unpinnedItems.push(newItem); // Add new item to the end of unpinned

            unpinnedItems.sort((a, b) => b.timestamp - a.timestamp); // Sort unpinned

            const updatedItems = pinnedItems.concat(unpinnedItems);

            const MAX_ITEMS = 5000;
            if (updatedItems.length > MAX_ITEMS) {
                updatedItems = updatedItems.slice(0, MAX_ITEMS);
            }

            storageMode.set({ 'copiedItems': updatedItems }, function() {
                console.log('Text added and saved:', value);
                checkCopiedItems();
                updateStorage();
            });
            chrome.runtime.sendMessage({ action: "refreshPasteSubmenus" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to background:", chrome.runtime.lastError.message);
                } else {
                    console.log("Background response:", response);
                }
            });
        });
    } catch (error) {
        console.error('Failed to add text:', error);
    }
}

function showAlert(textData, inputData = null) {
    console.log(`inputData is:`, inputData);
    if (inputData != null) {
        if (inputData === 'addText') {
            console.log(`'if' is called!`);
            const container = document.getElementById('alert-container');
            if (!container) {
                console.error("Error: 'alert-container' element not found.");
                return;
            }
            const alertDiv = document.createElement('div');
            alertDiv.classList.add('copy-alert');
            const inputPrompt = document.createElement('p');
            inputPrompt.textContent = textData;
            alertDiv.appendChild(inputPrompt);

            const inputElement = document.createElement('input');
            inputElement.classList.add('input-text-input');

            alertDiv.appendChild(inputElement);
            container.appendChild(alertDiv);
            setTimeout(() => {
                alertDiv.classList.add('show-alert');
            }, 50);
            inputElement.focus();
            inputElement.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();

                    const inputValue = inputElement.value;
                    if (inputValue !== '') {
                        handleAddText(inputValue);
                    } else {
                        console.log('Input cancelled. Input value was null.');
                    }

                    alertDiv.classList.remove('show-alert');
                    alertDiv.classList.add('fade-out');
                    setTimeout(function() {
                        container.removeChild(alertDiv);
                    }, 500);
                }
            });
        }
    } else {
        console.log(`'else' is called!`);
        const container = document.getElementById('alert-container');
        if (!container) {
            console.error("Error: 'alert-container' element not found.");
            return;
        }
        const alertDiv = document.createElement('div');
        alertDiv.classList.add('copy-alert');
        alertDiv.textContent = textData;
        container.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.classList.add('show-alert');
        }, 50);

        setTimeout(function() {
            alertDiv.classList.remove('show-alert');
            alertDiv.classList.add('fade-out');
            setTimeout(function() {
                container.removeChild(alertDiv);
            }, 500);
        }, 3000);
    }
}

function displayFooterText() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const footerText = document.getElementById('footer-text');
    footerText.textContent = `©${currentYear} (ing) Studios Web Labs`;
}

function pasteTextEventListener() {
    const paste_button = document.getElementById('paste-btn');
    paste_button.addEventListener('click', checkClipboardType);
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'v' || event.metalKey && event.key === 'v') {
            checkClipboardType();
        }
    });
}

async function pasteTextFromClipboard() {
    try {
        const pastedText = await navigator.clipboard.readText();
        storageMode.get('copiedItems', function(data) {
            let copiedItems = data.copiedItems || [];

            // Add this filter to clean up potential bad data before processing
            copiedItems = copiedItems.filter(item => item && typeof item === 'object' && item.value !== undefined && item.timestamp !== undefined);


            const newItem = { value: pastedText, type: 'text',isPinned: false, timestamp: Date.now() }; // Add timestamp

            const pinnedItems = copiedItems.filter(item => item.isPinned);
            let unpinnedItems = copiedItems.filter(item => !item.isPinned);

            unpinnedItems.push(newItem); // Add new item to the end of unpinned

            unpinnedItems.sort((a, b) => b.timestamp - a.timestamp); // Sort unpinned

            const updatedItems = pinnedItems.concat(unpinnedItems);

            const MAX_ITEMS = 5000;
            if (updatedItems.length > MAX_ITEMS) {
                updatedItems = updatedItems.slice(0, MAX_ITEMS);
            }

            storageMode.set({ 'copiedItems': updatedItems }, function() {
                console.log('Text pasted and saved:', pastedText);
                checkCopiedItems();
                updateStorage();
            });
            chrome.runtime.sendMessage({ action: "refreshPasteSubmenus" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to background:", chrome.runtime.lastError.message);
                } else {
                    console.log("Background response:", response);
                }
            });
        });
    } catch (error) {
        console.error('Failed to read clipboard:', error);
    }
}

function addTextEventListener() {
    const addTextBtn = document.getElementById('add-text-btn');
    addTextBtn.addEventListener('click', () => {
        showAlert('What would you like to input?', 'addText');
    });
    document.addEventListener('keydown', (event) => {
        if (event.altKey && event.key === 'a') {
            console.log('alt + a pressed!');
            showAlert('What would you like to input?', 'addText');
        }
    });
}

function clearAllText() {
    const clearAllBtn = document.getElementById('clear-all-btn');
    clearAllBtn.addEventListener('click', function() {
        storageMode.remove('copiedItems', function() {
            showAlert(`All copied items cleared successfully.`);
            checkCopiedItems();
            updateStorage();
        });
    });
}

async function pasteItem(itemValue) {
    storageMode.get('copiedItems', function(data) {
        let copiedItems = data.copiedItems || [];

        // Add this filter to clean up potential bad data before processing
        copiedItems = copiedItems.filter(item => item && typeof item === 'object' && item.value !== undefined && item.timestamp !== undefined);


        const newItem = { value: itemValue, type: 'image', isPinned: false, timestamp: Date.now() }; // Add timestamp

        const pinnedItems = copiedItems.filter(item => item.isPinned);
        let unpinnedItems = copiedItems.filter(item => !item.isPinned);

        unpinnedItems.push(newItem); // Add new item to the end of unpinned

        unpinnedItems.sort((a, b) => b.timestamp - a.timestamp); // Sort unpinned

        const updatedItems = pinnedItems.concat(unpinnedItems);

        const MAX_ITEMS = 5000;
        if (updatedItems.length > MAX_ITEMS) {
            updatedItems = updatedItems.slice(0, MAX_ITEMS);
        }

        storageMode.set({ 'copiedItems': updatedItems }, function() {
            console.log('Item pasted and saved:', itemValue);
            checkCopiedItems();
            updateStorage();
        });
        chrome.runtime.sendMessage({ action: "refreshPasteSubmenus" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error sending message to background:", chrome.runtime.lastError.message);
                } else {
                    console.log("Background response:", response);
                }
        });
    });
}

function openSettings() {
    const settingsButton = document.getElementById('settings-icon');
    settingsButton.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('../settings/settings.html') });
    });
}

// Function to check if the user has scrolled to the bottom
function isAtPageBottom() {
    const scrolledHeight = window.scrollY || window.pageYOffset;
    const viewportHeight = window.innerHeight;
    const totalPageHeight = document.documentElement.scrollHeight;
    const tolerance = 5; // Pixels to account for potential rendering differences
    return (scrolledHeight + viewportHeight >= totalPageHeight - tolerance);
}

const parentAction = document.querySelector('.parent-action');
const actionsContainer = document.getElementById('actions-container');
function updateActionButtonsPosition() {
    if (isAtPageBottom()) {
        // Add a class when at the bottom
        parentAction.classList.add('at-bottom');
        actionsContainer.classList.add('at-bottom-radius');
    } else {
        // Remove the class when not at the bottom
        parentAction.classList.remove('at-bottom');
        actionsContainer.classList.remove('at-bottom-radius');
    }
}

function buttonRippleEffect() {
    document.querySelectorAll('.button-style').forEach(button => {
        button.addEventListener('click', function(e) {
            const button = e.currentTarget;

            // Create the ripple element
            const circle = document.createElement('span');

            // Calculate the diameter for the ripple (large enough to cover the button)
            // Use the larger of width or height, assuming it's roughly square for a circular button
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            const radius = diameter / 2;

            // Set the size of the ripple
            circle.style.width = circle.style.height = `${diameter}px`;

            // Position the ripple at the click location
            // e.clientX/Y are relative to the viewport
            // button.getBoundingClientRect().left/top are relative to the viewport
            // Subtracting radius centers the circle at the click point
            const buttonRect = button.getBoundingClientRect();
            circle.style.left = `${e.clientX - buttonRect.left - radius}px`;
            circle.style.top = `${e.clientY - buttonRect.top - radius}px`;

            // Add the ripple class to trigger CSS animation
            circle.classList.add('ripple');

            // Remove any existing ripples to prevent multiple overlapping ripples
            const existingRipple = button.querySelector('.ripple');
            if (existingRipple) {
                existingRipple.remove();
            }

            // Append the ripple to the button
            button.appendChild(circle);

            // Remove the ripple element after its animation finishes
            circle.addEventListener('animationend', () => {
                circle.remove();
            });
        });
    });
}

function updateStorage() {
    chrome.runtime.sendMessage({ type: 'updateStorageInfo' }, (response) => {
        if (response && response.success) {
            console.log("Message sent successfully to the Settings page!");
        } else {
            console.error("Failed to send message or the Settings page is not ready.");
        }
    });
}

function initializeImageStorageState(storageState) {
    if (storageState === 'srcurl' || storageState === 'base64') {
        imageStorageState = storageState;
    } else {
        imageStorageState = 'srcurl';
        chrome.storage.local.set({ 'imageStorageMode' : 'srcurl' });
    }
}

async function checkImageStorageType() {
    if (storageMode === chrome.storage.sync) {
        initializeImageStorageState('srcurl');
    } else {
        const data = await chrome.storage.local.get(['imageStorageMode', 'lastImageStorageMode']);
        const storedImageMode = data.imageStorageMode;
        const lastImageMode = data.lastImageStorageMode;

        if (storedImageMode === 'srcurl') {
            initializeImageStorageState('srcurl');
        } else if (storedImageMode === 'base64') {
            initializeImageStorageState('base64');
        } else {
            if (lastImageMode === 'base64' || lastImageMode === 'srcurl') {
                initializeImageStorageState(lastImageMode);
                await chrome.storage.local.set({ 'imageStorageMode' : lastImageMode });
            } else {
                initializeImageStorageState('srcurl');
                await chrome.storage.local.set({ 'imageStorageMode' : 'srcurl' });
            }
        }
    }
}

async function initializePopup() {
    await checkStorageMode();
    await checkImageStorageType();
    openSettings();
    retrieveTheme();
    updateActionButtonsPosition();
    buttonRippleEffect();
    checkCopiedItems();
    displayFooterText();
    pasteTextEventListener();
    addTextEventListener();
    clearAllText(); // Keep this for the global Clear All button

    // Add event listeners for the filter buttons
    const filterTextButton = document.getElementById('filter-text');
    const filterImageButton = document.getElementById('filter-image');

    if (filterTextButton) {
        filterTextButton.addEventListener('click', () => handleFilterClick('text'));
    }
    if (filterImageButton) {
        filterImageButton.addEventListener('click', () => handleFilterClick('image'));
    }
    // Call updateFilterButtonStyles initially to set correct state
    updateFilterButtonStyles();

    // Attach a scroll event listener
    window.addEventListener('scroll', updateActionButtonsPosition);
}

document.addEventListener('DOMContentLoaded', initializePopup);