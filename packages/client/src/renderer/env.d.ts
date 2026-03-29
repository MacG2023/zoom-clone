interface ElectronAPI {
  getDesktopSources: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
  executeRemoteControl: (event: unknown) => Promise<void>;
  onDeepLink: (callback: (meetingId: string) => void) => void;
  getScreenSize: () => Promise<{ width: number; height: number }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
