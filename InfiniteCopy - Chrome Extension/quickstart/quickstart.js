let storageMode = chrome.storage.sync;
let storageString;
let tutorialSamples = ['Try copying this!', 'And this!', '/assets/logo.svg'];

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
        

    } catch (error) {
        console.error("Error fetching array:", error);
    }
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

function playGifs() {
    const gifContainers = document.querySelectorAll('.gif-container');

    gifContainers.forEach(gifContainer => {
        const tutorialGif = gifContainer.querySelector('.gif-item');
        const overlayShade = gifContainer.querySelector('.overlay-shade');

        if (tutorialGif && tutorialGif.tagName === 'IMG') {
            const staticImgSrc = tutorialGif.src;
            const animatedGifSrc = tutorialGif.getAttribute('data-animated-src');

            gifContainer.addEventListener('mouseenter', () => {
                if (animatedGifSrc) {
                    tutorialGif.src = animatedGifSrc;
                }
                if (overlayShade) {
                    overlayShade.classList.add('hide-overlay');
                }
            });

            gifContainer.addEventListener('mouseleave', () => {
                tutorialGif.src = staticImgSrc;
                if (overlayShade) {
                    overlayShade.classList.remove('hide-overlay');
                }
            });
        }
    });
}

async function setFavicon() {
    const data = await storageMode.get('extensionTheme');
    const theme = data.extensionTheme;
    const primaryHex = theme[0];
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
        colourName = 'blue'; // Default to blue if color not explicitly matched
    }
    const pageFavicon = document.getElementById('page-favicon');
    pageFavicon.href = `../assets/logo_${colourName}.ico`;
}

function checkMessages() {
    chrome.runtime.onMessage.addListener(async(request, sender, sendResponse) => {
        // If the message requests an update to the extension's theme (e.g., from popup settings).
        if (request.action === "updateExtensionTheme") {
            setFavicon();
            retrieveTheme();
            sendResponse({ success: true, message: "Icon update triggered." });
            return true; // Indicate that `sendResponse` will be called asynchronously.
        }
        // For any unhandled messages, return `false`.
        return false;
    });
}
// Confetti animations
const confettiContainer = document.createElement('div');
confettiContainer.id = 'confetti-container';
document.body.appendChild(confettiContainer);

const confettiColors = [
    '#673AB7', // Deep Purple
    '#2196F3', // Blue
    '#00BCD4', // Cyan
    '#4CAF50', // Green
    '#FFEB3B', // Yellow
    '#FF9800', // Orange
    '#F44336', // Red
    '#E91E63'  // Pink
];

function createConfettiParticle() {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';

    // Randomize initial position (start from top center or slightly above)
    const startX = Math.random() * window.innerWidth;
    const startY = -20; // Start slightly above the viewport

    // Randomize size
    const size = Math.random() * 8 + 5; // 5px to 13px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    // Randomize color
    particle.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];

    // Material Design subtle shadow (optional)
    particle.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';

    // Store animation properties
    particle.data = {
        x: startX,
        y: startY,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5, // -2.5 to 2.5 degrees per frame
        speedY: Math.random() * 3 + 2, // 2 to 5 pixels per frame
        speedX: (Math.random() - 0.5) * 3, // -1.5 to 1.5 pixels per frame for horizontal drift
        opacity: 1,
        life: Math.random() * 150 + 100 // Life in frames (e.g., 100 to 250 frames)
    };

    confettiContainer.appendChild(particle);
    return particle;
}

let particles = [];
const maxParticles = 150; // Limit the number of particles for performance

function animateConfetti() {
    // Add new particles if below max and randomly
    if (particles.length < maxParticles && Math.random() > 0.5) { // Adjust spawn rate
        particles.push(createConfettiParticle());
    }

    particles.forEach((particle, index) => {
        // Update position
        particle.data.y += particle.data.speedY;
        particle.data.x += particle.data.speedX;
        particle.data.rotation += particle.data.rotationSpeed;

        // Fade out over time
        particle.data.life--;
        if (particle.data.life <= 60) { // Start fading out in the last 60 frames
            particle.data.opacity = particle.data.life / 60;
        }

        // Apply transforms and opacity
        particle.style.transform = `translate(${particle.data.x}px, ${particle.data.y}px) rotate(${particle.data.rotation}deg)`;
        particle.style.opacity = particle.data.opacity;

        // Remove particle if it goes off-screen or fades out
        if (particle.data.y > window.innerHeight || particle.data.opacity <= 0) {
            confettiContainer.removeChild(particle);
            particles.splice(index, 1); // Remove from array
        }
    });

    requestAnimationFrame(animateConfetti);
}

function confettiEventListener() {
    const confBtn = document.getElementById('confetti-button');
    confBtn.addEventListener('click', () => {
        for (let i = 0; i < 50; i++) { // Generate 50 particles on click
            particles.push(createConfettiParticle());
        }
    });
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

async function retrieveAndDisplayCopiedItem() {
    const data = await storageMode.get('copiedItems');
    const allCopiedItems = data.copiedItems || [];
    const outputSpan = document.getElementById('pasted-output');

    if (allCopiedItems.length > 0) {
        outputSpan.innerHTML = allCopiedItems[0].value;
    } else {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText) {
            showAlert(`Try using 'Copy to InfiniteCopy' instead of 'Copy'!`);
        }
    }
}

function pasteLastCopiedItemEventListener() {
    const pasteButton = document.getElementById('paste-button');
    pasteButton.addEventListener('click', () => {
        retrieveAndDisplayCopiedItem();
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
}

async function initializePage() {
    await checkStorageMode();
    checkMessages();
    retrieveTheme();
    setFavicon();
    displayFooterText();
    playGifs();
    animateConfetti();
    confettiEventListener();
    pasteLastCopiedItemEventListener();
    buttonRippleEffect();
}

document.addEventListener('DOMContentLoaded', initializePage);