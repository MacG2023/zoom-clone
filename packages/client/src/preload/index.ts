import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  executeRemoteControl: (event: unknown) => ipcRenderer.invoke('execute-remote-control', event),
  onDeepLink: (callback: (meetingId: string) => void) => {
    ipcRenderer.on('deep-link', (_event, meetingId) => callback(meetingId));
  },
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
});
