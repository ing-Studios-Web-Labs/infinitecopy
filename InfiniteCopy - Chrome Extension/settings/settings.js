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
        const result = await chrome.storage.sync.get(storageKey);
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
        hexColor = ['#F44336','#e57373','#d32f2f','#b71c1c','#e91e63','#ffebee','#4CAF50'];
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
        await chrome.storage.sync.set({ [storageKey]: theme });
        console.log("Array saved successfully:", theme);
    } catch (error) {
        console.error("Error setting array:", error);
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
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    retrieveTheme();
    displayFooterText();
    getHoveredColor();
    changeTheme();
});
