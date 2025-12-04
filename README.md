# TimeGuard

A Chrome browser extension that helps you be more intentional with your time by adding a mindful delay before accessing distracting websites.

## Features

- **Customizable Delay**: Set a waiting period (1-300 seconds) before accessing blocked sites
- **URL Blocking**: Add any websites to your block list
- **Smart Navigation**: Only triggers delay when entering a site, not when navigating within it
- **Access Tracking**: Shows how many times you've accessed each site in the last 24 hours
- **Rehab Mode**: Lock your settings outside a specified time window for extra commitment
- **Clean UI**: Minimalist, distraction-free design

## Installation

### Development Mode

1. **Generate Icons** (requires Node.js):
   ```bash
   node generate-icons.js
   ```

2. **Load the Extension**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `LeechBlockExtension` folder

3. **Configure**:
   - Click the TimeGuard icon in your browser toolbar
   - Add sites you want to block
   - Set your desired delay duration
   - Click "Save Settings"

## How It Works

1. When you navigate to a blocked site from a different domain, Focus Guard intercepts the request
2. You're shown a countdown page with:
   - A visual timer counting down to zero
   - The site you're trying to access
   - Stats on how many times you've visited today
3. Once the countdown completes, you're redirected to your requested site
4. While on the site, you can navigate freely without additional delays
5. If you close the tab or navigate away, the next visit triggers a new countdown

## Files

```
LeechBlockExtension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker for navigation tracking
├── options.html        # Settings page
├── options.js          # Settings page logic
├── options.css         # Settings page styles
├── countdown.html      # Delay/countdown page
├── countdown.js        # Countdown logic
├── countdown.css       # Countdown page styles
├── generate-icons.js   # Icon generation script
└── icons/              # Extension icons (generated)
```

## Rehab Mode

Rehab Mode adds an extra layer of commitment by locking your settings outside a specified time window:

- **When enabled**: You can only edit/delete sites, decrease delay, or modify Rehab Mode settings during your edit window
- **Always allowed**: Adding new sites and increasing the delay
- **Use case**: Set your edit window to late night (e.g., 11 PM - 12 AM) so you can only weaken restrictions when you're winding down, not during productive hours

## Tips

- **Add distracting sites gradually**: Start with the biggest time-wasters
- **Use a longer delay for more addictive sites**: 30-60 seconds gives you time to reconsider
- **The stats are your friend**: Seeing "15 visits today" can be a powerful motivator
- **Try Rehab Mode**: If you find yourself constantly adjusting settings, lock them down!

## Privacy

TimeGuard stores all data locally in your browser. No data is ever sent to external servers.

