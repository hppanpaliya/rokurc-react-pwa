import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Info, Tv, Power, Zap, Radio, BarChart3, Smartphone } from 'lucide-react';
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
  
  let sizeClasses = "w-[31%] py-3";
  if (double) sizeClasses = "w-[48%] py-3";
  if (center) sizeClasses = "w-[31%] mx-auto py-3";

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
  const [activeApp, setActiveApp] = useState(null);
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

  const checkBackendAvailability = useCallback(async () => {
    const backendUrl = env.VITE_BACKEND_URL || '/api';
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
    const backendUrl = env.VITE_BACKEND_URL || '/api';
    if (backendUrl && backendAvailable && !forceDirect) {
       const cleanPath = path.startsWith('/') ? path.slice(1) : path;
       return `${backendUrl}/${ip}/${cleanPath}`;
    }
    return `http://${ip}:8060/${path}`;
  }, [ip, backendAvailable]);

  const updateUrl = useCallback((newIp = ip, newShortcuts = shortcuts) => {
    const url = new URL(window.location);
    if (newIp) {
      url.searchParams.set('MyRokuTVIP', newIp);
    } else {
      url.searchParams.delete('MyRokuTVIP');
    }
    
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

    checkBackendAvailability();
  }, []);

  useEffect(() => {
    if (apps.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlShortcuts = urlParams.get('shortcuts');
    
    if (urlShortcuts) {
      const shortcutIds = urlShortcuts.split(',').filter(id => id.trim());
      const urlShortcutApps = apps.filter(app => shortcutIds.includes(app.id));
      
      if (urlShortcutApps.length > 0) {
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
    
    await checkBackendAvailability();
    setConnectionStatus('connected');
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
      const modelName = xml.querySelector('model-name')?.textContent;
      const friendlyName = xml.querySelector('friendly-device-name')?.textContent;
      const screenSize = xml.querySelector('screen-size')?.textContent;
      const uiResolution = xml.querySelector('ui-resolution')?.textContent;
      const softwareVersion = xml.querySelector('software-version')?.textContent;
      
      setDeviceInfo({ 
        powerMode, 
        modelName, 
        friendlyName, 
        screenSize,
        uiResolution,
        softwareVersion
      });
      setConnectionStatus('connected');
    } catch {
      console.log('Could not fetch device info due to CORS restrictions');
      setConnectionStatus('error');
    }
  }, [ip, getUrl]);

  const fetchMediaPlayer = useCallback(async () => {
    if (!ip || !backendAvailable) return;
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
        position,
        duration,
        progress: duration > 0 ? (position / duration) * 100 : 0
      });
    } catch {
      // Expected on direct connections
    }
  }, [ip, backendAvailable, getUrl]);

  const fetchActiveApp = useCallback(async () => {
    if (!ip || !backendAvailable) return;
    try {
      const response = await fetch(getUrl('query/active-app'), { signal: AbortSignal.timeout(2000) });
      const text = await response.text();
      const xml = parseXml(text);
      const appEl = xml.querySelector('app');
      
      if (appEl) {
        setActiveApp({
          id: appEl.getAttribute('id'),
          name: appEl.textContent,
          type: appEl.getAttribute('type') || 'app'
        });
      }
    } catch {
      console.log('Could not fetch active app');
    }
  }, [ip, backendAvailable, getUrl]);

  const fetchApps = useCallback(async () => {
    if (!ip || !backendAvailable) return;
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
      console.log('Could not fetch apps list');
    }
  }, [ip, backendAvailable, getUrl]);

  const launchApp = useCallback(async (appId) => {
    if (!ip) return;
    try {
      await fetch(`http://${ip}:8060/launch/${appId}`, { method: 'POST', mode: 'no-cors' });
      setTimeout(() => {
        fetchMediaPlayer();
        fetchActiveApp();
      }, 1000);
    } catch (err) {
      console.error("App launch failed", err);
    }
  }, [ip, fetchMediaPlayer, fetchActiveApp]);

  const addShortcut = (app) => {
    if (shortcuts.length >= 6) {
      alert("Maximum 6 shortcuts allowed");
      return;
    }
    const newShortcut = {
      id: app.id,
      name: app.name,
      type: 'app'
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
      type: 'app'
    };
    const updatedShortcuts = [...shortcuts, newShortcut];
    setShortcuts(updatedShortcuts);
    localStorage.setItem('roku_shortcuts', JSON.stringify(updatedShortcuts));
    updateUrl(ip, updatedShortcuts);

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

    setActiveKey(key);
    setTimeout(() => setActiveKey(null), 200);

    const endpoint = value ? `${key}/${encodeURIComponent(value)}` : `keypress/${key}`;
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
      await checkBackendAvailability();
      fetchDeviceInfo();
      if (backendAvailable) {
        fetchMediaPlayer();
        fetchActiveApp();
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 10000);

    return () => clearInterval(pollingRef.current);
  }, [ip, fetchDeviceInfo, fetchMediaPlayer, fetchActiveApp, checkBackendAvailability, backendAvailable]);

  // --- Keyboard Listeners ---
  useEffect(() => {
    const handleKeyDown = (e) => {
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

  const getAccentColor = () => {
    if (activeApp?.id && APP_COLORS[activeApp.id]) {
      return APP_COLORS[activeApp.id];
    }
    return '#662D91';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-2 sm:p-4 font-sans overflow-y-auto">
      <div className="w-full max-w-[480px] bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 p-4 sm:p-6 relative">
        
        {/* Header with Status */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-white">Roku RC</h1>
            <p className="text-xs text-gray-400">{ip || 'Not Connected'}</p>
          </div>
          <div className="flex gap-2">
            <div className="flex flex-col items-center gap-1">
              {connectionStatus === 'connected' && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="TV Connected"></span>}
              {connectionStatus === 'error' && <span className="w-2 h-2 bg-red-500 rounded-full" title="TV Error"></span>}
              {!ip && <span className="w-2 h-2 bg-gray-500 rounded-full" title="Not Configured"></span>}
              <span className="text-xs text-gray-500">TV</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {backendAvailable ? (
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" title="Backend Online"></span>
              ) : (
                <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Backend Offline"></span>
              )}
              <span className="text-xs text-gray-500">API</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setIsShortcutsOpen(!isShortcutsOpen)} className="text-gray-400 hover:text-white transition"><Tv size={24} /></button>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-gray-400 hover:text-white transition"><Settings size={24} /></button>
          </div>
        </div>

        {/* Device Info Panel */}
        {deviceInfo && backendAvailable && (
          <div className="mb-6 p-4 bg-gray-700 rounded-2xl border border-gray-600">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs">Device</p>
                <p className="text-white font-medium text-sm truncate">{deviceInfo.friendlyName || 'Roku TV'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Model</p>
                <p className="text-white font-medium text-sm">{deviceInfo.modelName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Resolution</p>
                <p className="text-white font-medium text-sm">{deviceInfo.uiResolution || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Power</p>
                <p className="text-white font-medium text-sm flex items-center gap-1">
                  <Power size={14} className={deviceInfo.powerMode === 'Ready' ? 'text-red-400' : 'text-green-400'} />
                  {deviceInfo.powerMode === 'Ready' ? 'Stand By - OFF' : deviceInfo.powerMode || '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Active App Display */}
        {activeApp && backendAvailable && (
          <div className="mb-6 p-4 rounded-2xl border border-gray-600" style={{ backgroundColor: `${getAccentColor()}20` }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: getAccentColor() }}>
                <Radio size={24} className="text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">Currently Playing</p>
                <p className="text-white font-semibold">{activeApp.name}</p>
              </div>
            </div>
            {mediaState && mediaState.duration > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${mediaState.progress}%`, backgroundColor: getAccentColor() }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>{msToTime(mediaState.position)}</span>
                  <span>{msToTime(mediaState.duration)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configuration Panel */}
        {isSettingsOpen && (
          <div className="mb-6 p-4 bg-gray-700 rounded-2xl border border-gray-600 animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-medium text-white mb-2">Roku TV IP Address</label>
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                value={ip} 
                onChange={(e) => setIp(e.target.value)}
                placeholder="e.g. 192.168.1.50"
                className="flex-1 p-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-gray-800 text-white"
              />
              <button 
                onClick={() => saveIp(ip)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-400">Settings &gt; Network &gt; About on your Roku</p>
          </div>
        )}

        {/* Shortcuts Bar */}
        {shortcuts.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-2">
              {shortcuts.map((shortcut) => (
                <button
                  key={shortcut.id}
                  onClick={() => launchApp(shortcut.id)}
                  className="flex items-center justify-center p-3 h-14 bg-gray-700 hover:bg-gray-600 rounded-xl border border-gray-600 text-xs font-medium text-white text-center leading-tight transition-colors"
                  style={{ borderLeftColor: APP_COLORS[shortcut.id] || '#662D91', borderLeftWidth: '3px' }}
                >
                  <span className="line-clamp-2">{shortcut.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Shortcuts Management Panel */}
        {isShortcutsOpen && (
          <div className="mb-6 p-4 bg-gray-700 rounded-2xl border border-gray-600 animate-in fade-in slide-in-from-top-2">
            <h3 className="text-lg font-semibold text-white mb-4">Manage Shortcuts</h3>

            {backendAvailable ? (
              <>
                {shortcuts.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Your Shortcuts (Max 6)</h4>
                    <div className="space-y-2">
                      {shortcuts.map((shortcut) => (
                        <div key={shortcut.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                          <span className="text-sm text-gray-200">{shortcut.name}</span>
                          <button
                            onClick={() => removeShortcut(shortcut.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Available Apps</h4>
                  {apps.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto mb-3">
                      {apps.map((app) => {
                        const isShortcut = shortcuts.some(s => s.id === app.id);
                        return (
                          <div key={app.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-lg">
                            <span className="text-sm text-gray-200 truncate">{app.name}</span>
                            {!isShortcut && shortcuts.length < 6 && (
                              <button
                                onClick={() => addShortcut(app)}
                                className="ml-2 text-purple-400 hover:text-purple-300 text-sm font-medium"
                              >
                                +
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mb-3">No apps found.</p>
                  )}
                  <button
                    onClick={fetchApps}
                    className="text-sm text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Refresh Apps
                  </button>

                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <button
                      onClick={() => setShowManualAdd(!showManualAdd)}
                      className="text-sm text-purple-400 hover:text-purple-300 font-medium"
                    >
                      {showManualAdd ? 'Cancel' : 'Add Manual Shortcut'}
                    </button>

                    {showManualAdd && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">App Name</label>
                          <input
                            type="text"
                            value={manualAppName}
                            onChange={(e) => setManualAppName(e.target.value)}
                            placeholder="e.g., Netflix"
                            className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-800 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">App ID</label>
                          <input
                            type="text"
                            value={manualAppId}
                            onChange={(e) => setManualAppId(e.target.value)}
                            placeholder="e.g., 12"
                            className="w-full px-3 py-2 text-sm border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-800 text-white"
                          />
                        </div>
                        <button
                          onClick={addManualShortcut}
                          disabled={!manualAppName.trim() || !manualAppId.trim() || shortcuts.length >= 6}
                          className="w-full py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          Add Shortcut
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-yellow-400">Backend offline - app management unavailable. Use manual shortcuts.</p>
            )}
          </div>
        )}

        {/* Remote Grid */}
        <div className="space-y-4">
          
          {/* Row 1: Power & Volume */}
          <div className="flex justify-between gap-2">
            <RemoteBtn action="Power" className="bg-red-600 hover:bg-red-700" activeKey={activeKey} sendCommand={sendCommand}>
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
              className="w-full p-3 text-center border border-purple-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg text-white placeholder-gray-500 bg-gray-700"
              onKeyDown={(e) => {
                if (e.key === 'Backspace') {
                   sendCommand('Backspace');
                } else if (e.key.length === 1) {
                   sendCommand(`Lit_${encodeURIComponent(e.key)}`);
                }
              }}
            />
          </div>

          {/* Connection Prompt */}
          {!ip && (
             <div className="text-center mt-6 p-4 bg-gray-700 rounded-xl border border-gray-600">
                <Smartphone size={32} className="mx-auto text-gray-500 mb-2" />
                <p className="text-gray-300 text-sm font-medium">Configure Your Roku TV</p>
                <p className="text-gray-400 text-xs mt-1">Click the settings icon above to get started</p>
             </div>
          )}

        </div>
      </div>
      
      {/* Global Styles */}
      <style>{`
        .bg-roku-purple { background-color: #662D91; }
        .hover\\:bg-roku-dark:hover { background-color: #49247A; }
        .text-roku-purple { color: #662D91; }
        .ring-roku-purple { --tw-ring-color: #662D91; }
      `}</style>
    </div>
  );
};

// --- SVG Icons ---
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
