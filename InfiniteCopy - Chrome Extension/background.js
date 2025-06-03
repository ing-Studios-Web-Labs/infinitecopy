// background.js

// Make pasteToStorage truly async/await and accept a sourceUrl argument
async function pasteToStorage(pastedText, sourceUrl = "Unknown Source") { // Added sourceUrl parameter
    try {
        const data = await chrome.storage.sync.get("copiedItems");
        let copiedItems = data.copiedItems || [];

        // Add the new item to the beginning of the array
        copiedItems.unshift(pastedText);

        const MAX_ITEMS = 50;
        if (copiedItems.length > MAX_ITEMS) {
            copiedItems = copiedItems.slice(0, MAX_ITEMS);
        }

        await chrome.storage.sync.set({ 'copiedItems': copiedItems });
        console.log('Text pasted and saved:', pastedText);

        // Now, sourceUrl is available here for the notification message
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/assets/logo.png", // Ensure this path is correct
            title: "Item Saved",
            message: `Item from '${sourceUrl}' saved.` // Use sourceUrl here
        });

    } catch (error) {
        console.error('Error saving to storage:', error);
        chrome.notifications.create({
            type: "basic",
            iconUrl: "/assets/logo.png",
            title: "Save Error",
            message: "Failed to save item."
        });
        throw error;
    }
}


// Create context menu items on extension installation
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
});


// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => { // 'tab' is defined HERE!
    if (info.menuItemId === "copy_text") {
        if (info.selectionText) {
            await pasteToStorage(info.selectionText, tab.url); // Pass tab.url
        } else {
            console.log("No text selected for copy_text.");
        }
    } else if (info.menuItemId === "copy_link") {
        if (info.linkUrl) {
            await pasteToStorage(info.linkUrl, tab.url); // Pass tab.url
        } else {
            console.log("No link URL for copy_link.");
        }
    } else if (info.menuItemId === "copy_image") {
        if (info.mediaType === "image" && info.srcUrl) {
            console.log("Image right clicked:", info.srcUrl);
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (imageUrl) => {
                        const imgElement = document.querySelector(`img[src="${imageUrl}"]`);
                        return imgElement ? imgElement.outerHTML : null;
                    },
                    args: [info.srcUrl]
                });

                const imageHTML = results[0]?.result;

                if (imageHTML) {
                    console.log("Image HTML:", imageHTML);
                    await pasteToStorage(imageHTML, tab.url); // Pass tab.url
                } else {
                    console.log("Could not get image HTML!");
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            alert("Could not retrieve HTML for the image.");
                        }
                    });
                }
            } catch (error) {
                console.error("Error in executing script or retrieving image HTML:", error);
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (errorMessage) => {
                        alert("An error occurred: " + errorMessage);
                    },
                    args: [error.message || "Unknown error"]
                });
            }
        } else {
            console.log("Context menu item clicked, but was not an image.");
        }
    }
});