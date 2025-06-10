// Global variable to store the current filter state
// Can be 'all', 'text', or 'image'
let currentFilter = 'all'; 

const initializeMDC = () => {
    const switches = document.querySelectorAll('.mdc-switch');
    switches.forEach(switchElement => {
        new mdc.switch.MDCSwitch(switchElement);
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMDC);
} else {
    initializeMDC();
}

async function retrieveTheme() {
    const storageKey = "extensionTheme";
    try {
        const result = await chrome.storage.sync.get(storageKey);
        let themeColor = result[storageKey] || [];
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

/**
 * Filters and displays copied items based on the currentFilter.
 */
function checkCopiedItems() {
    const copied_items_div = document.getElementById('copied-items');
    chrome.storage.sync.get('copiedItems', function(data) {
        const copiedItems = data.copiedItems || [];
        console.log('Retrieved copiedItems:', copiedItems);

        copied_items_div.innerHTML = ''; // Clear existing items

        // Filter the items based on the currentFilter
        const filteredItems = copiedItems.filter(value => {
            if (currentFilter === 'all') {
                return true; // Show all items
            } else if (currentFilter === 'text') {
                return !value.includes('<img'); // Show only text items
            } else if (currentFilter === 'image') {
                return value.includes('<img'); // Show only image items
            }
            return true; // Default to showing all if filter is unknown
        });

        if (filteredItems.length > 0) {
            filteredItems.forEach(function(value, index) {
                const copied_list = document.createElement('div');
                copied_list.classList.add('copied-list');
                copied_list.dataset.index = index;
                copied_list.dataset.rawValue = value;

                const contentElement = document.createElement('div');
                if (value.includes('<img')) {
                    const imgdiv = document.createElement('div');
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = value;
                    const imgElement = tempDiv.querySelector('img');

                    if (imgElement) {
                        imgdiv.innerHTML = `<h2>${index+1}:</h2>`;
                        const displayedImg = document.createElement('img');
                        displayedImg.src = imgElement.src;
                        displayedImg.alt = imgElement.alt || 'Copied Image';
                        displayedImg.style.width = '100%';
                        displayedImg.style.height = 'auto';
                        displayedImg.style.borderRadius = '25px';
                        imgdiv.appendChild(displayedImg);
                    } else {
                        imgdiv.innerHTML = `<h2>${index+1}:</h2>Image (HTML snippet)`;
                    }
                    contentElement.appendChild(imgdiv);

                } else {
                    const copiedText = document.createElement('h2');
                    copiedText.textContent = `${index + 1}: ${value}`;
                    contentElement.appendChild(copiedText);
                }
                copied_list.appendChild(contentElement);

                const deleteButton = document.createElement('div');
                deleteButton.classList.add('button-style', 'delete-button');
                deleteButton.innerHTML = `
                    <span class="material-symbols-outlined">
                        close
                    </span>
                `;
                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    handleDeleteItem(index);
                });
                copied_list.appendChild(deleteButton);

                copied_items_div.appendChild(copied_list);
            });

            const copiedLists = copied_items_div.querySelectorAll('.copied-list');
            copiedLists.forEach(item => {
                item.addEventListener('click', handleCopiedItemClick);
            });

        } else {
            const message = document.createElement('p');
            message.classList.add('no-copied-msg');
            message.innerHTML = `No copied text!\nJust copy text and press the paste button below to get started!`;
            copied_items_div.appendChild(message);
        }
    });
}

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
            if (clipboardTypes.includes('text/html') && clipboardTypes.includes('image/png')) {
                console.log('PNG Image with HTML data detected!');
                const htmlBlob = await clipboardItem.getType('text/html');
                const htmlText = await htmlBlob.text();
                console.log('HTML Text:', htmlText);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlText;
                const imgElement = tempDiv.querySelector('img');
                if (imgElement && imgElement.src) {
                    pasteItem(htmlText);
                } else {
                    pasteItem(htmlText);
                }
            } else if (clipboardTypes.includes('text/plain')) {
                pasteTextFromClipboard();
            }
        }
    } catch (error) {
        console.error('Failed to read clipboard:', error);
    }
}

function handleDeleteItem(index) {
    console.log('Deleting item at index:', index);
    chrome.storage.sync.get('copiedItems', function(data) {
        const copiedItems = data.copiedItems || [];
        const updatedItems = copiedItems.filter((_, i) => i !== index);
        chrome.storage.sync.set({ 'copiedItems': updatedItems }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error updating storage after deletion:', chrome.runtime.lastError);
            } else {
                console.log('Item deleted and storage updated.');
                checkCopiedItems();
            }
        });
    });
}

async function handleCopiedItemClick(event) {
    const hoveredElement = event.target.closest('.copied-list');
    if (hoveredElement) {
        const rawValue = hoveredElement.dataset.rawValue;

        if (rawValue.includes('<img')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawValue;
            const imgElement = tempDiv.querySelector('img');

            if (imgElement && imgElement.src) {
                try {
                    const imageUrl = imgElement.src;
                    const response = await fetch(imageUrl);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch image: ${response.statusText}`);
                    }
                    const imageBlob = await response.blob();
                    const clipboardItem = new ClipboardItem({
                        [imageBlob.type]: imageBlob,
                    });
                    await navigator.clipboard.write([clipboardItem]);
                    showAlert('Image copied to clipboard successfully!');
                } catch (error) {
                    console.error('Failed to copy image to clipboard:', error);
                    showAlert(`Failed to copy image: ${error.message}. Check console for details.`);
                    try {
                        await navigator.clipboard.writeText(rawValue);
                        showAlert('Failed to copy image, copied HTML instead.');
                    } catch (textCopyError) {
                        console.error('Also failed to copy HTML:', textCopyError);
                    }
                }
            } else {
                try {
                    await navigator.clipboard.writeText(rawValue);
                    showAlert('Image HTML copied to clipboard (no valid image source found).');
                } catch (textCopyError) {
                    console.error('Failed to copy HTML:', textCopyError);
                    showAlert('Failed to copy HTML.');
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

async function handleAddText(value) {
    try {
        chrome.storage.sync.get('copiedItems', function(data) {
            const copiedItems = data.copiedItems || [];
            copiedItems.unshift(value);

            chrome.storage.sync.set({ 'copiedItems': copiedItems }, function() {
                console.log('Text added and saved:', value);
                checkCopiedItems();
            });
        });
    } catch (error) {
        console.error('Failed to read clipboard:', error);
    }
}

function showAlert(textData, inputData = null) {
    console.log(`inputData is:`, inputData);
    if (inputData != null) {
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
}

async function pasteTextFromClipboard() {
    try {
        const pastedText = await navigator.clipboard.readText();
        chrome.storage.sync.get('copiedItems', function(data) {
            const copiedItems = data.copiedItems || [];
            copiedItems.unshift(pastedText);

            chrome.storage.sync.set({ 'copiedItems': copiedItems }, function() {
                console.log('Text pasted and saved:', pastedText);
                checkCopiedItems();
            });
        });
    } catch (error) {
        console.error('Failed to read clipboard:', error);
    }
}

function addTextEventListener() {
    const addTextBtn = document.getElementById('add-text-btn');
    addTextBtn.addEventListener('click', () => {
        showAlert('What would you like to input?', true);
    });
}

function clearAllText() {
    const clearAllBtn = document.getElementById('clear-all-btn');
    clearAllBtn.addEventListener('click', function() {
        chrome.storage.sync.remove('copiedItems', function() {
            showAlert(`All copied items cleared successfully.`);
            checkCopiedItems();
        });
    });
}

async function pasteItem(itemValue) {
    chrome.storage.sync.get('copiedItems', function(data) {
        const copiedItems = data.copiedItems || [];
        copiedItems.unshift(itemValue);
        chrome.storage.sync.set({ 'copiedItems': copiedItems }, function() {
            console.log('Item pasted and saved:', itemValue);
            checkCopiedItems();
        });
    });
}

function openSettings() {
    const settingsButton = document.getElementById('settings-icon');
    settingsButton.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('../settings/settings.html') });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    openSettings();
    retrieveTheme();
    checkCopiedItems();
    displayFooterText();
    pasteTextEventListener();
    addTextEventListener();
    clearAllText();

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
});
