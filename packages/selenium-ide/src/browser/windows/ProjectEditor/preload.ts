import preload from '../../helpers/preload-electron'
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script initialized');

contextBridge.exposeInMainWorld('electronAPI', {
  onMenuItemClicked: (callback: (arg0: any) => void) => {
    console.log('Setting up listener for menu item click');
    ipcRenderer.on('sendtoxt', (_event, message) => {
      console.log(`Received message from main process: ${message}`);
      callback(message);
    });
  },
  sendMessageToMain: (message: any) => ipcRenderer.send('message-from-renderer', message),
});
preload()
