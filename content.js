// Configuration
let SCROLL_STEP = 1; // pixels per step
let SCROLL_INTERVAL = 50; // milliseconds between steps
let PAUSE_DURATION = 5000; // milliseconds to pause when a post is in view

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
    padding: 15px;
    border-radius: 8px;
    z-index: 9999;
    color: white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    font-family: Arial, sans-serif;
    min-width: 200px;
`;

// Create settings controls
const createSettingControl = (label, value, min, max, step) => {
    const container = document.createElement('div');
    container.style.marginBottom = '10px';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.display = 'block';
    labelElement.style.marginBottom = '5px';
    labelElement.style.fontSize = '12px';
    
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.style.width = '100%';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value;
    valueDisplay.style.fontSize = '12px';
    valueDisplay.style.marginLeft = '5px';
    
    container.appendChild(labelElement);
    container.appendChild(input);
    container.appendChild(valueDisplay);
    
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
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    width: 100%;
    margin-top: 10px;
`;

controlPanel.appendChild(scrollStepControl.container);
controlPanel.appendChild(scrollIntervalControl.container);
controlPanel.appendChild(pauseDurationControl.container);
controlPanel.appendChild(toggleButton);
document.body.appendChild(controlPanel);

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