# Roku Remote Control - React PWA

A modern web-based remote control for Roku TVs built with React, Vite, and Tailwind CSS. Features a backend proxy server to bypass CORS restrictions for full functionality.

## Features

- **Full Remote Control**: Control your Roku TV with an intuitive touch interface
- **Keyboard Shortcuts**: Use keyboard navigation (arrow keys, spacebar, enter, etc.)
- **PWA Support**: Install as a progressive web app for native-like experience
- **App Shortcuts**: Create up to 6 one-click shortcuts to your favorite apps (always visible)
- **Mobile Compatible**: Responsive design that works perfectly on phones and tablets
- **Offline Capable**: Remote controls work even when backend server is offline
- **URL Integration**: Page URL automatically updates with IP and shortcuts
- **CORS Bypass**: Backend proxy server eliminates CORS issues for status updates and app discovery


## Docker

You can run the Roku Remote Control app using Docker for easy deployment.

### Using Docker Compose

Create a `docker-compose.yml` file with the following content:

```yaml
services:
   rokurc-react:
      image: hppanpaliya/rokurc-react:latest
      container_name: rokurc-react
      ports:
         - "12312:12312"
      environment:
         PORT: 12312
         # VITE_BACKEND_URL: "http://192.168.0.137:12312/api"
      restart: unless-stopped
```

Start the service:

```bash
docker compose up -d
```

### Using Docker CLI

You can also run the container directly:

```bash
docker run \
   -d \
   -p 12312:12312 \
   -e PORT=12312 \
   # -e VITE_BACKEND_URL="http://192.168.0.137:12312/api" \
   --name rokurc-react \
   hppanpaliya/rokurc-react:latest
```

---

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- A Roku TV on the same network

### Installation & Setup

1. **Clone and Install Frontend Dependencies:**
   ```bash
   git clone <repository-url>
   cd roku-remote-control
   npm install
   ```

2. **(Optional) Install Backend Dependencies:**
   ```bash
   cd server
   npm install
   cd ..
   ```

3. **Find Your Roku TV's IP Address:**
   - Go to Settings > Network > About on your Roku TV
   - Note the IP address (e.g., 192.168.1.100)

4. **Start the Application:**
   ```bash
   # Frontend (required)
   npm run dev

   # Backend (optional - for full features)
   npm run server
   ```

5. **Configure the App:**
   - Open http://localhost:5173 in your browser
   - Click the settings icon (⚙️)
   - Enter your Roku TV's IP address
   - Click Save

6. **Install as PWA (Optional):**
   - Look for the "Install" button in your browser's address bar
   - Click "Install" to add the app to your device

## App Shortcuts

### Creating Shortcuts

The app supports up to 6 shortcuts that are always visible at the top of the remote interface.

#### Automatic Discovery (Recommended)
1. Click the TV icon (📺) in the header to open the shortcuts management panel
2. Click "Refresh Apps List" to fetch available apps from your Roku TV
3. Click the "+" button next to any app to add it as a shortcut
4. Shortcuts will appear at the top of the remote for quick access

#### Manual Addition
If automatic discovery doesn't work:
1. Click the TV icon (📺) in the header
2. Click "Add Manual Shortcut"
3. Enter the app name and ID (see common IDs below)
4. Your shortcuts will appear at the top

**Common Roku App IDs:**
- Netflix: `12`
- Prime Video: `13`
- Hulu: `2285`
- Disney+: `291097`
- YouTube: `837`
- Plex: `13535`
- Paramount+: `31440`
- Max: `61322`
- ESPN: `34376`
- Pluto TV: `252585`

### Managing Shortcuts
- Click any shortcut to launch the app instantly
- Open the shortcuts panel (TV icon) to remove shortcuts
- Maximum of 6 shortcuts allowed

### URL Integration

The app automatically updates the browser URL to reflect your current configuration:

- **IP Address**: Added as `MyRokuTVIP` query parameter when configured
- **Shortcuts**: First shortcut added as `shortcut` parameter
- **Shareable**: URLs can be bookmarked or shared to restore configuration

Example URL with configuration:
```
http://localhost:5173/?MyRokuTVIP=192.168.1.100&shortcuts=12,13,837
```

This will configure the TV IP and add shortcuts for Netflix (12), Prime Video (13), and YouTube (837).

## Architecture

### Frontend (React + Vite)
- Built with React 19 and Vite for fast development
- Tailwind CSS for styling
- Progressive Web App support
- Responsive design for mobile devices
- **Offline Capable**: Remote controls work directly with Roku TV even when backend is offline

### Backend (Express Proxy - Optional)
- Simple Express.js server running on port 3000
- Proxies requests to Roku TV API endpoints
- Bypasses CORS restrictions by making requests server-side
- Enables status updates and automatic app discovery
- **When offline**: Frontend falls back to direct connections for controls only

### Connection Modes
- **Full Mode** (Backend Online): All features available including status updates and app discovery
- **Basic Mode** (Backend Offline): Remote controls work, manual shortcut entry only
- **Direct Mode** (No Backend): Controls work via direct POST requests, no status updates

### API Endpoints
The proxy server handles these Roku API endpoints:
- `/query/device-info` - TV status and power state
- `/query/media-player` - Current playback information
- `/query/apps` - List of installed apps
- `/keypress/*` - Remote control commands
- `/launch/*` - App launch commands

## Keyboard Shortcuts

- **Arrow Keys**: Navigate
- **Enter/Space**: Select
- **Escape**: Home
- **-/=**: Volume Down/Up
- **Backquote (`)**: Mute
- **Backslash (\)**: Backspace
- **Period (.)**: Fast Forward
- **Comma (,)**: Rewind
- **Slash (/)**: Info
- **Semicolon (;)**: Instant Replay
- **Quote (')**: Search
- **Bracket Keys**: Special functions

## Development

### Running in Development
```bash
# Backend server (handles CORS)
npm run server

# Frontend development server (in another terminal)
npm run dev
```

### Building for Production
```bash
npm run build
```

### Project Structure
```
/
├── src/                    # Frontend React app
│   ├── App.jsx            # Main application component
│   ├── main.jsx           # Entry point
│   └── ...
├── server/                # Backend proxy server
│   ├── index.js           # Express server
│   └── package.json
├── public/                # Static assets
├── package.json           # Frontend dependencies
└── vite.config.js         # Vite configuration
```

## Troubleshooting

### Connection Issues
- Ensure your Roku TV and computer are on the same network
- Double-check the IP address in settings
- Make sure both frontend and backend servers are running

### App Discovery Not Working
- Try refreshing the apps list multiple times
- Use manual shortcut addition with known app IDs
- Check that the Roku TV is powered on and connected

### Backend Server Offline
- Remote controls will still work (direct connection)
- Status updates and automatic app discovery unavailable
- Yellow indicator shows backend is offline
- Start backend server with `npm run server` for full features

### CORS Errors (if running without backend)
If you're seeing CORS errors, the backend proxy server is required for status queries. Remote controls work without it.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4
- **Backend**: Node.js, Express.js
- **Icons**: Lucide React
- **PWA**: Vite PWA Plugin

## License

MIT License - feel free to use and modify as needed.
