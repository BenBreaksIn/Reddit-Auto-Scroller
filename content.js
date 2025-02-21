// Configuration
let SCROLL_STEP = 1; // pixels per step
let SCROLL_INTERVAL = 50; // milliseconds between steps
let PAUSE_DURATION = 5000; // milliseconds to pause when a post is in view
const PIXELS_PER_BANANA = 356; // 1 banana ≈ 14 inches ≈ 356 pixels (doubled for more realistic counting)

// Load saved banana counts
let totalScrollDistance = 0;
let bananaCount = 0;
let lifetimeBananas = parseInt(localStorage.getItem('redditScrollerLifetimeBananas') || '0');
let sessionBananas = 0;

let isScrolling = false;
let scrollInterval = null;
let lastScrollPosition = 0;
let pauseTimeout = null;

// Create control panel
const controlPanel = document.createElement('div');
controlPanel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1a1a1b;
    padding: 20px;
    border-radius: 12px;
    z-index: 9999;
    color: white;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    font-family: Arial, sans-serif;
    min-width: 300px;
`;

// Create banana counter
const bananaCounter = document.createElement('div');
bananaCounter.style.cssText = `
    margin-bottom: 20px;
    text-align: center;
    font-size: 14px;
    padding: 15px 10px;
    background: #2d2d2e;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const bananaStatsContainer = document.createElement('div');
bananaStatsContainer.style.cssText = `
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
`;

const createBananaStatElement = (label) => {
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    `;
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelText.style.cssText = `
        font-size: 13px;
        color: #8b8b8b;
    `;

    const emoji = document.createElement('span');
    emoji.textContent = '🍌';
    emoji.style.fontSize = '22px';
    
    const text = document.createElement('span');
    text.style.cssText = `
        font-size: 13px;
        color: #e5e5e5;
    `;
    text.textContent = '0';
    
    container.appendChild(labelText);
    container.appendChild(emoji);
    container.appendChild(text);
    return { container, text };
};

const sessionStats = createBananaStatElement('This Session');
const lifetimeStats = createBananaStatElement('Lifetime');

bananaStatsContainer.appendChild(sessionStats.container);
bananaStatsContainer.appendChild(lifetimeStats.container);
bananaCounter.appendChild(bananaStatsContainer);

// Update initial stats display
sessionStats.text.textContent = `This Session: ${sessionBananas}`;
lifetimeStats.text.textContent = `Lifetime: ${lifetimeBananas}`;

// Create settings controls
const createSettingControl = (label, value, min, max, step) => {
    const container = document.createElement('div');
    container.style.marginBottom = '15px';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.cssText = `
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        color: #8b8b8b;
    `;
    
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.style.cssText = `
        width: 100%;
        margin: 0;
        background: #4a4a4a;
    `;
    
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value;
    valueDisplay.style.cssText = `
        font-size: 13px;
        color: #e5e5e5;
        float: right;
    `;
    
    container.appendChild(labelElement);
    container.appendChild(valueDisplay);
    container.appendChild(input);
    
    return { container, input, valueDisplay };
};

const scrollStepControl = createSettingControl('Scroll Speed (px/step)', SCROLL_STEP, 1, 10, 1);
const scrollIntervalControl = createSettingControl('Update Interval (ms)', SCROLL_INTERVAL, 10, 200, 10);
const pauseDurationControl = createSettingControl('Pause Duration (s)', PAUSE_DURATION/1000, 1, 20, 1);

scrollStepControl.input.addEventListener('input', (e) => {
    SCROLL_STEP = parseInt(e.target.value);
    scrollStepControl.valueDisplay.textContent = SCROLL_STEP;
});

scrollIntervalControl.input.addEventListener('input', (e) => {
    SCROLL_INTERVAL = parseInt(e.target.value);
    scrollIntervalControl.valueDisplay.textContent = SCROLL_INTERVAL;
    if (isScrolling) {
        clearInterval(scrollInterval);
        scrollInterval = setInterval(autoScroll, SCROLL_INTERVAL);
    }
});

pauseDurationControl.input.addEventListener('input', (e) => {
    PAUSE_DURATION = parseInt(e.target.value) * 1000;
    pauseDurationControl.valueDisplay.textContent = e.target.value;
});

const toggleButton = document.createElement('button');
toggleButton.textContent = 'Start Auto-Scroll';
toggleButton.style.cssText = `
    background: #ff4500;
    color: white;
    border: none;
    padding: 12px 0;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    width: 100%;
    font-size: 14px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s ease;
    margin-top: 5px;
    height: 45px;
`;

controlPanel.appendChild(bananaCounter);
controlPanel.appendChild(scrollStepControl.container);
controlPanel.appendChild(scrollIntervalControl.container);
controlPanel.appendChild(pauseDurationControl.container);
controlPanel.appendChild(toggleButton);
document.body.appendChild(controlPanel);

// Function to update banana counter
function updateBananaCounter(scrollAmount) {
    totalScrollDistance += scrollAmount;
    const newBananaCount = Math.floor(totalScrollDistance / PIXELS_PER_BANANA);
    
    if (newBananaCount !== bananaCount) {
        const bananasEarned = newBananaCount - bananaCount;
        bananaCount = newBananaCount;
        sessionBananas += bananasEarned;
        lifetimeBananas += bananasEarned;
        
        // Update stats display with just the numbers
        sessionStats.text.textContent = sessionBananas;
        lifetimeStats.text.textContent = lifetimeBananas;
        
        // Save to localStorage
        localStorage.setItem('redditScrollerLifetimeBananas', lifetimeBananas.toString());
        
        // Add banana animation when count increases
        const animatedBanana = document.createElement('div');
        animatedBanana.textContent = '🍌';
        animatedBanana.style.cssText = `
            position: fixed;
            right: 250px;
            bottom: 40px;
            font-size: 24px;
            animation: flyBanana 1s ease-out;
            pointer-events: none;
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#bananaAnimation')) {
            const style = document.createElement('style');
            style.id = 'bananaAnimation';
            style.textContent = `
                @keyframes flyBanana {
                    0% { transform: translateX(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateX(-100px) rotate(360deg); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(animatedBanana);
        setTimeout(() => animatedBanana.remove(), 1000);
    }
}

// Function to check if a post is in view
function isPostInView() {
    const posts = document.querySelectorAll('[data-testid="post-container"]');
    const windowHeight = window.innerHeight;
    
    for (const post of posts) {
        const rect = post.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= windowHeight) {
            return true;
        }
    }
    return false;
}

// Scroll function
function autoScroll() {
    if (!isScrolling) return;

    const currentPosition = window.scrollY;
    
    // If we haven't moved, we might be at the bottom
    if (currentPosition === lastScrollPosition) {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        if (currentPosition >= maxScroll) {
            // Try to load more content by scrolling a bit more
            window.scrollTo(0, currentPosition + 100);
            return;
        }
    }
    
    lastScrollPosition = currentPosition;

    // Check if a post is centered in view
    if (isPostInView()) {
        clearInterval(scrollInterval);
        pauseTimeout = setTimeout(() => {
            scrollInterval = setInterval(autoScroll, SCROLL_INTERVAL);
        }, PAUSE_DURATION);
    }

    window.scrollBy(0, SCROLL_STEP);
    updateBananaCounter(SCROLL_STEP);
}

// Toggle auto-scrolling
toggleButton.addEventListener('click', () => {
    isScrolling = !isScrolling;
    
    if (isScrolling) {
        toggleButton.textContent = 'Stop Auto-Scroll';
        toggleButton.style.background = '#7193ff';
        scrollInterval = setInterval(autoScroll, SCROLL_INTERVAL);
    } else {
        toggleButton.textContent = 'Start Auto-Scroll';
        toggleButton.style.background = '#ff4500';
        clearInterval(scrollInterval);
        if (pauseTimeout) {
            clearTimeout(pauseTimeout);
        }
    }
}); 