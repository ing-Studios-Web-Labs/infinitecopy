let storageMode = chrome.storage.sync;
let storageString;
let imageStorageState;

function displayFooterText() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const footerText = document.getElementById('footer-text');
    footerText.textContent = `©${currentYear} (ing) Studios Web Labs`;
}

async function retrieveTheme() {
    const storageKey = "extensionTheme";
    try {
        // 1. Get the existing array
        const result = await storageMode.get(storageKey);
        let themeColor = result[storageKey] || []; // Initialize as empty array if not found
        const root = document.documentElement; // Represents the :root pseudo-class (<html> element)
        root.style.setProperty('--primary-color', themeColor[0]);
        root.style.setProperty('--primary-light', themeColor[1]);
        root.style.setProperty('--primary-dark', themeColor[2]);
        root.style.setProperty('--primary-darkest', themeColor[3]);
        root.style.setProperty('--secondary-color', themeColor[4]);
        root.style.setProperty('--background-color', themeColor[5]);
        root.style.setProperty('--accent-color', themeColor[6]);
        console.log('Primary color changed to:', themeColor[0]);
        let colourName;
        if (['#2196F3', '#64B5F6', '#1976D2', '#0D47A1', '#03A9F4', '#E3F2FD'].includes(themeColor[0])) {
            colourName = 'blue';
        } else if (themeColor[0] === '#F44336') {
            colourName = 'red';
        } else if (themeColor[0] === '#9C27B0') {
            colourName = 'purple';
        } else if (themeColor[0] === '#4CAF50') {
            colourName = 'green';
        } else if (themeColor[0] === '#FFEB3B') {
            colourName = 'yellow';
        } else {
            colourName = 'blue'; // Default to blue if color not explicitly matched
        }
        changeFavicon(colourName);
    } catch (error) {
        console.error("Error fetching array:", error);
    }
}

function checkColor(currentColor) {
    let hexColor;
    if (currentColor == 'blue') {
        hexColor = ['#2196F3','#64B5F6','#1976D2','#0D47A1','#03A9F4','#E3F2FD','#FFC107'];
    }
    if (currentColor == 'red') {
        hexColor = ['#F44336','#e57373','#d32f2f','#B71C1C','#e91e63','#ffebee','#4CAF50'];
    }
    if (currentColor == 'purple') {
        hexColor = ['#9C27B0','#BA68C8','#7B1FA2','#4A148C','#673AB7','#F3E5F5','#FFEB3B'];
    }
    if (currentColor == 'green') {
        hexColor = ['#4CAF50','#81C784','#388E3C','#1B5E20','#8BC34A','#E8F5E9','#f44336'];
    }
    if (currentColor == 'yellow') {
        hexColor = ['#FFEB3B','#FFF176','#FBC02D','#F57F17','#FFC107','#FFFDE7','#9C27B0'];
    }
    return hexColor;
}

function getHoveredColor() {
    const container = document.getElementById('theme-options');
    let hoveredElementId = null; // Variable to store the ID

    // Add a 'mouseover' event listener to the container (for when the mouse enters an element)
    container.addEventListener('mouseover', function(event) {
        // Check if the hovered element (event.target) has the class 'my-class'
        if (event.target.classList.contains('theme-style')) {
            // Get the ID of the hovered element
            hoveredElementId = event.target.id;
            console.log('Mouseover - Hovered ID:', hoveredElementId);
            const headerColor = checkColor(hoveredElementId)[0];
            const themeHeader = document.getElementById('theme-header');
            themeHeader.style.color = headerColor;
            const pageHeader = document.getElementsByTagName('header');
            for (const header of pageHeader) {
                header.style.backgroundColor = headerColor;
            }
        }
    });

    // Add a 'mouseout' event listener to the container (for when the mouse leaves an element)
    container.addEventListener('mouseout', function(event) {
        // Check if the element the mouse is leaving has the class 'my-class'
        if (event.target.classList.contains('theme-style')) {
            console.log('Mouseout - Left ID:', event.target.id);
            hoveredElementId = null;
            const themeHeader = document.getElementById('theme-header');
            themeHeader.style.color = 'var(--primary-color)';
            const pageHeader = document.getElementsByTagName('header');
            for (const header of pageHeader) {
                header.style.backgroundColor = 'var(--primary-color)';
            }
        }
    });
}

async function saveTheme(theme) {
    const storageKey = "extensionTheme";
    try {
        await storageMode.set({ [storageKey]: theme });
        console.log("Array saved successfully:", theme);
        showAlert('Theme changed successfully.');
        chrome.runtime.sendMessage({ action: "updateExtensionTheme" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message to background:", chrome.runtime.lastError.message);
            } else {
                console.log("Background response:", response);
            }
        });
    } catch (error) {
        console.error("Error setting array:", error);
        showAlert('An unexpected error occurred while changing the theme, please try again.');
    }
}

function changeTheme() {
    const container = document.getElementById('theme-options');
    let clickedElementId = null; // Variable to store the ID

    // Add a 'mouseover' event listener to the container (for when the mouse enters an element)
    container.addEventListener('click', function(event) {
        // Check if the hovered element (event.target) has the class 'my-class'
        if (event.target.classList.contains('theme-style')) {
            // Get the ID of the hovered element
            clickedElementId = event.target.id;
            console.log('Click - Clicked ID:', clickedElementId);
            const themeColor = checkColor(clickedElementId);
            const root = document.documentElement; // Represents the :root pseudo-class (<html> element)
            // Generate a random color
            root.style.setProperty('--primary-color', themeColor[0]);
            root.style.setProperty('--primary-light', themeColor[1]);
            root.style.setProperty('--primary-dark', themeColor[2]);
            root.style.setProperty('--primary-darkest', themeColor[3]);
            root.style.setProperty('--secondary-color', themeColor[4]);
            root.style.setProperty('--background-color', themeColor[5]);
            root.style.setProperty('--accent-color', themeColor[6]);
            console.log('Primary color changed to:', themeColor[0]);
            saveTheme(themeColor);
            changeFavicon(clickedElementId);
        }
    });
}

function showAlert(textData, inputData = null) {
    console.log(`inputData is:`, inputData);
    if (inputData != null) {
        if (inputData == 'addText') {
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
                    handleAddText(inputValue);

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

function checkExportSuccess(bool) {
    if (bool === true) {
        showAlert('Data exported successfully!')
    } else {
        showAlert('Error in exporting data, please try again.')
    }
}

async function exportAllStorageDataToJson() {
    const exportButton = document.getElementById('export-data-btn');
    exportButton.addEventListener('click', async() => {
        try {
            // 1. Retrieve all items from storageMode
            const syncItems = await chrome.storage.sync.get(null);
            const localItems = await chrome.storage.local.get(null);

            // --- Start Modification to ensure exportDate is first ---
            const exportDate = new Date().toISOString(); // ISO 8601

            // Create a new object and add exportDate as the first property
            const dataToExport = {
                exportDate: exportDate, // This will be the first property
                syncItems: syncItems,
                localItems: localItems
            };

            // Add all original properties from allItems to dataToExport.
            // This ensures existing data is included, and their order will follow after exportDate.
            Object.assign(dataToExport);

            // Optional: You can now remove specific properties from dataToExport if desired
            // For example, if 'extensionTheme' is sensitive or not for export:
            // delete dataToExport.extensionTheme;


            // --- End Modification ---

            // 2. Convert the modified and reordered object to a pretty-printed JSON string
            const allItemsJsonString = JSON.stringify(dataToExport, null, 2);

            console.log("Preparing to download storageMode data...");

            // 3. Create a Blob from the JSON string
            const blob = new Blob([allItemsJsonString], { type: 'application/json' });

            // 4. Create a temporary URL for the Blob
            const url = URL.createObjectURL(blob);

            // 5. Create a temporary anchor element (<a>)
            const a = document.createElement('a');
            a.href = url;
            a.download = `InfiniteCopy_data_export_on_${exportDate.replace(/[:.]/g, '-')}.json`; // More file-system friendly name

            // 6. Programmatically click the anchor element to trigger the download
            document.body.appendChild(a);
            a.click();

            // 7. Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log("Download initiated successfully.");
            if (typeof checkExportSuccess === 'function') {
                checkExportSuccess(true); // Indicate success
            } else {
                console.warn("checkExportSuccess function not defined.");
            }
        } catch (error) {
            console.error("Error retrieving or downloading storage data:", error);
            if (typeof checkExportSuccess === 'function') {
                checkExportSuccess(false); // Indicate failure
            } else {
                console.warn("checkExportSuccess function not defined.");
            }
        }
    });
}

function changeFavicon(color) {
    const pageFavicon = document.getElementById('page-favicon');
    pageFavicon.href = `../assets/logo_${color}.ico`;
}

function openSourceCode() {
    const openSourceCodeBtn = document.getElementById('open-source-code');
    openSourceCodeBtn.addEventListener('click', () => {
        const linkURL = 'https://github.com/ing-studios-web-labs/infinitecopy'
        try {
            chrome.tabs.create({ url: linkURL, active: true }, (newTab) => {
                console.log('Opened new tab with ID:', newTab.id, 'and URL:', newTab.url);
                // Optional: You can do something with the newTab object here
            });
        } catch (error) {
            console.error('Failed to open URL:', error);
            showAlert('Failed to open URL.');
        }
    });
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
    document.querySelectorAll('.theme-style').forEach(button => {
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

async function initializeSwitchState() {
    const storageSwitch = document.getElementById('syncStorageSwitch');

    // Ensure the switch element exists
    if (!storageSwitch) {
        console.error("Error: Element with ID 'syncStorageSwitch' not found for initialization.");
        return;
    }

    // Get the current 'storageMode' from local storage
    const data = await chrome.storage.local.get('storageMode');
    // If 'storageMode' is not set yet, default to 'local'
    const currentMode = data.storageMode || 'sync';

    // Set the switch's checked state based on the current mode
    // If currentMode is 'sync', switch.checked will be true.
    // If currentMode is 'local', switch.checked will be false.
    storageSwitch.checked = (currentMode === 'sync');

    console.log(`Initial storage mode from storage: ${currentMode}`);
    console.log(`Switch initialized to: ${storageSwitch.checked ? 'Sync (checked)' : 'Local (unchecked)'}`);

    // Attach the event listener AFTER the initial state is set.
    // This prevents the switchStorageMode from firing immediately upon programmatic
    // setting of `checked` if `dispatchEvent` was used (which isn't needed here).
    if (currentMode === 'sync') {
        const storeImageEfficientSwitch = document.getElementById('base64Switch');
        storeImageEfficientSwitch.checked = false;
        greyOutSwitch('store-images-efficiently-container', true);
    } else {
        greyOutSwitch('store-images-efficiently-container', false);
    }
    storageSwitch.addEventListener('change', switchStorageMode);
}

async function checkStorageMode() {
    const data = await chrome.storage.local.get('storageMode');
    // Check for the *string value* of the mode preference
    if (data.storageMode === 'sync') { // Assuming you save "sync" or "local" as strings
        console.log('Storage mode is valid: sync');
        storageMode = chrome.storage.sync; // Assign the actual storageMode object
        storageString = 'sync'
    } else if (data.storageMode === 'local') { // Explicitly check for "local"
        console.log('Storage mode is valid: local');
        storageMode = chrome.storage.local; // Assign the actual chrome.storage.local object
        storageString = 'local'
    } else {
        // If not set or invalid, default to 'sync' (or 'local', align with your log)
        console.log('Mode is not set or has an unexpected value. Defaulting to sync.');
        storageMode = chrome.storage.sync;
        storageString = 'sync'
        // Optionally, save this default preference for next time
        await chrome.storage.local.set({ 'storageMode': 'sync' }); 
    }
}

function greyOutSwitch(toggleId, greyOut) {
    const toggle = document.getElementById(toggleId);
    if (greyOut === true) {
        toggle.classList.add('greyed-out');
        console.log(`Toggle with id ${toggleId} greyed out successfully.`);
    } else if (greyOut === false) {
        toggle.classList.remove('greyed-out');
        console.log(`Toggle with id ${toggleId} ungreyed out successfully.`);
    }
}

async function transferStorage(sourceStorage, newStorage) {
    const keysToExcludeFromTransfer = ['storageMode'];

    if (newStorage === chrome.storage.local) {
        // SCENARIO: Switching FROM sync TO local
        console.log(`Clearing ALL data from destination storage before transfer...`);
        const allLocalKeys = Object.keys(await chrome.storage.local.get(null));

        // Step 2: Filter these keys to identify which ones should be cleared
        const keysToRemoveFromLocal = allLocalKeys.filter(key => !keysToExcludeFromTransfer.includes(key));

        // Step 3: Remove ONLY the filtered keys from chrome.storage.local
        if (keysToRemoveFromLocal.length > 0) {
            console.log(`Clearing specific data keys from destination (local) storage:`, keysToRemoveFromLocal);
            await newStorage.remove(keysToRemoveFromLocal); // newStorage here is chrome.storage.local
        } else {
            console.log(`No non-preference keys to clear from destination (local) storage.`);
        }

        const items = await sourceStorage.get(null);
        console.log(`Successfully retrieved ${Object.keys(items).length} items from source storage.`);
        console.log('Source items:', items);

        const filteredItems = { ...items };
        for (const key of keysToExcludeFromTransfer) {
            delete filteredItems[key];
        }

        await newStorage.set(filteredItems);
        console.log(`Successfully copied data to destination storage.`);
        console.log(`Source storage data remains in the cloud for other devices.`);
        greyOutSwitch('store-images-efficiently-container', false);
    } else if (newStorage === chrome.storage.sync) {
        // SCENARIO: Switching FROM local TO sync

        // 1. Get current items from the SOURCE (local) storage.
        const localItems = await sourceStorage.get(null);
        console.log(`Successfully retrieved ${Object.keys(localItems).length} items from source (local) storage.`);
        console.log('Source (local) items:', localItems);

        // 2. Get the existing items from the DESTINATION (sync) storage.
        const syncItems = await newStorage.get(null);
        console.log(`Successfully retrieved ${Object.keys(syncItems).length} items from destination (sync) storage.`);
        console.log('Destination (sync) items:', syncItems);

        // Prepare the data from local to be merged, excluding 'storageMode'
        const itemsToCopyToSync = { ...localItems };
        for (const key of keysToExcludeFromTransfer) {
            delete itemsToCopyToSync[key];
        }

        // Initialize merged data with whatever came from local storage
        const mergedData = { ...itemsToCopyToSync };

        // MERGE LOGIC FOR SPECIFIC KEYS (e.g., 'copiedItems')
        if (itemsToCopyToSync.hasOwnProperty('copiedItems') && Array.isArray(itemsToCopyToSync.copiedItems) &&
            syncItems.hasOwnProperty('copiedItems') && Array.isArray(syncItems.copiedItems)) {

            const combined = [...itemsToCopyToSync.copiedItems, ...syncItems.copiedItems];
            const uniqueCopiedItemsMap = new Map(); // Map to store unique items by ID, prioritizing newer timestamp

            for (const item of combined) {
                if (item && item.timestamp) { // Ensure item and its ID exist
                    const existingItem = uniqueCopiedItemsMap.get(item.timestamp);

                    if (!existingItem) {
                        // If no item with this ID exists yet, add it
                        uniqueCopiedItemsMap.set(item.timestamp, item);
                    } else {
                        // If an item with this ID exists, compare timestamps
                        // Ensure both items have a timestamp for comparison
                        const existingTimestamp = typeof existingItem.timestamp === 'number' ? existingItem.timestamp : 0;
                        const newItemTimestamp = typeof item.timestamp === 'number' ? item.timestamp : 0;

                        if (newItemTimestamp > existingTimestamp) {
                            // If the new item is newer, replace the existing one
                            uniqueCopiedItemsMap.set(item.timestamp, item);
                        }
                        // If newItemTimestamp is not newer, keep the existing one (do nothing)
                    }
                } else {
                    console.warn("Item in 'copiedItems' array is missing 'id' property or is invalid:", item);
                    // Optionally, handle items without an ID if they should still be included
                    // For example, if you want to include them as unique items:
                    // uniqueCopiedItemsMap.set(Symbol(), item); // Use a unique symbol as key
                }
            }
            mergedData.copiedItems = Array.from(uniqueCopiedItemsMap.values());
            console.log('Merged copiedItems (unique by ID, newer timestamp prioritized):', mergedData.copiedItems);

        } else if (syncItems.hasOwnProperty('copiedItems') && Array.isArray(syncItems.copiedItems)) {
            // If local didn't have copiedItems, but sync did, use sync's.
            mergedData.copiedItems = syncItems.copiedItems;
        } else if (itemsToCopyToSync.hasOwnProperty('copiedItems') && Array.isArray(itemsToCopyToSync.copiedItems)) {
            // If sync didn't have copiedItems, but local did, use local's.
            mergedData.copiedItems = itemsToCopyToSync.copiedItems;
        }
        // Add more specific merge logic for other keys if needed (e.g., 'extensionTheme')
        // For 'extensionTheme', you might decide to always let the local device's theme win,
        // or have a more complex logic. Your current setup will overwrite it from local.
        // Example for extensionTheme (if you wanted to KEEP sync's theme unless local had a new one):
        // if (!mergedData.hasOwnProperty('extensionTheme') && syncItems.hasOwnProperty('extensionTheme')) {
        //    mergedData.extensionTheme = syncItems.extensionTheme;
        // }


        // 3. Set the MERGED items into the DESTINATION (sync) storage.
        // This will update existing sync items with the merged values.
        await newStorage.set(mergedData);
        console.log(`Successfully copied and merged data to destination storage.`);
        greyOutSwitch('store-images-efficiently-container', true);
        // 4. Clear the transferred items from the SOURCE (local) storage AFTER successful copy.
        // This cleans up local storage, as sync is now the source of truth for these items.
        // We clear only the keys that were successfully transferred to sync.
        if (Object.keys(itemsToCopyToSync).length > 0) { // Check if there were any items from local to sync
            const keysToClearFromLocal = Object.keys(itemsToCopyToSync).filter(key => key !== 'storageMode'); // Clear only the keys that were involved in the transfer (excluding storageMode)
            if (keysToClearFromLocal.length > 0) {
                console.log(`Clearing transferred data (excluding storageMode) from source (local) storage.`);
                await sourceStorage.remove(keysToClearFromLocal);
            } else {
                console.log(`No items (excluding storageMode) to clear from source (local) storage after transfer.`);
            }
        }
    }
}

async function switchStorageMode(event) { // <-- Pass the 'event' object
    const storageSwitch = event.target; // Get the switch element from the event that triggered it

    // No need for 'if (!storageSwitch)' check here because it's the event.target
    // and initializeSwitchState already ensures it exists before attaching listener.

    const data = await chrome.storage.local.get('storageMode');

    let sourceStorageObject;
    let destinationStorageObject;

    const newModeString = storageSwitch.checked ? 'sync' : 'local';

    if (newModeString === 'sync') {
        sourceStorageObject = chrome.storage.local;
        destinationStorageObject = chrome.storage.sync;
        confirmMessage = "Switching to Sync Storage will copy your local settings to the cloud and merge them with existing synced settings. Your local settings will then be cleared as Sync becomes the primary storage for this device. Proceed?";
    } else { // newModeString === 'local'
        sourceStorageObject = chrome.storage.sync;
        destinationStorageObject = chrome.storage.local;
        confirmMessage = "Switching to Local Storage will copy your synced settings to this device and replace all existing local-only settings. Your synced settings will remain in the cloud for other devices. This device will then use local settings. Proceed?";
    }

    try {
        await transferStorage(sourceStorageObject, destinationStorageObject);
        await chrome.storage.local.set({ 'storageMode': newModeString });

        // Update the global 'storageMode' variable after a successful transfer
        storageMode = destinationStorageObject;
        console.log(`Global 'storageMode' variable updated to: ${newModeString === 'sync' ? 'chrome.storage.sync' : 'chrome.storage.local'}.`);
        displayStorageInfo();
        showAlert(`Successfully switched to ${newModeString} storage!`);
        if (newModeString === 'sync') {
            setImageStorageMode('srcurl');
        } else if (newModeString === 'local') {
            checkImageStorageType();
        }
    } catch (error) {
        let userFriendlyError;
        console.error('Failed to complete storage mode switch:', error);
        storageSwitch.checked = !storageSwitch.checked; // Revert switch state
        if (error.message.includes('quota exceeded')) {
            userFriendlyError = 'Storage size is too big.'
        }
        showAlert(`Failed to switch storage mode. ${userFriendlyError}`);
    }
    // The inner addEventListener is now GONE from here.
}

// Function to get storage info (now returns a Promise)
function getStorageInfo() {
    return new Promise((resolve, reject) => {
        storageMode.getBytesInUse(null, function(bytes) {
            if (chrome.runtime.lastError) {
                // Handle potential errors from the Chrome API
                console.error("Error getting bytes in use:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                // Log the storage usage
                const storageString = (storageMode === chrome.storage.sync) ? "sync" : "local";
                console.log(`${storageString.charAt(0).toUpperCase()}${storageString.slice(1)} storage used: ${bytes} bytes`);
                resolve(bytes); // Resolve the promise with the bytes used
            }
        });
    });
}

// Function to display storage info
async function displayStorageInfo() {
    let storageUsedString;
    let maxStorage;
    let maxStorageString;
    const progressBarFill = document.getElementById('expressiveProgressBarFill');

    if (!progressBarFill) {
        console.error("Progress bar fill element not found!");
        return; // Exit if the element isn't there
    }

    // Determine maxStorage based on the currently set storageMode
    if (storageMode === chrome.storage.sync) {
        maxStorage = 102400; // 100KB
        maxStorageString = '100KB';
    } else if (storageMode === chrome.storage.local) {
        maxStorage = 10485760; // 5MB
        maxStorageString = '10MB';
    } else {
        console.error("storageMode is not defined or is invalid.");
        progressBarFill.style.width = `0%`;
        progressBarFill.removeAttribute('data-progress-active');
        if (progressValueText) progressValueText.textContent = `Error`;
        return;
    }

    try {
        // Await the result of the asynchronous getStorageInfo function
        const storageUsed = await getStorageInfo();
        if (storageUsed >= 1048576) { // Check for MB first (1 MB = 1024 * 1024 bytes)
            storageUsedString = `${(storageUsed / 1048576).toFixed(2)}MB`;
        } else if (storageUsed >= 1024) { // Then check for KB (1 KB = 1024 bytes)
            storageUsedString = `${(storageUsed / 1024).toFixed(2)}KB`;
        } else { // Otherwise, it's in Bytes
            storageUsedString = `${storageUsed}B`;
        }
        let percentageStorageUsed = (storageUsed / maxStorage) * 100;

        // Clamp the percentage to be between 0 and 100
        percentageStorageUsed = Math.max(0, Math.min(100, percentageStorageUsed));

        progressBarFill.style.width = `${percentageStorageUsed}%`;

        if (percentageStorageUsed > 0) {
            progressBarFill.setAttribute('data-progress-active', '');
        } else {
            progressBarFill.removeAttribute('data-progress-active');
        }
        const storageUsedPrimary = document.getElementById('storage-used-primary');
        const storageUsedText = document.getElementById('storage-used-secondary');
        storageUsedPrimary.textContent = storageUsedString;
        storageUsedText.textContent = ` of ${maxStorageString} used (${Math.round(percentageStorageUsed)}%)`
    } catch (error) {
        console.error("Error displaying storage info:", error);
        // Handle the error visually, e.g., set bar to 0 or show an error message
        progressBarFill.style.width = `0%`;
        progressBarFill.removeAttribute('data-progress-active');
        if (progressValueText) progressValueText.textContent = `Error`;
    }
}

function recieveStorageUpdate() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "updateStorageInfo") {
            console.log("Received setting update from popup:", message.data);
            displayStorageInfo();

            // Send a response back to the sender (the popup)
            sendResponse({ success: true, message: "Setting updated on options page." });
        }
    });
}

async function setImageStorageMode(newImageMode) {
    if (storageMode === chrome.storage.local) {
        if (newImageMode === 'srcurl' || newImageMode === 'base64') {
            await chrome.storage.local.set({ 'imageStorageMode': newImageMode });
            await chrome.storage.local.set({ 'lastImageStorageMode': newImageMode });

            imageStorageState = newImageMode;
            initializeImageStorageSwitch(newImageMode);
            displayStorageInfo();
        } else {
            console.warn('Invalid image storage mode requested:', newImageMode);
        }
    } else {
        const prevLocalImageModeData = await chrome.storage.local.get('imageStorageMode');
        const prevLocalImageMode = prevLocalImageModeData.imageStorageMode;

        const modeToSaveAsLast = (prevLocalImageMode === 'base64' || prevLocalImageMode === 'srcurl')
            ? prevLocalImageMode : 'srcurl';

        await chrome.storage.local.set({ 'lastImageStorageMode': modeToSaveAsLast });
        await chrome.storage.local.set({ 'imageStorageMode' : 'srcurl' });

        await checkImageStorageType();
        displayStorageInfo();
    }
}

function initializeImageStorageSwitch(storageState) {
    const imgStorageStateSwitch = document.getElementById('base64Switch');
    if (imgStorageStateSwitch) {
        imgStorageStateSwitch.checked = (storageState === 'base64');
    }
}

function initializeImageStorageState(storageState) {
    if (storageState === 'srcurl' || storageState === 'base64') {
        imageStorageState = storageState;
        initializeImageStorageSwitch(storageState);
    } else {
        imageStorageState = 'srcurl';
        initializeImageStorageSwitch('srcurl');
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

function toggleImageMode() {
    const imageModeSwitch = document.getElementById('base64Switch');
    if (imageModeSwitch) {
        imageModeSwitch.addEventListener('change', () => {
            if (imageModeSwitch.checked === true) {
                setImageStorageMode('base64');
            } else {
                setImageStorageMode('srcurl');
            }
        });
    } else {
        console.warn('imageModeSwitch was not found or defined.');
    }
}

async function initializePage() {
    await initializeSwitchState();
    await checkStorageMode();
    await checkImageStorageType();
    recieveStorageUpdate();
    retrieveTheme();
    displayFooterText();
    buttonRippleEffect();
    getHoveredColor();
    changeTheme();
    exportAllStorageDataToJson();
    openSourceCode();
    displayStorageInfo();
    toggleImageMode();
}

document.addEventListener('DOMContentLoaded', initializePage);