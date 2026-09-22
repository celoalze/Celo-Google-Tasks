const { contextBridge, ipcRenderer } = require('electron');

const api = {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  googleLogin: (clientId, clientSecret) =>
    ipcRenderer.invoke('auth:google-login', clientId, clientSecret),
  getGoogleSession: () => ipcRenderer.invoke('auth:get-session'),
  googleLogout: () => ipcRenderer.invoke('auth:logout'),
  showNotification: (options) => ipcRenderer.invoke('notification:show', options),
  testNotification: () => ipcRenderer.invoke('notification:test'),
  setBadge: (count, dataUrl) => ipcRenderer.invoke('app:set-badge', count, dataUrl),
  getAutoLaunch: () => ipcRenderer.invoke('app:get-auto-launch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('app:set-auto-launch', enabled),
  onNotificationClicked: (callback) => {
    const handler = (_event, taskId) => callback(taskId);
    ipcRenderer.on('notification:clicked', handler);
    return () => ipcRenderer.removeListener('notification:clicked', handler);
  },
  onNotificationAction: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('notification:action', handler);
    return () => ipcRenderer.removeListener('notification:action', handler);
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
