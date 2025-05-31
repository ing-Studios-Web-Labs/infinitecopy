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

function checkCopiedItems() {
    const copied_items_div = document.getElementById('copied-items');
    chrome.storage.sync.get('copiedItems', function(data) {
        const copiedItems = data.copiedItems || [];
        console.log('Retrieved copiedItems:', copiedItems);

        copied_items_div.innerHTML = '';

        if (copiedItems.length > 0) {
            copiedItems.forEach(function(value, index) {
                const copied_list = document.createElement('div');
                copied_list.classList.add('copied-list');
                copied_list.dataset.index = index;
                // Store the raw value for later use, including HTML for images
                copied_list.dataset.rawValue = value;

                const contentElement = document.createElement('div');
                if (value.includes('<img')) {
                    const imgdiv = document.createElement('div');
                    // Create a temporary div to parse the HTML string and get the actual img element
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = value;
                    const imgElement = tempDiv.querySelector('img');

                    if (imgElement) {
                        // Display the image
                        imgdiv.innerHTML = `<h2>${index+1}:</h2>`;
                        const displayedImg = document.createElement('img');
                        displayedImg.src = imgElement.src; // Use the actual src for display
                        displayedImg.alt = imgElement.alt || 'Copied Image';
                        displayedImg.style.width = '100%';
                        displayedImg.style.height = 'auto';
                        displayedImg.style.borderRadius = '25px';
                        imgdiv.appendChild(displayedImg);
                    } else {
                        // Fallback if img tag is malformed or not found
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

async function checkClipboardType() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
            const clipboardTypes = clipboardItem.types;
            if (clipboardTypes.includes('text/html') && clipboardTypes.includes('image/png')) {
                console.log('PNG Image with HTML data detected!');
                // For images, we want to store the HTML string to preserve the <img> tag structure
                const htmlBlob = await clipboardItem.getType('text/html');
                const htmlText = await htmlBlob.text();
                console.log('HTML Text:', htmlText);
                // Extract the image source from the HTML to store
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = htmlText;
                const imgElement = tempDiv.querySelector('img');
                if (imgElement && imgElement.src) {
                    pasteItem(htmlText); // Store the full HTML string for display
                } else {
                    pasteItem(htmlText); // Fallback if no valid img src found
                }
            } else if (clipboardTypes.includes('text/plain')) {
                pasteTextFromClipboard(); // Renamed to avoid shadowing
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
                checkCopiedItems(); // Re-render the list
            }
        });
    });
}

// *** MODIFIED FUNCTION TO HANDLE IMAGE COPYING ***
async function handleCopiedItemClick(event) {
    const hoveredElement = event.target.closest('.copied-list');
    if (hoveredElement) {
        const rawValue = hoveredElement.dataset.rawValue; // Get the raw stored value

        if (rawValue.includes('<img')) {
            // It's an image, attempt to copy the image data
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = rawValue;
            const imgElement = tempDiv.querySelector('img');

            if (imgElement && imgElement.src) {
                try {
                    const imageUrl = imgElement.src;

                    // Fetch the image data
                    const response = await fetch(imageUrl);
                    if (!response.ok) {
                        // If cross-origin without CORS headers, fetch might fail.
                        // In a Chrome Extension, you might have more flexibility with permissions
                        // but it's good to be aware.
                        throw new Error(`Failed to fetch image: ${response.statusText}`);
                    }
                    const imageBlob = await response.blob();

                    // Create ClipboardItem and write to clipboard
                    const clipboardItem = new ClipboardItem({
                        [imageBlob.type]: imageBlob,
                    });
                    await navigator.clipboard.write([clipboardItem]);
                    showAlert('Image copied to clipboard successfully!');
                } catch (error) {
                    console.error('Failed to copy image to clipboard:', error);
                    showAlert(`Failed to copy image: ${error.message}. Check console for details.`);
                    // Fallback to copying HTML if image copy fails (e.g., CORS)
                    try {
                        await navigator.clipboard.writeText(rawValue);
                        showAlert('Failed to copy image, copied HTML instead.');
                    } catch (textCopyError) {
                        console.error('Also failed to copy HTML:', textCopyError);
                    }
                }
            } else {
                // If it's an img HTML but no valid src found, copy the HTML as text
                try {
                    await navigator.clipboard.writeText(rawValue);
                    showAlert('Image HTML copied to clipboard (no valid image source found).');
                } catch (textCopyError) {
                    console.error('Failed to copy HTML:', textCopyError);
                    showAlert('Failed to copy HTML.');
                }
            }
        } else {
            // It's plain text, copy as text
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
        await chrome.storage.sync.get('copiedItems', function(data) {
            const copiedItems = data.copiedItems || [];
            copiedItems.unshift(value);

            chrome.storage.sync.set({ 'copiedItems': copiedItems }, function() {
                console.log('Text added and saved:', value);
                checkCopiedItems(); // Re-render the list after pasting
            });
        });
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        // Optionally display an error message to the user
    }
}

function showAlert(textData, inputData = null) {
    console.log(`inputData is:`,inputData);
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
        alertDiv.appendChild(inputPrompt); // inputPrompt is now a child of alertDiv

        const inputElement = document.createElement('input');
        inputElement.classList.add('input-text-input');

        // Append inputElement to alertDiv first
        alertDiv.appendChild(inputElement);
        // Append the entire alertDiv (which now contains the input) to the container
        container.appendChild(alertDiv);
        // Add the 'show-alert' class after it's in the DOM for transitions to work
        setTimeout(() => {
            alertDiv.classList.add('show-alert');
        }, 50);
        // *** THE FIX: Use .focus() here, after the element is in the DOM ***
        inputElement.focus();
        inputElement.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') { // Fixed the assignment operator to comparison '==='
                event.preventDefault(); // Good practice to prevent default Enter behavior

                const inputValue = inputElement.value;
                handleAddText(inputValue); // Assuming handleAddText is defined

                // Immediate removal sequence after Enter press
                alertDiv.classList.remove('show-alert');
                alertDiv.classList.add('fade-out');
                setTimeout(function() {
                    container.removeChild(alertDiv);
                }, 500); // Allow fade-out animation
            }
        });
    } else {
        // Your else block remains the same, as it's not trying to autofocus an input.
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

async function pasteTextFromClipboard() { // Renamed function
    try {
        const pastedText = await navigator.clipboard.readText();
        await chrome.storage.sync.get('copiedItems', function(data) {
            const copiedItems = data.copiedItems || [];
            copiedItems.unshift(pastedText);

            chrome.storage.sync.set({ 'copiedItems': copiedItems }, function() {
                console.log('Text pasted and saved:', pastedText);
                checkCopiedItems(); // Re-render the list after pasting
            });
        });
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        // Optionally display an error message to the user
    }
}

function addTextEventListener() {
    const addTextBtn = document.getElementById('add-text-btn');
    addTextBtn.addEventListener('click', () => {
        showAlert('What would you like to input?', true);
    });
}

function clearAllText(){
    const clearAllBtn = document.getElementById('clear-all-btn');
    clearAllBtn.addEventListener('click', function() {
        chrome.storage.sync.remove('copiedItems', function() {
            showAlert(`All copied items cleared successfully.`);
            checkCopiedItems(); // Re-render after clearing
        });
    });
}

// Consolidated paste function for both text and image HTML
async function pasteItem(itemValue) {
    await chrome.storage.sync.get('copiedItems', function(data) {
        const copiedItems = data.copiedItems || [];
        copiedItems.unshift(itemValue);
        chrome.storage.sync.set({ 'copiedItems': copiedItems }, function() {
            console.log('Item pasted and saved:', itemValue);
            checkCopiedItems(); // Re-render the list after pasting
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    checkCopiedItems();
    displayFooterText();
    pasteTextEventListener(); // Set up the listener for the paste button
    addTextEventListener();
    clearAllText();
});
