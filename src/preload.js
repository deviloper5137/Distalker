const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('distalker', {
    getStartupEnabled: () => ipcRenderer.invoke('app:get-startup-enabled'),
    setStartupEnabled: (enabled) => ipcRenderer.invoke('app:set-startup-enabled', enabled),
    getStartupMinimized: () => ipcRenderer.invoke('app:get-startup-minimized'),
    setStartupMinimized: (minimized) => ipcRenderer.invoke('app:set-startup-minimized', minimized),
    getCurrentWindow: () => ipcRenderer.invoke('app:get-current-window'),
    onWindowChanged: (callback) => ipcRenderer.on('window-changed', callback),
    getRpcStatus: () => ipcRenderer.invoke('app:get-rpc-status'),
    onRpcStatus: (callback) => ipcRenderer.on('rpc-status', callback),
    toggleRpcActivity: () => ipcRenderer.invoke('app:toggle-rpc-activity'),
    onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', callback),
    platform: process.platform
});


