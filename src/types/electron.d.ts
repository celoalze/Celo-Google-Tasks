export interface AuthSessionPayload {
  accessToken: string;
  expiresAt: number;
  clientId: string;
}

export interface AuthTokensPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  clientId: string;
  clientSecret?: string;
}

export interface ElectronAPI {
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isWindowMaximized: () => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;

  googleLogin: (
    clientId: string,
    clientSecret?: string
  ) => Promise<{ ok: boolean; data?: AuthTokensPayload; error?: string }>;
  getGoogleSession: () => Promise<{ ok: boolean; data?: AuthSessionPayload; error?: string }>;
  googleLogout: () => Promise<void>;
  showNotification: (options: {
    title: string;
    body: string;
    taskId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  testNotification: () => Promise<{ ok: boolean; error?: string }>;
  setBadge: (count: number, dataUrl?: string, trayDataUrl?: string) => Promise<{ ok: boolean }>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<{ ok: boolean; enabled: boolean; error?: string }>;
  onNotificationClicked: (callback: (taskId: string) => void) => () => void;
  onNotificationAction: (callback: (payload: { action: 'snooze' | 'complete'; taskId: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
