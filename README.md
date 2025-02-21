# Reddit Auto Scroller

A Chrome extension that automatically scrolls Reddit pages, pausing briefly when posts are in view to give you time to read them.

## Features

- Smooth auto-scrolling through Reddit
- Automatically pauses when a post is in view
- Easy to toggle on/off with a floating button
- Continues scrolling after pause duration
- Attempts to load more content when reaching the bottom

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the folder containing these files
5. The extension will automatically activate when you visit Reddit

## Usage

1. Visit any Reddit page
2. Look for the floating control panel in the bottom right corner
3. Click "Start Auto-Scroll" to begin automatic scrolling
4. The extension will pause briefly when a post is centered in view
5. Click "Stop Auto-Scroll" to stop the automatic scrolling

## Configuration

You can modify the following constants in `content.js` to customize the behavior:

- `SCROLL_STEP`: How many pixels to scroll per step (default: 1)
- `SCROLL_INTERVAL`: How often to scroll in milliseconds (default: 50)
- `PAUSE_DURATION`: How long to pause on each post in milliseconds (default: 5000) 