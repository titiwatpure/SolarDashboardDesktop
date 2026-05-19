const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data));
  },
  removeUpdateListener: () => {
    ipcRenderer.removeAllListeners('update-status');
  },
  selectFolder: (options) => ipcRenderer.invoke('select-folder', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
});
