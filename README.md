# Highlights for YouTube

A Chrome extension that automatically extracts and displays video highlights directly on YouTube's video player based on timestamps found in video descriptions and comments.

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/jahmafmcpgdedfjfknmfkhaiejlfdcfc.svg)](https://chrome.google.com/webstore/detail/highlights-for-youtube/jahmafmcpgdedfjfknmfkhaiejlfdcfc)
[![Chrome Web Store Users](https://img.shields.io/chrome-web-store/users/jahmafmcpgdedfjfknmfkhaiejlfdcfc.svg)](https://chrome.google.com/webstore/detail/highlights-for-youtube/jahmafmcpgdedfjfknmfkhaiejlfdcfc)

## Features

### 🎯 Visual Timeline Highlights
- **Progress Bar Markers**: Visual indicators on YouTube's progress bar showing where highlights occur
- **Hover Tooltips**: Detailed highlight descriptions appear when hovering over markers
- **Timestamp Positioning**: Markers are precisely positioned based on video length and timestamp location

### 🔍 Automatic Timestamp Detection
- **Description Parsing**: Extracts timestamps from video descriptions using regex pattern matching
- **Comment Analysis**: Scans top comments for user-generated timestamps and highlights
- **Multiple Formats**: Supports both `MM:SS` and `HH:MM:SS` timestamp formats
- **Smart Text Extraction**: Removes URLs and cleans up highlight text automatically

### 🎮 Navigation Controls
- **Next/Previous Buttons**: Navigate between highlights with dedicated player controls
- **Current Highlight Display**: Shows the current or upcoming highlight in the player controls
- **Click to Jump**: Click any highlight marker to instantly jump to that timestamp
- **Responsive Text**: Highlight text truncates based on available player width

### ⚙️ User Controls
- **Toggle Highlights**: Enable/disable highlights through YouTube's settings menu
- **Persistent Settings**: Your preference is saved and remembered across sessions
- **Chapter Integration**: Seamlessly integrates with YouTube's existing chapter system

## How It Works

1. **Content Detection**: When you visit a YouTube video, the extension automatically scans:
   - The video description for timestamp patterns
   - Top comments for user-generated timestamps
   
2. **Text Processing**: For each timestamp found, the extension:
   - Extracts the associated text description
   - Removes URLs and formatting characters
   - Applies similarity detection to avoid duplicate highlights
   
3. **Visual Rendering**: Highlights are displayed as:
   - Clickable markers on the progress bar
   - Tooltips with detailed descriptions
   - Navigation controls in the player interface

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store page](https://chrome.google.com/webstore/detail/highlights-for-youtube/jahmafmcpgdedfjfknmfkhaiejlfdcfc)
2. Click "Add to Chrome"
3. Confirm the installation

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension will be installed and active

## Usage

1. **Automatic Operation**: The extension works automatically on any YouTube video page
2. **View Highlights**: Look for markers on the video progress bar
3. **Navigate**: Use the previous/next buttons in the player controls or click markers directly
4. **Toggle**: Access YouTube's settings menu (gear icon) to enable/disable highlights
5. **Tooltips**: Hover over highlight markers to see detailed descriptions

## Technical Details

### Architecture
- **Manifest V3**: Built using the latest Chrome extension standards
- **Content Scripts**: Runs in the context of YouTube pages for DOM manipulation
- **Injected Scripts**: Accesses YouTube's internal APIs for video data and control
- **Tippy.js Integration**: Uses Tippy.js library for smooth tooltip animations

### Browser Compatibility
- **Chrome**: Fully supported (Manifest V3)
- **Chromium-based browsers**: Should work with minor modifications
- **Firefox**: Requires manifest adaptation for WebExtensions

### Performance Features
- **Lazy Loading**: Comments are loaded progressively to avoid performance impact
- **Debounced Processing**: Prevents excessive DOM manipulation during video changes
- **Memory Management**: Cleans up event listeners and observers when navigating

## File Structure

```
├── manifest.json          # Extension configuration and permissions
├── content.js             # Main extension logic and UI manipulation
├── content.css            # Styling for highlight elements
├── inject.js              # YouTube API interaction and data extraction
├── tippy.all.min.js       # Tooltip library for highlight descriptions
└── img/                   # Extension icons
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup
1. Clone the repository
2. Make your changes
3. Test in Chrome by loading the unpacked extension
4. Submit a pull request with a clear description of changes

## Privacy

This extension:
- **Local Processing**: All timestamp extraction and processing happens locally
- **No Data Collection**: Does not collect, store, or transmit any user data
- **YouTube Only**: Only operates on YouTube.com domains
- **No Analytics**: No usage tracking or analytics

## License

This project is open source. Please refer to the license file for usage terms.

## Support

For issues, feature requests, or questions:
- **Chrome Web Store**: Leave a review with details
- **GitHub Issues**: Create an issue in this repository
- **Web Store Page**: [Highlights for YouTube](https://chrome.google.com/webstore/detail/highlights-for-youtube/jahmafmcpgdedfjfknmfkhaiejlfdcfc)
