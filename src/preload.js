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
    
    // 사용자 상태 관련 메서드
    getUserStatus: () => ipcRenderer.invoke('app:get-user-status'),
    getStatusManagerSettings: () => ipcRenderer.invoke('app:get-status-manager-settings'),
    updateStatusManagerSettings: (settings) => ipcRenderer.invoke('app:update-status-manager-settings', settings),
    forceStatusUpdate: (status) => ipcRenderer.invoke('app:force-status-update', status),
    onUserStatusChanged: (callback) => ipcRenderer.on('user-status-changed', callback),
    
    platform: process.platform
});


