// background.js

async function pasteToStorage(pastedText, sourceUrl = "Unknown Source") {
    try {
        const data = await chrome.storage.sync.get("copiedItems");
        let copiedItems = data.copiedItems || [];

        // Filter out any potentially malformed items (null, undefined, or missing 'value' property)
        // before processing to maintain data integrity.
        copiedItems = copiedItems.filter(item => item && typeof item === 'object' && item.value !== undefined && item.timestamp !== undefined);

        // Create the new item as an object with isPinned: false and a timestamp
        const newItem = {
            value: pastedText,
            isPinned: false, // Newly pasted items are unpinned by default
            timestamp: Date.now() // Add this line!
        };

        // Add the new item to the beginning of the unpinned section.
        // First, separate pinned and unpinned items.
        const pinnedItems = copiedItems.filter(item => item.isPinned);
        let unpinnedItems = copiedItems.filter(item => !item.isPinned); // Use 'let' for sorting

        // Add the new item to the beginning of the unpinned items.
        unpinnedItems.push(newItem); // Add new item to the end of the unpinned items, will be sorted below

        // Sort the unpinned items by timestamp (newest first)
        unpinnedItems.sort((a, b) => b.timestamp - a.timestamp);

        // Recombine the arrays: pinned items first, then unpinned.
        let updatedItems = pinnedItems.concat(unpinnedItems);

        const MAX_ITEMS = 50;
        if (updatedItems.length > MAX_ITEMS) {
            // If the total exceeds MAX_ITEMS, trim from the end of the unpinned items.
            // This assumes pinned items are always prioritized.
            updatedItems = updatedItems.slice(0, MAX_ITEMS);
        }

        await chrome.storage.sync.set({ 'copiedItems': updatedItems });

        chrome.notifications.create({
            type: "basic",
            iconUrl: "/assets/logo_blue.png",
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

async function retrieveTheme() {
    try {
        const result = await chrome.storage.sync.get("extensionTheme");

        if (!result.extensionTheme) {
            const defaultHexColor = ['#2196F3', '#64B5F6', '#1976D2', '#0D47A1', '#03A9F4', '#E3F2FD', '#FFC107'];
            await chrome.storage.sync.set({ extensionTheme: defaultHexColor });
            return defaultHexColor;
        }
        return result.extensionTheme;
    } catch (error) {
        console.error("Error retrieving theme:", error);
        return null;
    }
}

async function setIcon() {
    const themeArray = await retrieveTheme();

    if (!themeArray || themeArray.length === 0) {
        console.error("Theme array is empty or not retrieved. Cannot set icon.");
        return;
    }
    console.log(themeArray[0]);
    const primaryHex = themeArray[0];
    let colourName;

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
        colourName = 'blue';
    }

    const iconPath = `/assets/logo_${colourName}.png`;

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
            console.log('Icon set to:',iconPath);
        }
    });
}

// Context menu creation
chrome.runtime.onInstalled.addListener(() => {
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
    setIcon();
});

async function migrateDataFormat() {
    console.log("Checking for data migration...");

    try {
        const data = await chrome.storage.sync.get("copiedItems");
        let rawCopiedItems = data.copiedItems || [];

        let needsMigration = false;
        let normalizedCopiedItems = rawCopiedItems.map(item => {
            if (typeof item === 'string') {
                // Old plain text item detected, needs migration
                needsMigration = true;
                return {
                    value: item,
                    isPinned: false, // Default old items to unpinned
                    timestamp: Date.now() // Assign current timestamp
                };
            } else if (item && typeof item === 'object') {
                // Already an object, but check if required properties are missing (e.g., timestamp)
                if (item.value === undefined || item.isPinned === undefined || item.timestamp === undefined) {
                    console.warn("Item missing expected properties, normalizing:", item);
                    needsMigration = true; // Mark as needing migration/normalization
                    return {
                        value: item.value || '', // Ensure value exists
                        isPinned: typeof item.isPinned === 'boolean' ? item.isPinned : false, // Ensure boolean
                        timestamp: item.timestamp || Date.now() // Ensure timestamp
                    };
                }
                return item; // Already in the correct format
            } else {
                // Malformed data (null, undefined, or unexpected type)
                needsMigration = true; // Mark as needing cleanup
                return null; // Mark for filtering out
            }
        }).filter(item => item !== null); // Remove any items that were nullified

        if (needsMigration) {
            console.log("Migrating data format...");
            await chrome.storage.sync.set({ 'copiedItems': normalizedCopiedItems });
            console.log("Data migration complete.");
            // Optionally, you might trigger a UI refresh if the popup is open
            // chrome.runtime.sendMessage({ action: "refreshUI" });
        } else {
            console.log("No data migration needed.");
        }

    } catch (error) {
        console.error("Error during data migration:", error);
    }
}

// 2. Call the migration function on extension install/update

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install' || details.reason === 'update') {
        // Run migration logic when the extension is installed or updated
        await migrateDataFormat();
    }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.url) return;

    const sourceUrl = tab.url;

    if (info.menuItemId === "copy_text" && info.selectionText) {
        await pasteToStorage(info.selectionText, sourceUrl);

    } else if (info.menuItemId === "copy_link" && info.linkUrl) {
        await pasteToStorage(info.linkUrl, sourceUrl);

    } else if (info.menuItemId === "copy_image" && info.srcUrl) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (imageUrl) => {
                    const img = document.querySelector(`img[src="${imageUrl}"]`);
                    return img ? img.outerHTML : null;
                },
                args: [info.srcUrl]
            });

            const imageHTML = results[0]?.result;
            if (imageHTML) {
                await pasteToStorage(imageHTML, sourceUrl);
            } else {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => alert("Could not retrieve HTML for the image.")
                });
            }

        } catch (error) {
            console.error("Image processing error:", error);
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (msg) => alert("An error occurred: " + msg),
                args: [error.message || "Unknown error"]
            });
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateExtensionTheme") { // Or whatever action name you define
        // The theme has been updated in storage, now update the icon
        setIcon();
        sendResponse({ success: true, message: "Icon update triggered." });
        return true; // Indicate that sendResponse will be called asynchronously
    }
    // ... handle other messages (like your "changeExtensionThemeColor" if still using it)
});
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started up!');
  setIcon();
});
