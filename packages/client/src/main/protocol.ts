import { app } from 'electron';

const PROTOCOL = 'zoomclone';

export function registerProtocol(): void {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [process.argv[1]]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

export function extractMeetingId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === `${PROTOCOL}:` && parsed.hostname === 'meeting') {
      return parsed.pathname.replace(/^\//, '');
    }
  } catch {
    // Not a valid URL
  }
  return null;
}
