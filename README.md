# Reddit Auto Scroller

A Chrome extension that automatically scrolls Reddit pages, pausing briefly when posts are in view to give you time to read them. Now with banana-based scroll tracking!

## Features

- Smooth auto-scrolling through Reddit
- Automatically pauses when a post is in view
- Easy to toggle on/off with a floating button
- Continues scrolling after pause duration
- Attempts to load more content when reaching the bottom
- Tracks scrolling distance in bananas! 🍌
  - Session banana counter
  - Lifetime banana counter (persists between sessions)
  - Fun banana animations when you earn new bananas

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the folder containing these files
5. The extension will automatically activate when you visit Reddit

## Usage

1. Visit any Reddit page
2. Look for the floating control panel in the bottom right corner
3. Adjust your scroll settings using the sliders:
   - Scroll Speed: How many pixels to move per step (1-10)
   - Update Interval: How often to update scroll position (10-200ms)
   - Pause Duration: How long to pause on each post (1-20 seconds)
4. Click "Start Auto-Scroll" to begin automatic scrolling
5. Watch your banana collection grow as you scroll!
   - Each banana represents about 14 inches of scrolling
   - Your lifetime banana count is saved between sessions
   - Session bananas track your current browsing session

## Configuration

You can modify the following settings using the control panel sliders:

- `Scroll Speed`: How many pixels to scroll per step (default: 1)
- `Update Interval`: How often to scroll in milliseconds (default: 50)
- `Pause Duration`: How long to pause on each post in seconds (default: 5)

The banana counter will track:
- This Session: How many bananas you've earned in your current browsing session
- Lifetime: Your total banana collection across all sessions 