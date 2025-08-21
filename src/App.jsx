import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Info, Tv, Wifi, WifiOff } from 'lucide-react';
import { env } from '../env'

const APP_COLORS = {
  "837": "rgb(252, 5, 5)",      // YouTube
  "93580": "rgb(252, 102, 4)",  // iWebTV
  "84056": "rgb(28, 100, 155)", // Weather Network
  "13535": "rgb(215, 168, 51)", // Plex
  "12": "rgb(229, 20, 28)",     // Netflix
  "291097": "rgb(12, 139, 156)",// Disney+
  "252585": "rgb(251, 243, 4)", // Pluto TV
  "31440": "rgb(4, 92, 252)",   // Paramount+
  "34376": "rgb(221, 64, 57)",  // ESPN
  "61322": "rgb(4, 38, 212)",   // Max
  "13": "rgb(28, 148, 251)",    // Prime Video
  "2285": "rgb(37, 225, 133)",  // Hulu
  "86398": "rgb(232, 248, 4)",  // SYFY
};

const KEY_MAP = {
  Space: "Play",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  ArrowDown: "Down",
  Enter: "Select",
  Escape: "Home",
  Minus: "VolumeDown",
  Equal: "VolumeUp",
  Backquote: "VolumeMute",
  Backslash: "Backspace",
  Period: "Fwd",
  Comma: "Rev",
  Slash: "Info",
  Semicolon: "InstantReplay",
  Quote: "Search",
  BracketRight: "Enter",
  BracketLeft: "Back"
};

const RemoteBtn = ({ action, children, className = "", double = false, center = false, style = {}, activeKey, sendCommand }) => {
  const isActive = activeKey === action;
  const baseClasses = `
    flex justify-center items-center text-white rounded-2xl select-none 
    transition-all duration-150 active:scale-95 cursor-pointer shadow-sm
    ${isActive ? 'bg-purple-900 ring-2 ring-purple-300' : 'bg-roku-purple hover:bg-roku-dark'}
  `;
  
  // Layout sizing logic matching original CSS percentages approx
  let sizeClasses = "w-[31%] py-3";
  if (double) sizeClasses = "w-[48%] py-3";
  if (center) sizeClasses = "w-[31%] mx-auto py-3"; // Center alignment helper

  return (
    <button 
      className={`${baseClasses} ${sizeClasses} ${className}`}
      onClick={() => sendCommand(action)}
      style={style}
    >
      {children}
    </button>
  );
};

const RokuRemote = () => {
  // Initialize IP from URL params or localStorage
  const getInitialIp = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlIp = urlParams.get('MyRokuTVIP');
    const storedIp = localStorage.getItem('roku_tv_ip');
    return urlIp || storedIp || '';
  };

  const [ip, setIp] = useState(getInitialIp);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [mediaState, setMediaState] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(() => getInitialIp() ? 'connected' : 'disconnected');
  const [activeKey, setActiveKey] = useState(null);
  const [apps, setApps] = useState([]);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [shortcuts, setShortcuts] = useState(() => {
    const stored = localStorage.getItem('roku_shortcuts');
    try {
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse shortcuts", e);
      return [];
    }
  });
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualAppName, setManualAppName] = useState('');
  const [manualAppId, setManualAppId] = useState('');
  const pollingRef = useRef(null);

  // Check if backend proxy is available
  const checkBackendAvailability = useCallback(async () => {
    const backendUrl = env.VITE_BACKEND_URL;
    if (!backendUrl) {
      setBackendAvailable(false);
      return false;
    }

    try {
      const response = await fetch(`${backendUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      const available = response.ok;
      setBackendAvailable(available);
      return available;
    } catch {
      setBackendAvailable(false);
      return false;
    }
  }, []);

  const getUrl = useCallback((path, forceDirect = false) => {
    const backendUrl = env.VITE_BACKEND_URL;
    if (backendUrl && backendAvailable && !forceDirect) {
       const cleanPath = path.startsWith('/') ? path.slice(1) : path;
       return `${backendUrl}/${ip}/${cleanPath}`;
    }
    return `http://${ip}:8060/${path}`;
  }, [ip, backendAvailable]);

  // Update URL with current state
  const updateUrl = useCallback((newIp = ip, newShortcuts = shortcuts) => {
    const url = new URL(window.location);
    if (newIp) {
      url.searchParams.set('MyRokuTVIP', newIp);
    } else {
      url.searchParams.delete('MyRokuTVIP');
    }
    
    // Add all shortcuts to URL as comma-separated IDs
    if (newShortcuts.length > 0) {
      const shortcutIds = newShortcuts.map(s => s.id).join(',');
      url.searchParams.set('shortcuts', shortcutIds);
    } else {
      url.searchParams.delete('shortcuts');
    }
    
    window.history.replaceState({}, '', url);
  }, [ip, shortcuts]);

  // --- Initialization ---
  useEffect(() => {
    // Check local storage or URL params for IP
    const urlParams = new URLSearchParams(window.location.search);
    const urlIp = urlParams.get('MyRokuTVIP');
    const storedIp = localStorage.getItem('roku_tv_ip');

    if (urlIp) {
      setIp(urlIp);
    } else if (storedIp) {
      setIp(storedIp);
    } else {
      setIsSettingsOpen(true);
    }

    // Check backend availability
    checkBackendAvailability();

    // Update URL to reflect current state
    updateUrl(urlIp || storedIp, shortcuts);
  }, []);

  // Load shortcuts from URL when apps are available
  useEffect(() => {
    if (apps.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlShortcuts = urlParams.get('shortcuts');
    
    if (urlShortcuts) {
      const shortcutIds = urlShortcuts.split(',').filter(id => id.trim());
      const urlShortcutApps = apps.filter(app => shortcutIds.includes(app.id));
      
      if (urlShortcutApps.length > 0) {
        // Merge with existing shortcuts, avoiding duplicates
        const existingIds = new Set(shortcuts.map(s => s.id));
        const newShortcuts = urlShortcutApps.filter(app => !existingIds.has(app.id));
        
        if (newShortcuts.length > 0) {
          const updatedShortcuts = [...shortcuts, ...newShortcuts];
          setShortcuts(updatedShortcuts);
          localStorage.setItem('roku_shortcuts', JSON.stringify(updatedShortcuts));
        }
      }
    }
  }, [apps, shortcuts]);

  // --- Network Logic ---
  const saveIp = async (newIp) => {
    setIp(newIp);
    localStorage.setItem('roku_tv_ip', newIp);
    setIsSettingsOpen(false);
    
    // Check backend availability
    await checkBackendAvailability();
    
    // Assume connected since we can't check due to CORS
    setConnectionStatus('connected');
    
    // Update URL with new IP
    updateUrl(newIp, shortcuts);
  };

  const parseXml = (xmlStr) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
    return xmlDoc;
  };

  const fetchDeviceInfo = useCallback(async () => {
    if (!ip) return;
    try {
      const response = await fetch(getUrl('query/device-info'), { signal: AbortSignal.timeout(2000) });
      const text = await response.text();
      const xml = parseXml(text);
      
      const powerMode = xml.querySelector('power-mode')?.textContent;
      setDeviceInfo({ powerMode });
      setConnectionStatus('connected');
    } catch {
      // CORS error expected for local network requests, but connection might still work
      console.log('Could not fetch device info due to CORS restrictions');
      setConnectionStatus('error');
    }
  }, [ip]);

  const fetchMediaPlayer = useCallback(async () => {
    if (!ip) return;
    try {
      const response = await fetch(getUrl('query/media-player'), { signal: AbortSignal.timeout(2000) });
      const text = await response.text();
      const xml = parseXml(text);
      const playerEl = xml.querySelector('player');
      
      if (!playerEl) return;

      const state = playerEl.getAttribute('state');
      const pluginEl = playerEl.querySelector('plugin');
      const appId = pluginEl?.getAttribute('id');
      const appName = pluginEl?.getAttribute('name');
      
      const position = parseInt(playerEl.querySelector('position')?.textContent || "0");
      const duration = parseInt(playerEl.querySelector('duration')?.textContent || "0");

      setMediaState({
        state,
        appId,
        appName,
        position, // ms
        duration, // ms
        progress: duration > 0 ? (position / duration) * 100 : 0
      });
    } catch {
      // CORS error expected for local network requests, media info may not be available
      // This is normal and doesn't affect remote functionality
    }
  }, [ip]);

  const fetchApps = useCallback(async () => {
    if (!ip) return;
    try {
      const response = await fetch(getUrl('query/apps'), { signal: AbortSignal.timeout(5000) });
      const text = await response.text();
      const xml = parseXml(text);
      const appElements = xml.querySelectorAll('app');

      const appsList = Array.from(appElements).map(app => ({
        id: app.getAttribute('id'),
        name: app.textContent,
        type: app.getAttribute('type') || 'app'
      }));

      setApps(appsList);
    } catch {
      // CORS restrictions prevent direct API calls from browser
      console.log('Could not fetch apps list due to CORS restrictions');
    }
  }, [ip]);  const launchApp = useCallback(async (appId) => {
    if (!ip) return;
    try {
      // Always use direct connection for POST requests (app launch) as they work without CORS
      await fetch(`http://${ip}:8060/launch/${appId}`, { method: 'POST', mode: 'no-cors' });
      // Update media state after launching app
      setTimeout(fetchMediaPlayer, 1000);
    } catch (err) {
      console.error("App launch failed", err);
    }
  }, [ip, fetchMediaPlayer]);

  const addShortcut = (app) => {
    if (shortcuts.length >= 6) {
      alert("Maximum 6 shortcuts allowed");
      return;
    }
    const newShortcut = {
      id: app.id,
      name: app.name,
      type: 'app',
      created: Date.now()
    };
    const updatedShortcuts = [...shortcuts, newShortcut];
    setShortcuts(updatedShortcuts);
    localStorage.setItem('roku_shortcuts', JSON.stringify(updatedShortcuts));
    updateUrl(ip, updatedShortcuts);
  };

  const addManualShortcut = () => {
    if (!manualAppName.trim() || !manualAppId.trim()) return;
    if (shortcuts.length >= 6) {
      alert("Maximum 6 shortcuts allowed");
      return;
    }

    const newShortcut = {
      id: manualAppId.trim(),
      name: manualAppName.trim(),
      type: 'app',
      created: Date.now()
    };
    const updatedShortcuts = [...shortcuts, newShortcut];
    setShortcuts(updatedShortcuts);
    localStorage.setItem('roku_shortcuts', JSON.stringify(updatedShortcuts));
    updateUrl(ip, updatedShortcuts);

    // Reset form
    setManualAppName('');
    setManualAppId('');
    setShowManualAdd(false);
  };

  const removeShortcut = (shortcutId) => {
    const updatedShortcuts = shortcuts.filter(s => s.id !== shortcutId);
    setShortcuts(updatedShortcuts);
    localStorage.setItem('roku_shortcuts', JSON.stringify(updatedShortcuts));
    updateUrl(ip, updatedShortcuts);
  };

  const sendCommand = useCallback(async (key, value = null) => {
    if (!ip) return;

    // Visual feedback
    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 200);

    const endpoint = value ? `${key}/${encodeURIComponent(value)}` : `keypress/${key}`;
    // Always use direct connection for POST requests (controls) as they work without CORS
    const url = `http://${ip}:8060/${endpoint}`;

    try {
      await fetch(url, { method: 'POST', mode: 'no-cors' });
    } catch (err) {
      console.error("Command failed", err);
    }
  }, [ip]);

  // --- Polling ---
  useEffect(() => {
    if (!ip) return;

    const poll = async () => {
      await checkBackendAvailability(); // Check backend status periodically
      fetchDeviceInfo();
      fetchMediaPlayer();
    };

    poll(); // Initial call
    pollingRef.current = setInterval(poll, 10000); // Check every 10 seconds

    return () => clearInterval(pollingRef.current);
  }, [ip, fetchDeviceInfo, fetchMediaPlayer, checkBackendAvailability]);
  

  // --- Keyboard Listeners ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT') return;

      if (KEY_MAP[e.code]) {
        e.preventDefault();
        sendCommand(KEY_MAP[e.code]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sendCommand]);

  // --- Helpers ---
  const msToTime = (ms) => {
    if (!ms && ms !== 0) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // --- Render Components ---

  const getAccentColor = () => {
    if (mediaState?.appId && APP_COLORS[mediaState.appId]) {
      return APP_COLORS[mediaState.appId];
    }
    return '#662D91'; // Default Roku Purple
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-2 sm:p-4 font-sans overflow-y-auto">
      <div className="w-full max-w-[480px] bg-white rounded-3xl shadow-xl border border-gray-300 p-4 sm:p-6 relative">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-roku-purple">Roku RC</h1>
            <div className="flex gap-1">
              {connectionStatus === 'connected' && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="TV Connected"></span>}
              {connectionStatus === 'error' && <span className="w-2 h-2 bg-red-500 rounded-full" title="TV Connection Error"></span>}
              {backendAvailable ? (
                <span className="w-2 h-2 bg-blue-500 rounded-full" title="Backend Server Online - Full Features Available"></span>
              ) : (
                <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Backend Server Offline - Limited Features"></span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setIsShortcutsOpen(!isShortcutsOpen)} className="text-gray-400 hover:text-roku-purple" title="Manage Shortcuts"><Tv size={24} /></button>
             <a href="#" className="text-gray-400 hover:text-roku-purple"><Info size={24} /></a>
             <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-gray-400 hover:text-roku-purple"><Settings size={24} /></button>
          </div>
        </div>

        {/* Configuration Panel (Toggleable) */}
        {isSettingsOpen && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Roku TV IP Address</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={ip} 
                onChange={(e) => setIp(e.target.value)}
                placeholder="e.g. 192.168.1.50"
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-roku-purple focus:outline-none"
              />
              <button 
                onClick={() => saveIp(ip)}
                className="bg-roku-purple text-white px-4 py-2 rounded-lg hover:bg-roku-dark"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Find this in your Roku: Settings &gt; Network &gt; About</p>
          </div>
        )}

        {/* Shortcuts Bar (Always Visible) */}
        {shortcuts.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-2">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => launchApp(shortcut.id)}
                  className="flex items-center justify-center p-2 h-12 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 text-center leading-tight wrap-break-word overflow-hidden transition-colors"
                >
                  <span className="line-clamp-2">{shortcut.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Shortcuts Management Panel */}
        {isShortcutsOpen && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Manage Shortcuts</h3>

            {/* Current Shortcuts List for Removal */}
            {shortcuts.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Your Shortcuts (Max 6)</h4>
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div key={shortcut.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-800">{shortcut.name}</span>
                      <button
                        onClick={() => removeShortcut(shortcut.id)}
                        className="text-red-500 hover:text-red-700 px-2"
                        title="Remove shortcut"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Apps */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Available Apps</h4>
              {apps.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {apps.map((app) => {
                    const isShortcut = shortcuts.some(s => s.id === app.id);
                    return (
                      <div key={app.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                        <span className="text-sm text-gray-800 truncate">{app.name}</span>
                        {!isShortcut && shortcuts.length < 6 && (
                          <button
                            onClick={() => addShortcut(app)}
                            className="ml-2 text-roku-purple hover:text-roku-dark text-sm font-medium"
                            title="Add shortcut"
                          >
                            +
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No apps found. Make sure your TV is connected and try refreshing.</p>
              )}
              <button
                onClick={fetchApps}
                className="mt-3 text-sm text-roku-purple hover:text-roku-dark"
              >
                Refresh Apps List
              </button>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowManualAdd(!showManualAdd)}
                  className="text-sm text-roku-purple hover:text-roku-dark font-medium"
                >
                  {showManualAdd ? 'Cancel' : 'Add Manual Shortcut'}
                </button>

                {showManualAdd && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">App Name</label>
                      <input
                        type="text"
                        value={manualAppName}
                        onChange={(e) => setManualAppName(e.target.value)}
                        placeholder="e.g., Netflix"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-roku-purple"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">App ID</label>
                      <input
                        type="text"
                        value={manualAppId}
                        onChange={(e) => setManualAppId(e.target.value)}
                        placeholder="e.g., 12"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-roku-purple"
                      />
                    </div>
                    <button
                      onClick={addManualShortcut}
                      disabled={!manualAppName.trim() || !manualAppId.trim() || shortcuts.length >= 6}
                      className="w-full py-2 text-sm text-white bg-roku-purple hover:bg-roku-dark rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Shortcut
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Media Info / Progress Bar */}
        {/* Disabled due to CORS - would show current app and playback progress */}
        {false && mediaState && (mediaState.state === 'play' || mediaState.state === 'pause') && (
          <div className={`transition-all duration-500 overflow-hidden max-h-32 opacity-100 mb-6`}>
            <div className="flex justify-between text-roku-purple font-medium mb-1">
              <span className="text-xs">{msToTime(mediaState?.position)}</span>
              <span className="text-xs font-bold truncate max-w-[150px]">{mediaState?.appName}</span>
              <span className="text-xs">{msToTime(mediaState?.duration)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full transition-all duration-1000 ease-linear" 
                style={{ width: `${mediaState?.progress || 0}%`, backgroundColor: getAccentColor() }}
              ></div>
            </div>
          </div>
        )}

        {/* Remote Grid */}
        <div className="space-y-4">
          
          {/* Row 1: Power & Volume */}
          <div className="flex justify-between gap-2">
            <RemoteBtn action="Power" className="bg-gray-500 hover:bg-gray-600" activeKey={activeKey} sendCommand={sendCommand}>
              <PowerIcon />
            </RemoteBtn>
            <RemoteBtn action="VolumeMute" activeKey={activeKey} sendCommand={sendCommand}><MuteIcon /></RemoteBtn>
            <RemoteBtn action="VolumeDown" activeKey={activeKey} sendCommand={sendCommand}><VolDownIcon /></RemoteBtn>
            <RemoteBtn action="VolumeUp" activeKey={activeKey} sendCommand={sendCommand}><VolUpIcon /></RemoteBtn>
          </div>

          {/* Row 2: Back & Home */}
          <div className="flex justify-between gap-2">
            <RemoteBtn action="Back" double={true} activeKey={activeKey} sendCommand={sendCommand}><BackIcon /></RemoteBtn>
            <RemoteBtn action="Home" double={true} activeKey={activeKey} sendCommand={sendCommand}><HomeIcon /></RemoteBtn>
          </div>

          {/* D-Pad Area */}
          <div className="py-2">
            <div className="flex justify-center mb-2">
               <RemoteBtn action="Up" center={true} activeKey={activeKey} sendCommand={sendCommand}><ArrowUpIcon /></RemoteBtn>
            </div>
            <div className="flex justify-between gap-2">
              <RemoteBtn action="Left" activeKey={activeKey} sendCommand={sendCommand}><ArrowLeftIcon /></RemoteBtn>
              <RemoteBtn action="Select" activeKey={activeKey} sendCommand={sendCommand}><span className="font-bold text-sm">OK</span></RemoteBtn>
              <RemoteBtn action="Right" activeKey={activeKey} sendCommand={sendCommand}><ArrowRightIcon /></RemoteBtn>
            </div>
            <div className="flex justify-center mt-2">
              <RemoteBtn action="Down" center={true} activeKey={activeKey} sendCommand={sendCommand}><ArrowDownIcon /></RemoteBtn>
            </div>
          </div>

          {/* Row 3: Replay & Info */}
          <div className="flex justify-between gap-2">
             <RemoteBtn action="InstantReplay" double={true} activeKey={activeKey} sendCommand={sendCommand}><ReplayIcon /></RemoteBtn>
             <RemoteBtn action="Info" double={true} activeKey={activeKey} sendCommand={sendCommand}><AsteriskIcon /></RemoteBtn>
          </div>

          {/* Row 4: Transport Controls */}
          <div className="flex justify-between gap-2">
            <RemoteBtn action="Rev" activeKey={activeKey} sendCommand={sendCommand}><RevIcon /></RemoteBtn>
            <RemoteBtn action="Play" activeKey={activeKey} sendCommand={sendCommand}>
              {mediaState?.state === 'play' ? <PauseIcon /> : <PlayIcon />}
            </RemoteBtn>
            <RemoteBtn action="Fwd" activeKey={activeKey} sendCommand={sendCommand}><FwdIcon /></RemoteBtn>
          </div>

          {/* Text Input */}
          <div className="mt-6">
            <input 
              type="text" 
              placeholder="Type to send text..."
              className="w-full p-3 text-center border border-roku-purple rounded-xl focus:outline-none focus:ring-2 focus:ring-roku-purple text-lg text-gray-900 placeholder-gray-500 bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                   sendCommand('Backspace');
                } else if (e.key.length === 1) {
                   // This is a naive implementation. Roku Lit_ endpoint handles literal chars.
                   sendCommand(`Lit_${encodeURIComponent(e.key)}`);
                }
              }}
            />
          </div>

          {/* Connection Prompt if disconnected */}
          {!ip && (
             <div className="text-center mt-4">
                <img src="https://placehold.co/400x100?text=Connect+TV" alt="No TV" className="mx-auto opacity-50 mb-2 rounded-lg" />
                <p className="text-gray-500 text-sm">Please configure your TV IP in settings.</p>
             </div>
          )}

        </div>
      </div>
      
      {/* Global Styles for Roku specific colors that Tailwind config might miss if not extended */}
      <style>{`
        .bg-roku-purple { background-color: #662D91; }
        .hover\\:bg-roku-dark:hover { background-color: #49247A; }
        .text-roku-purple { color: #662D91; }
        .ring-roku-purple { --tw-ring-color: #662D91; }
      `}</style>
    </div>
  );
};

// --- SVG Icons Components ---
const PowerIcon = () => (
  <svg fill="currentColor" width="20" height="20" viewBox="-2 0 19 19"><path d="M7.498 17.1a7.128 7.128 0 0 1-.98-.068 7.455 7.455 0 0 1-1.795-.483 7.26 7.26 0 0 1-3.028-2.332A7.188 7.188 0 0 1 .73 12.52a7.304 7.304 0 0 1 .972-7.128 7.221 7.221 0 0 1 1.387-1.385 1.03 1.03 0 0 1 1.247 1.638 5.176 5.176 0 0 0-.993.989 5.313 5.313 0 0 0-.678 1.181 5.23 5.23 0 0 0-.348 1.292 5.22 5.22 0 0 0 .326 2.653 5.139 5.139 0 0 0 .69 1.212 5.205 5.205 0 0 0 .992.996 5.257 5.257 0 0 0 1.178.677 5.37 5.37 0 0 0 1.297.35 5.075 5.075 0 0 0 1.332.008 5.406 5.406 0 0 0 1.32-.343 5.289 5.289 0 0 0 2.211-1.682 5.18 5.18 0 0 0 1.02-2.465 5.2 5.2 0 0 0 .01-1.336 5.315 5.315 0 0 0-.343-1.318 5.195 5.195 0 0 0-.695-1.222 5.134 5.134 0 0 0-.987-.989 1.03 1.03 0 1 1 1.24-1.643 7.186 7.186 0 0 1 1.384 1.386 7.259 7.259 0 0 1 .97 1.706 7.413 7.413 0 0 1 .473 1.827 7.296 7.296 0 0 1-4.522 7.65 7.476 7.476 0 0 1-1.825.471 7.203 7.203 0 0 1-.89.056zM7.5 9.613a1.03 1.03 0 0 1-1.03-1.029V2.522a1.03 1.03 0 0 1 2.06 0v6.062a1.03 1.03 0 0 1-1.03 1.03z"/></svg>
);

const MuteIcon = () => (
  <svg fill="currentColor" width="20" height="20" viewBox="-32 -32 576 576"><path d="M215.03 71.05L126.06 160H24c-13.26 0-24 10.74-24 24v144c0 13.25 10.74 24 24 24h102.06l88.97 88.95c15.03 15.03 40.97 4.47 40.97-16.97V88.02c0-21.46-25.96-31.98-40.97-16.97zM461.64 256l45.64-45.64c6.3-6.3 6.3-16.52 0-22.82l-22.82-22.82c-6.3-6.3-16.52-6.3-22.82 0L416 210.36l-45.64-45.64c-6.3-6.3-16.52-6.3-22.82 0l-22.82 22.82c-6.3 6.3-6.3 16.52 0 22.82L370.36 256l-45.63 45.63c-6.3 6.3-6.3 16.52 0 22.82l22.82 22.82c6.3 6.3 16.52 6.3 22.82 0L416 301.64l45.64 45.64c6.3 6.3 16.52 6.3 22.82 0l22.82-22.82c6.3-6.3 6.3-16.52 0-22.82L461.64 256z"/></svg>
);

const VolDownIcon = () => (
  <svg fill="currentColor" width="20" height="20" viewBox="-32 -32 576 576"><path d="M215 71l-89 89H24a24 24 0 0 0-24 24v144a24 24 0 0 0 24 24h102.06L215 441c15 15 41 4.47 41-17V88c0-21.47-26-32-41-17z"/></svg>
);

const VolUpIcon = () => (
  <svg fill="currentColor" width="22" height="20" viewBox="-32 -32 576 576"><path d="M215.03 71.05L126.06 160H24c-13.26 0-24 10.74-24 24v144c0 13.25 10.74 24 24 24h102.06l88.97 88.95c15.03 15.03 40.97 4.47 40.97-16.97V88.02c0-21.46-25.96-31.98-40.97-16.97zm233.32-51.08c-11.17-7.33-26.18-4.24-33.51 6.95-7.34 11.17-4.22 26.18 6.95 33.51 66.27 43.49 105.82 116.6 105.82 195.58 0 78.98-39.55 152.09-105.82 195.58-11.17 7.32-14.29 22.34-6.95 33.5 7.04 10.71 21.93 14.56 33.51 6.95C528.27 439.58 576 351.33 576 256S528.27 72.43 448.35 19.97zM480 256c0-63.53-32.06-121.94-85.77-156.24-11.19-7.14-26.03-3.82-33.12 7.46s-3.78 26.21 7.41 33.36C408.27 165.97 432 209.11 432 256s-23.73 90.03-63.48 115.42c-11.19 7.14-14.5 22.07-7.41 33.36 6.51 10.36 21.12 15.14 33.12 7.46C447.94 377.94 480 319.54 480 256zm-141.77-76.87c-11.58-6.33-26.19-2.16-32.61 9.45-6.39 11.61-2.16 26.2 9.45 32.61C327.98 228.28 336 241.63 336 256c0 14.38-8.02 27.72-20.92 34.81-11.61 6.41-15.84 21-9.45 32.61 6.43 11.66 21.05 15.8 32.61 9.45 28.23-15.55 45.77-45 45.77-76.88s-17.54-61.32-45.78-76.86z"/></svg>
);

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 17 14"><path fill="currentColor" d="M7.2 2.39L10.566-.984l.524-.524L5.32 4.262 11.09 10.032l-.524-.524L7.162 6.116H17.894V5.376H7.162z" transform="translate(2 2)"/></svg>
);

const HomeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 14"><path fill="currentColor" d="M2 8h5v-4h2v4h5v-6h2l-8-8-8 8h2z" transform="translate(0 2)"/></svg>
);

const ArrowUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 18 12"><polygon fill="currentColor" points="9 0 0 11 18 11" transform="translate(0 0.5)"/></svg>
);

const ArrowDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 18 12"><polygon fill="currentColor" points="9 12 0 1 18 1" transform="translate(0 -0.5)"/></svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 13 18"><polygon fill="currentColor" points="0 9 11 18 11 0" transform="translate(1 0)"/></svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 13 18"><polygon fill="currentColor" points="13 9 2 18 2 0" transform="translate(-1 0)"/></svg>
);

const ReplayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 17"><path fill="currentColor" d="M8.5 2.5C4.364 2.5 1 5.864 1 10s3.364 7.5 7.5 7.5c.275 0 .552-.016.828-.047v-1.212a6.45 6.45 0 0 1-.658-.041 6.25 6.25 0 0 1-6.25-6.25c0-3.444 2.806-6.25 6.25-6.25 3.444 0 6.25 2.806 6.25 6.25 0 .213-.174.387-.389.387h-1.973c-.214 0-.388-.174-.388-.387 0-3.444-2.806-6.25-6.25-6.25z" transform="translate(-1 -1) scale(0.9)"/></svg>
);

const AsteriskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 17"><path fill="currentColor" d="M8 2l1.5 4.5h4.5l-3.5 2.5 1.5 4.5-3.5-2.5-3.5 2.5 1.5-4.5-3.5-2.5h4.5z" transform="translate(0 1)"/></svg>
);

const RevIcon = () => (
  <svg width="14" height="14" viewBox="0 0 21 15"><path fill="currentColor" d="M10 7.5L20 0v15L10 7.5zm-10 0L10 0v15L0 7.5z"/></svg>
);

const FwdIcon = () => (
  <svg width="14" height="14" viewBox="0 0 21 15"><path fill="currentColor" d="M11 7.5L1 15V0l10 7.5zm10 0L11 15V0l10 7.5z"/></svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 11 14"><path fill="currentColor" d="M0 0l11 7-11 7V0z"/></svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
);

export default RokuRemote;
