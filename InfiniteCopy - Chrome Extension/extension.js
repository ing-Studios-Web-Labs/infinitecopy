let currentClipboard = []; // It's generally better to manage clipboard data through storage

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
        currentClipboard = copiedItems;
        console.log('Retrieved copiedItems:', copiedItems);

        copied_items_div.innerHTML = '';

        if (copiedItems.length > 0) {
            copiedItems.forEach(function(value, index) {
                const copied_list = document.createElement('div');
                copied_list.classList.add('copied-list');
                copied_list.dataset.index = index;
                copied_list.dataset.value = value;

                const copiedText = document.createElement('h2');
                copiedText.textContent = `${index + 1}: ${value}`;
                copied_list.appendChild(copiedText);

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

function handleCopiedItemClick(event) {
    const hoveredElement = event.target.closest('.copied-list');
    if (hoveredElement) {
        const hoveredText = hoveredElement.dataset.value;
        navigator.clipboard.writeText(hoveredText);
        showAlert(`Text '${hoveredText}' copied to successfully clipboard.`);
    }
}

function showAlert(textData) {
    const container = document.getElementById('alert-container');
    if (!container) {
        console.error("Error: 'alert-container' element not found.");
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.classList.add('copy-alert');
    alertDiv.textContent = textData;
    container.appendChild(alertDiv);

    // Trigger the slide-down animation after a small delay
    setTimeout(() => {
        alertDiv.classList.add('show-alert');
    }, 50); // Small delay to ensure initial styles are applied

    setTimeout(function() {
        alertDiv.classList.remove('show-alert'); // Remove the "show" class
        alertDiv.classList.add('fade-out'); // Start fade-out and zoom
        setTimeout(function() {
            container.removeChild(alertDiv);
        }, 500); // 500ms matches the CSS fade-out/zoom transition
    }, 3000);
}

function displayFooterText() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const footerText = document.getElementById('footer-text');
    footerText.textContent = `©${currentYear} (ing) Studios Web Labs`;
}

function pasteTextEventListener() {
    const paste_button = document.getElementById('paste-btn');
    paste_button.addEventListener('click', pasteText);
}

async function pasteText() {
    try {
        const pastedText = await navigator.clipboard.readText();

        chrome.storage.sync.get('copiedItems', function(data) {
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

function clearAllText(){
    const clearAllBtn = document.getElementById('clear-all-btn');
    clearAllBtn.addEventListener('click', function() {
        chrome.storage.sync.remove('copiedItems', showAlert(`All copied items cleared successfully.`));
        checkCopiedItems();
    });
}

document.addEventListener('DOMContentLoaded', function() {
    checkCopiedItems();
    displayFooterText();
    pasteTextEventListener(); // Set up the listener for the paste button
    clearAllText();
});