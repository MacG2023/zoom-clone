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

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

registerProtocol();

app.on('open-url', (_event, url) => {
  const meetingId = extractMeetingId(url);
  if (meetingId && mainWindow) {
    mainWindow.webContents.send('deep-link', meetingId);
  }
});

// Only enforce single-instance in production (packaged app)
if (!process.env.ELECTRON_RENDERER_URL) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (_event, commandLine) => {
      const url = commandLine.find((arg) => arg.startsWith('zoomclone://'));
      if (url) {
        const meetingId = extractMeetingId(url);
        if (meetingId && mainWindow) {
          mainWindow.webContents.send('deep-link', meetingId);
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      }
    });
  }
}

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
