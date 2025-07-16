// background.js

// Function to store pasted text into storageMode
async function pasteToStorage(pastedText, sourceUrl = "Unknown Source", itemType) {
    try {
        await checkStorageMode();
        const data = await storageMode.get("copiedItems");
        let copiedItems = data.copiedItems || [];

        // Filter out any potentially malformed items (null, undefined, or missing 'value' property)
        // before processing to maintain data integrity.
        copiedItems = copiedItems.filter(item => item && typeof item === 'object' && item.value !== undefined && item.timestamp !== undefined);

        // Create the new item as an object with isPinned: false and a timestamp
        const newItem = {
            value: pastedText,
            type: itemType,
            isPinned: false, // Newly pasted items are unpinned by default
            timestamp: Date.now()
        };

        // Separate pinned and unpinned items.
        const pinnedItems = copiedItems.filter(item => item.isPinned);
        let unpinnedItems = copiedItems.filter(item => !item.isPinned);

        // Add the new item to the beginning of the unpinned items.
        unpinnedItems.unshift(newItem); 

        // Sort the unpinned items by timestamp (newest first) to ensure consistent order
        unpinnedItems.sort((a, b) => b.timestamp - a.timestamp);

        // Recombine the arrays: pinned items first, then unpinned.
        let updatedItems = pinnedItems.concat(unpinnedItems);

        const MAX_ITEMS = 5000; // Define maximum number of items to store
        if (updatedItems.length > MAX_ITEMS) {
            // If the total exceeds MAX_ITEMS, trim from the end of the unpinned items.
            // This prioritizes pinned items and keeps the most recent unpinned items.
            updatedItems = updatedItems.slice(0, MAX_ITEMS);
        }

        await storageMode.set({ 'copiedItems': updatedItems });
        updateStorage();

        // Display a notification to the user
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/assets/logo_blue.png", // Ensure this path is correct
            title: "Item Saved",
            message: `Item from '${sourceUrl}' saved.`
        });
    } catch (error) {
        console.error('Error saving to storage:', error);
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/assets/logo_blue.png",
            title: "Save Error",
            message: "Failed to save item."
        });
    }
}

// Function to retrieve the extension's theme color settings
async function retrieveTheme() {
    try {
        const result = await storageMode.get("extensionTheme");

        // If no theme is set, set a default and return it
        if (!result.extensionTheme) {
            const defaultHexColor = ['#2196F3', '#64B5F6', '#1976D2', '#0D47A1', '#03A9F4', '#E3F2FD', '#FFC107'];
            await storageMode.set({ extensionTheme: defaultHexColor });
            updateStorage();
            return defaultHexColor;
        }
        return result.extensionTheme;
    } catch (error) {
        console.error("Error retrieving theme:", error);
        return null; // Return null on error
    }
}

// Function to set the extension's icon based on the current theme
async function setIcon() {
    const themeArray = await retrieveTheme();

    if (!themeArray || themeArray.length === 0) {
        console.error("Theme array is empty or not retrieved. Cannot set icon.");
        return;
    }
    const primaryHex = themeArray[0]; // Use the first color in the array as the primary theme color
    let colourName;

    // Determine the icon color based on the primary hex code
    if (['#2196F3', '#64B5F6', '#1976D2', '#0D47A1', '#03A9F4', '#E3F2FD'].includes(primaryHex)) {
        colourName = 'blue';
    } else if (primaryHex === '#F44336') {
        colourName = 'red';
    } else if (primaryHex === '#9C27B0') {
        colourName = 'purple';
    } else if (primaryHex === '#4CAF50') {
        colourName = 'green';
    } else if (primaryHex === '#FFEB3B') {
        colourName = 'yellow';
    } else {
        colourName = 'blue'; // Default to blue if color not explicitly matched
    }

    const iconPath = `/assets/logo_${colourName}.png`; // Construct the icon path

    // Set the extension's action icon
    chrome.action.setIcon({
        path: {
            "16": iconPath,
            "32": iconPath,
            "48": iconPath,
            "128": iconPath
        }
    }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Error setting icon to ${iconPath}:`, chrome.runtime.lastError.message);
        } else {
            console.log('Icon set to:', iconPath);
        }
    });
}

// Function to migrate old data formats to the new object structure
async function migrateDataFormat() {
    console.log("Checking for data migration...");

    try {
        const data = await storageMode.get("copiedItems");
        let rawCopiedItems = data.copiedItems || [];

        let needsMigration = false;
        let normalizedCopiedItems = rawCopiedItems.map(item => {
            if (typeof item === 'string') {
                // Old plain text item detected, needs migration to object format
                needsMigration = true;
                return {
                    value: item,
                    isPinned: false, // Default old items to unpinned
                    timestamp: Date.now() // Assign current timestamp
                };
            } else if (item && typeof item === 'object') {
                // Already an object, but check if required properties are missing
                if (item.value === undefined || typeof item.isPinned !== 'boolean' || item.timestamp === undefined) {
                    console.warn("Item missing expected properties, normalizing:", item);
                    needsMigration = true; // Mark as needing migration/normalization
                    return {
                        value: item.value || '', // Ensure value exists, default to empty string
                        isPinned: typeof item.isPinned === 'boolean' ? item.isPinned : false, // Ensure boolean, default to false
                        timestamp: item.timestamp || Date.now() // Ensure timestamp, default to current time
                    };
                }
                return item; // Already in the correct format
            } else {
                // Malformed data (null, undefined, or unexpected type)
                needsMigration = true; // Mark as needing cleanup
                return null; // Mark for filtering out
            }
        }).filter(item => item !== null); // Remove any items that were nullified during mapping

        if (needsMigration) {
            console.log("Migrating data format...");
            await storageMode.set({ 'copiedItems': normalizedCopiedItems });
            updateStorage();
            console.log("Data migration complete.");
        } else {
            console.log("No data migration needed.");
        }

    } catch (error) {
        console.error("Error during data migration:", error);
    }
}

// Function to sanitize a string for use as a context menu item ID
function sanitizeStringForId(inputString) {
    if (typeof inputString !== 'string') {
        console.warn('Input to sanitizeStringForId is not a string. Returning empty string.');
        return '';
    }

    // Replace all whitespace characters with underscores
    let sanitizedString = inputString.replace(/\s+/g, '_');

    // Remove any characters that are NOT a letter, number, or underscore
    sanitizedString = sanitizedString.replace(/[^a-zA-Z0-9_]/g, '');

    // Truncate if the string is excessively long, as IDs may have practical limits
    const MAX_ID_LENGTH = 100;
    if (sanitizedString.length > MAX_ID_LENGTH) {
        sanitizedString = sanitizedString.substring(0, MAX_ID_LENGTH);
    }
    
    return sanitizedString;
}


// --- Context Menu Management Functions ---

// Function to create the static context menu items.
// This function should ONLY be called once, typically during `onInstalled`.
// Chrome's API will not create duplicate items if an item with the same ID already exists,
// so it's generally safe to call this without explicit `removeAll` for these specific IDs.
function createStaticContextMenus() {
    console.log("Creating static context menus...");
    
    chrome.contextMenus.create({
        id: "copy_text",
        title: "Copy text to InfiniteCopy",
        contexts: ["selection"]
    });
    chrome.contextMenus.create({
        id: "copy_link",
        title: "Copy link to InfiniteCopy",
        contexts: ["link"]
    });
    chrome.contextMenus.create({
        id: "copy_image",
        title: "Copy image to InfiniteCopy",
        contexts: ["image"]
    });
    // IMPORTANT: The "paste_text" parent menu is NOT created here.
    // It is exclusively managed (removed and recreated) by `refreshPasteSubmenus`
    // to ensure proper synchronization with its dynamic children.
}


// Function to refresh (remove and re-add) the dynamic paste submenus.
// This function also explicitly manages the "paste_text" parent menu.
// No need for sanitizeStringForId or stringHash with timestamp IDs
// Remove or comment out these helper functions if they are only used here.

async function refreshPasteSubmenus() {
    console.log("Refreshing paste submenus...");

    // 1. Remove ALL context menus created by this extension.
    // This is the most robust way to prevent "duplicate item ID" errors
    // by ensuring a clean slate before recreating.
    await new Promise(resolve => {
        chrome.contextMenus.removeAll(() => {
            if (chrome.runtime.lastError) {
                console.error("Error removing all context menus:", chrome.runtime.lastError.message);
            } else {
                console.log("All extension context menus removed for refresh.");
            }
            resolve();
        });
    });

    // --- IMPORTANT FIX START ---
    // 2. Recreate the static context menu items immediately after removing all.
    // This ensures they are always present, even after dynamic menu refreshes.
    createStaticContextMenus();
    // --- IMPORTANT FIX END ---

    // 3. Recreate the "paste_text" parent menu.
    // This is crucial because its dynamic children need a valid parent to attach to.
    await new Promise(resolve => {
        chrome.contextMenus.create({
            id: "paste_text",
            title: "Paste text from InfiniteCopy",
            contexts: ["editable"]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error recreating paste_text parent menu:", chrome.runtime.lastError.message);
            } else {
                console.log("Parent menu 'paste_text' created.");
            }
            resolve();
        });
    });
    // 4. Retrieve stored items and prepare them for display.
    try {
        const storedItems = await storageMode.get("copiedItems");
        const copiedItems = storedItems.copiedItems || [];

        const pinnedItems = copiedItems.filter(item => item.isPinned === true);
        const nonPinnedItems = copiedItems.filter(item => item.isPinned !== true);
        const sortedNonPinnedItems = nonPinnedItems.sort((a, b) => b.timestamp - a.timestamp);

        const displayItems = [];
        const seenValues = new Set();

        for (const item of pinnedItems) {
            if (item && typeof item === 'object' && typeof item.value === 'string' && item.value.trim() !== '') {
                if (!seenValues.has(item.value)) {
                    displayItems.push(item);
                    seenValues.add(item.value);
                }
            } else {
                console.warn("Skipping invalid or empty pinned item found in storage:", item);
            }
        }

        const maxNonPinnedItems = 5;
        let nonPinnedCount = 0;
        for (const item of sortedNonPinnedItems) {
            if (item && typeof item === 'object' && typeof item.value === 'string' && item.value.trim() !== '') {
                if (!seenValues.has(item.value) && nonPinnedCount < maxNonPinnedItems) {
                    displayItems.push(item);
                    seenValues.add(item.value);
                    nonPinnedCount++;
                }
            } else {
                console.warn("Skipping invalid or empty non-pinned item found in storage:", item);
            }
        }

        if (displayItems.length === 0) {
            console.log("No unique items to display in paste submenus.");
            // Consider if you want to display a "No items" placeholder here
            // or just leave the paste_text menu empty.
            return;
        }

        for (const item of displayItems) {
            let shortenedItem = item.value;
            if (item.value.length > 30) {
                shortenedItem = `${item.value.substring(0, 27)}...`;
            }

            const itemId = `paste_item_${item.timestamp}`;
            const titlePrefix = item.isPinned ? "📌 " : "";

            chrome.contextMenus.create({
                id: itemId,
                title: `${titlePrefix}${shortenedItem}`,
                parentId: "paste_text",
                contexts: ["editable"]
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error creating submenu for item "${shortenedItem}" (${itemId}):`, chrome.runtime.lastError.message);
                }
            });
        }
        console.log(`Successfully created ${displayItems.length} unique paste submenus (including pinned items).`);

    } catch (error) {
        console.error("Error during refreshPasteSubmenus (creating children):", error);
    }
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

// Function to handle clicks on the dynamic "Paste Item: ..." submenus
async function handlePasteSubmenuClick(info, tab) {
    // Check if the clicked menu item ID starts with our specific dynamic prefix
    if (info.menuItemId && info.menuItemId.startsWith("paste_item_")) {
        // Ensure we have a valid tab to execute the script in
        if (!tab || !tab.id) {
            console.error("No valid tab found for paste operation.");
            return;
        }

        try {
            const storedItems = await storageMode.get("copiedItems");
            const copiedItems = storedItems.copiedItems || [];

            // --- START OF REQUIRED UPDATE ---
            // Extract the timestamp from the menu item ID
            const clickedTimestamp = parseInt(info.menuItemId.substring("paste_item_".length));

            // Find the original item from storage that corresponds to the clicked menu item by its timestamp.
            const originalItem = copiedItems.find(item =>
                item && typeof item === 'object' &&
                item.timestamp === clickedTimestamp // Match by timestamp directly
            );
            // --- END OF REQUIRED UPDATE ---

            if (originalItem && originalItem.value !== undefined) { // Check for undefined to allow empty strings
                // Execute a content script in the target tab to perform the paste operation.
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (textToPaste) => {
                        const activeElement = document.activeElement;
                        // Check if the currently active element is an editable input, textarea, or contenteditable div.
                        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
                            // Ensure the element is still focused and active before attempting to paste.
                            if (activeElement === document.activeElement) {
                                if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                                    // For input/textarea elements, manually insert the text at the current cursor position.
                                    const start = activeElement.selectionStart;
                                    const end = activeElement.selectionEnd;
                                    activeElement.value = activeElement.value.substring(0, start) + textToPaste + activeElement.value.substring(end);
                                    // Move the cursor to the end of the newly pasted text.
                                    activeElement.selectionStart = activeElement.selectionEnd = start + textToPaste.length;
                                } else if (activeElement.isContentEditable) {
                                    // For contenteditable elements (like rich text editors), use `document.execCommand('insertText')`.
                                    // Note: `execCommand` might have limitations or require user activation in some browser contexts.
                                    document.execCommand('insertText', false, textToPaste);
                                }
                            }
                        } else {
                            console.warn("Active element is not an editable input, textarea, or contenteditable.");
                            chrome.notifications.create({
                                type: "basic",
                                iconUrl: "/assets/logo_blue.png",
                                title: "Paste Error",
                                message: "Please paste into an editable text field."
                            }); // Inform the user if paste failed.
                        }
                    },
                    args: [originalItem.value] // Pass the actual text content to be pasted to the injected script.
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error executing script for paste:", chrome.runtime.lastError.message);
                        chrome.notifications.create({
                            type: "basic",
                            iconUrl: "/assets/logo_blue.png",
                            title: "Paste Error",
                            message: `Error from Chrome: ${chrome.runtime.lastError.message}`
                        });
                    }
                });
            } else {
                console.warn("Could not find the original item for pasting based on menu ID or item value is undefined:", info.menuItemId, originalItem);
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "/assets/logo_blue.png",
                    title: "Paste Error",
                    message: "Could not retrieve item to paste."
                });
            }
        } catch (error) {
            console.error("Error during paste operation:", error);
            chrome.notifications.create({
                type: "basic",
                iconUrl: "/assets/logo_blue.png",
                title: "Paste Error",
                message: "An error occurred during paste."
            });
        }
    }
}

let storageMode = chrome.storage.sync;

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

// --- Event Listeners ---

// Listener for when the extension is first installed or updated to a new version.
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Extension installed or updated. Reason:', details.reason);
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        // This code runs only when the extension is first installed
        chrome.tabs.create({ url: 'quickstart/quickstart.html' });
    }
    await checkStorageMode();
    // Create the static context menu items (Copy text, Copy link, Copy image).
    // This is typically done once on install.
    createStaticContextMenus(); 
    
    // Run data migration logic to ensure that any old data formats are updated
    // to the latest expected structure.
    await migrateDataFormat();
    
    // Set the extension's browser action icon based on the configured theme.
    setIcon();
    await refreshPasteSubmenus();
});

// Listener for when the browser starts up. This event fires once per browser session.
chrome.runtime.onStartup.addListener(async () => {
    console.log('Extension started up!');
    await checkStorageMode();
    // Re-create static menus for robustness. Chrome will gracefully ignore if they already exist.
    createStaticContextMenus();
    
    // Set the extension's icon.
    setIcon();
    await refreshPasteSubmenus();
});

// Main listener for any context menu click event triggered by the user.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // Basic validation to ensure we have a valid tab context.
    if (!tab || !tab.url || !tab.id) {
        console.warn("Context menu click event received without valid tab info.");
        return;
    }

    const sourceUrl = tab.url; // The URL of the page where the context menu was opened.

    // Handle clicks on static "Copy text" menu item.
    if (info.menuItemId === "copy_text" && info.selectionText) {
        await pasteToStorage(info.selectionText, sourceUrl, 'text');
        await refreshPasteSubmenus(); // Refresh menus immediately after adding a new item.
    } 
    // Handle clicks on static "Copy link" menu item.
    else if (info.menuItemId === "copy_link" && info.linkUrl) {
        await pasteToStorage(info.linkUrl, sourceUrl, 'text');
        await refreshPasteSubmenus(); // Refresh menus immediately after adding a new item.
    } 
    // Handle clicks on static "Copy image" menu item.
    else if (info.menuItemId === "copy_image" && info.srcUrl) {
        try {
            // Use `chrome.scripting.executeScript` to inject a function into the content page
            // that retrieves the outerHTML of the clicked image.
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (imageUrl) => {
                    const img = document.querySelector(`img[src="${imageUrl}"]`);
                    return img ? img.outerHTML : null;
                },
                args: [info.srcUrl] // Pass the image's source URL to the injected function.
            });

            const imageHTML = results[0]?.result; // Get the result from the executed script.
            if (imageHTML) {
                await pasteToStorage(imageHTML, sourceUrl, 'image');
                await refreshPasteSubmenus(); // Refresh menus after adding a new item.
            } else {
                // If image HTML could not be retrieved, alert the user.
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "/assets/logo_blue.png",
                    title: "Copy Error",
                    message: "Could not retrieve HTML for the image.\nBase64 encoding currently does not work for context menus."
                });
            }
        } catch (error) {
            console.error("Image processing error:", error);
            chrome.notifications.create({
                type: "basic",
                iconUrl: "/assets/logo_blue.png",
                title: "Copy Error",
                message: "Error proccessing the image."
            });
        }
    } 
    // Handle clicks on the dynamic "Paste Item: ..." submenus.
    else if (info.menuItemId.startsWith("paste_item_")) {
        // Delegate the handling of these specific dynamic menu items to a dedicated function.
        handlePasteSubmenuClick(info, tab);
    }
    // No specific action is defined for the "paste_text" parent menu itself, as it primarily
    // serves as a container for the dynamic paste items.
});

// Listener for messages sent from other parts of the extension (e.g., popup script, content scripts).
chrome.runtime.onMessage.addListener(async(request, sender, sendResponse) => {
    // If the message requests an update to the extension's theme (e.g., from popup settings).
    if (request.action === "updateExtensionTheme") {
        setIcon(); // Re-set the icon to reflect the new theme.
        sendResponse({ success: true, message: "Icon update triggered." });
        return true; // Indicate that `sendResponse` will be called asynchronously.
    } else if (request.action === "refreshPasteSubmenus") {
        refreshPasteSubmenus();
        sendResponse({ success: true, message: "Paste submenus refresh triggered." });
        return true;
    } else if (request.action === "refreshStorageMode") {
        await checkStorageMode();
        sendResponse({ success: true, message: "Storage mode refresh triggered." });
        return true;
    }
    // For any unhandled messages, return `false`.
    return false;
});