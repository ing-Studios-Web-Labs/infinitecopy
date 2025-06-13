// background.js

async function pasteToStorage(pastedText, sourceUrl = "Unknown Source") {
    try {
        const data = await chrome.storage.sync.get("copiedItems");
        let copiedItems = data.copiedItems || [];

        copiedItems.unshift(pastedText);
        const MAX_ITEMS = 50;
        if (copiedItems.length > MAX_ITEMS) {
            copiedItems = copiedItems.slice(0, MAX_ITEMS);
        }

        await chrome.storage.sync.set({ copiedItems });

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
