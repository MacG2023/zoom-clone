import { app, BrowserWindow, ipcMain, desktopCapturer, screen } from 'electron';
import path from 'path';
import { registerProtocol, extractMeetingId } from './protocol';
import { setupRemoteControlExecutor } from './remote-control-executor';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#1a1a2e',
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173';
  mainWindow.loadURL(rendererUrl).catch(() => {
    // Dev server not running, try built file
    mainWindow!.loadFile(path.join(__dirname, '../renderer/index.html'));
  });

  mainWindow.webContents.openDevTools();
}

registerProtocol();

app.on('open-url', (_event, url) => {
  const meetingId = extractMeetingId(url);
  if (meetingId && mainWindow) {
    mainWindow.webContents.send('deep-link', meetingId);
  }
});

// Single-instance lock disabled for local multi-instance testing
// const gotTheLock = app.requestSingleInstanceLock();
// if (!gotTheLock) {
//   app.quit();
// }

app.whenReady().then(() => {
  createWindow();
});
setupRemoteControlExecutor();

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('get-desktop-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
  }));
});

ipcMain.handle('get-screen-size', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
  };
});
