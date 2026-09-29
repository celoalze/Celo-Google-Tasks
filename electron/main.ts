import { app, BrowserWindow, ipcMain, shell, Notification, Tray, Menu, nativeImage, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  startOAuthLoopback,
  loadAuthTokens,
  clearAuthTokens,
  refreshAccessToken,
} from './auth/googleAuth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.setName('Google Tasks');

// Set Application User Model ID on Windows for native toast notifications
if (process.platform === 'win32') {
  const appId = 'com.google.tasks.desktop';
  app.setAppUserModelId(appId);

  // Ensure Start Menu shortcut exists so Windows Action Center never suppresses toast notifications
  try {
    const programsDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const shortcutPath = path.join(programsDir, 'Google Tasks.lnk');
    if (!fs.existsSync(shortcutPath)) {
      shell.writeShortcutLink(shortcutPath, 'create', {
        target: process.execPath,
        appUserModelId: appId,
        description: 'Google Tasks Desktop',
      });
    }
  } catch (err) {
    console.warn('[Main] Aviso ao registrar atalho para notificações:', err);
  }
}

// Single Instance Lock and Protocol Handler for Windows Toast Action Buttons
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
    const urlArg = commandLine.find((arg) => arg.startsWith('googletasks://') || arg.startsWith('tasks://'));
    if (urlArg) {
      handleProtocolUrl(urlArg);
    }
  });
}

// Register custom protocols for toast button activation (ambos os schemes declarados no builder)
for (const scheme of ['googletasks', 'tasks'] as const) {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(scheme, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(scheme);
  }
}

const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:']);
const MAX_BADGE_COUNT = 999;
const MAX_DATA_URL_LENGTH = 200_000;
const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;

function isSafeExternalUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeTaskId(taskId: string): string {
  return taskId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
}

function isValidClientIdFormat(clientId: string): boolean {
  return CLIENT_ID_PATTERN.test((clientId || '').trim());
}

process.env.APP_ROOT = path.join(__dirname, '..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = app.isPackaged
  ? RENDERER_DIST
  : path.join(process.env.APP_ROOT, 'public');

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let lastBadge: { count: number; dataUrl?: string; trayDataUrl?: string } | null = null;

const preloadCjs = path.join(__dirname, 'preload.cjs');
const preloadDev = path.join(process.env.APP_ROOT, 'electron', 'preload.cjs');
const preload = fs.existsSync(preloadCjs) ? preloadCjs : preloadDev;

const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path.join(RENDERER_DIST, 'index.html');

function getIconPath(): string {
  const publicDir = process.env.VITE_PUBLIC || path.join(process.env.APP_ROOT || '', 'public');
  return path.join(publicDir, 'icon.png');
}


function handleProtocolUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'googletasks:' && parsed.protocol !== 'tasks:') return;
    const action = parsed.hostname; // 'open' | 'snooze' | 'complete'
    const allowedActions = new Set(['open', 'snooze', 'complete']);
    const rawTaskId = parsed.searchParams.get('taskId') || '';
    const taskId = sanitizeTaskId(rawTaskId);

    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();

      if (action === 'complete' && taskId) {
        win.webContents.send('notification:action', { action: 'complete', taskId });
      } else if (action === 'snooze' && taskId) {
        win.webContents.send('notification:action', { action: 'snooze', taskId });
      } else if (allowedActions.has(action) || action === '') {
        if (taskId) win.webContents.send('notification:clicked', taskId);
      } else {
        win.webContents.send('notification:clicked', taskId);
      }
    }
  } catch (err) {
    console.error('[Main] Erro ao processar URL de protocolo:', err);
  }
}

function getNotificationIconPath(): string {
  try {
    const userDataDir = app.getPath('userData');
    const targetIconPath = path.join(userDataDir, 'app-icon.png');
    if (!fs.existsSync(targetIconPath)) {
      const sourceIcon = getIconPath();
      if (fs.existsSync(sourceIcon)) {
        fs.writeFileSync(targetIconPath, fs.readFileSync(sourceIcon));
      }
    }
    if (fs.existsSync(targetIconPath)) {
      return targetIconPath;
    }
  } catch (err) {
    console.warn('[Main] Falha ao preparar ícone de notificação:', err);
  }
  return getIconPath();
}

function showNativeNotification(options: { title: string; body: string; taskId?: string }) {
  if (!Notification.isSupported()) {
    console.warn('[Main] Notificações não são suportadas neste sistema');
    return { ok: false, error: 'Notificações não são suportadas neste sistema' };
  }

  const iconPath = getNotificationIconPath();
  const title = String(options.title || 'Google Tasks').slice(0, 120);
  const body = String(options.body || '').slice(0, 300);
  const safeTaskId = options.taskId ? sanitizeTaskId(options.taskId) : undefined;

  try {
    const notif = new Notification({
      title,
      body,
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
      silent: false,
    });

    notif.on('click', () => {
      if (win) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        if (safeTaskId && safeTaskId !== 'test-task') {
          win.webContents.send('notification:clicked', safeTaskId);
        }
      }
    });

    notif.on('failed', (_event, error) => {
      console.warn('[Main] Notificação nativa falhou:', error);
    });

    notif.show();
    return { ok: true };
  } catch (err: any) {
    console.warn('[Main] Erro ao instanciar notificação nativa:', err);
    return { ok: false, error: err?.message || String(err) };
  }
}

function createTray() {
  const trayIconPath = getIconPath();
  if (!fs.existsSync(trayIconPath)) return;

  tray = new Tray(trayIconPath);
  tray.setToolTip('Google Tasks');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Google Tasks',
      click: () => {
        if (win) {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        }
      },
    },
    {
      label: 'Minimizar para Barra de Tarefas',
      click: () => {
        if (win) {
          win.minimize();
        }
      },
    },
    {
      label: 'Ocultar na Bandeja',
      click: () => {
        if (win) {
          win.hide();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Testar Notificação',
      click: () => {
        showNativeNotification({
          title: 'test',
          body: 'Lembrete de tarefa com botões de contexto',
          taskId: 'test-task',
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Single-click on tray icon toggles or shows the window
  tray.on('click', () => {
    if (win) {
      if (win.isVisible() && !win.isMinimized() && win.isFocused()) {
        win.minimize();
      } else {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}

function applyTaskbarBadge(count: number, dataUrl?: string, trayDataUrl?: string) {
  lastBadge = { count, dataUrl, trayDataUrl };

  if (process.platform === 'darwin') {
    app.setBadgeCount(count);
  }

  // 1. Windows Taskbar Overlay Icon (Pinned / Running app on Taskbar)
  if (process.platform === 'win32' && win) {
    if (count <= 0 || !dataUrl) {
      win.setOverlayIcon(null, '');
    } else {
      try {
        const img = nativeImage.createFromDataURL(dataUrl);
        win.setOverlayIcon(img, `${count} tarefas pendentes`);
      } catch (err) {
        console.warn('[Main] Falha ao definir overlayIcon na barra de tarefas:', err);
      }
    }
  }

  // 2. Windows System Tray Icon & Tooltip
  if (tray) {
    try {
      if (count <= 0) {
        tray.setToolTip('Google Tasks');
        const defaultIcon = nativeImage.createFromPath(getIconPath());
        tray.setImage(defaultIcon);
      } else {
        tray.setToolTip(`Google Tasks - ${count} tarefas pendentes`);
        if (trayDataUrl) {
          const trayImg = nativeImage.createFromDataURL(trayDataUrl);
          tray.setImage(trayImg);
        }
      }
    } catch (err) {
      console.warn('[Main] Falha ao atualizar ícone da bandeja:', err);
    }
  }
}

function createWindow() {
  const iconPath = getIconPath();

  win = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 800,
    minHeight: 560,
    frame: false, // Frameless for sleek custom Windows 11 titlebar
    backgroundColor: '#131314',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    show: false,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      backgroundThrottling: false, // Ensures timers & badge syncing never pause when unfocused/minimized
    },
  });

  if (url) {
    win.loadURL(url);
  } else {
    win.loadFile(indexHtml);
  }

  win.once('ready-to-show', () => {
    win?.show();
    if (lastBadge) {
      applyTaskbarBadge(lastBadge.count, lastBadge.dataUrl, lastBadge.trayDataUrl);
    }
  });

  win.on('show', () => {
    if (lastBadge) {
      applyTaskbarBadge(lastBadge.count, lastBadge.dataUrl, lastBadge.trayDataUrl);
    }
  });

  // Re-apply taskbar overlay icon on all window state transitions so Windows Explorer never drops it
  win.on('blur', () => {
    if (lastBadge && lastBadge.count > 0 && lastBadge.dataUrl) {
      setTimeout(() => {
        if (win && lastBadge && lastBadge.dataUrl) {
          try {
            const img = nativeImage.createFromDataURL(lastBadge.dataUrl);
            win.setOverlayIcon(img, `${lastBadge.count} tarefas pendentes`);
          } catch {}
        }
      }, 50);
    }
  });

  win.on('focus', () => {
    if (lastBadge && lastBadge.count > 0 && lastBadge.dataUrl) {
      setTimeout(() => {
        if (win && lastBadge && lastBadge.dataUrl) {
          try {
            const img = nativeImage.createFromDataURL(lastBadge.dataUrl);
            win.setOverlayIcon(img, `${lastBadge.count} tarefas pendentes`);
          } catch {}
        }
      }, 50);
    }
  });

  win.on('minimize', () => {
    if (lastBadge && lastBadge.count > 0 && lastBadge.dataUrl) {
      setTimeout(() => {
        if (win && lastBadge && lastBadge.dataUrl) {
          try {
            const img = nativeImage.createFromDataURL(lastBadge.dataUrl);
            win.setOverlayIcon(img, `${lastBadge.count} tarefas pendentes`);
          } catch {}
        }
      }, 150);
    }
  });

  win.on('restore', () => {
    if (lastBadge && lastBadge.count > 0 && lastBadge.dataUrl) {
      setTimeout(() => {
        if (win && lastBadge && lastBadge.dataUrl) {
          try {
            const img = nativeImage.createFromDataURL(lastBadge.dataUrl);
            win.setOverlayIcon(img, `${lastBadge.count} tarefas pendentes`);
          } catch {}
        }
      }, 150);
    }
  });

  // When user closes the window: minimize to taskbar so taskbar button & badge remain visible!
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.minimize();
    }
  });

  // Open external links in user's default browser (allowlist https only)
  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (!isSafeExternalUrl(targetUrl)) return { action: 'deny' };
    void shell.openExternal(targetUrl);
    return { action: 'deny' };
  });
}

// Window control IPCs
ipcMain.on('window-minimize', () => {
  win?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window-close', () => {
  win?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return win?.isMaximized() ?? false;
});

ipcMain.handle('open-external', async (_event, targetUrl: string) => {
  if (typeof targetUrl !== 'string' || !isSafeExternalUrl(targetUrl)) {
    throw new Error('URL externa bloqueada (apenas https permitido).');
  }
  await shell.openExternal(targetUrl);
});

// Native Desktop Notifications IPC
ipcMain.handle(
  'notification:show',
  async (_event, options: { title: string; body: string; taskId?: string }) => {
    return showNativeNotification(options);
  }
);

ipcMain.handle('notification:test', async () => {
  return showNativeNotification({
    title: 'Google Tasks Desktop',
    body: '🔔 Notificações ativas! Você receberá lembretes das suas tarefas.',
    taskId: 'test-task',
  });
});

// Windows Taskbar & System Overlay Badge IPC (com clamp anti-DoS)
ipcMain.handle('app:set-badge', async (_event, count: number, dataUrl?: string, trayDataUrl?: string) => {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.min(MAX_BADGE_COUNT, Math.floor(count))) : 0;
  const safeDataUrl = typeof dataUrl === 'string' && dataUrl.length <= MAX_DATA_URL_LENGTH ? dataUrl : undefined;
  const safeTrayUrl = typeof trayDataUrl === 'string' && trayDataUrl.length <= MAX_DATA_URL_LENGTH ? trayDataUrl : undefined;
  applyTaskbarBadge(safeCount, safeDataUrl, safeTrayUrl);
  return { ok: true };
});

// Windows Auto-Launch on Boot IPC Handlers
ipcMain.handle('app:get-auto-launch', async () => {
  try {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  } catch (err) {
    console.warn('[Main] Falha ao obter loginItemSettings:', err);
    return false;
  }
});

ipcMain.handle('app:set-auto-launch', async (_event, enabled: boolean) => {
  try {
    const settings: Electron.Settings = {
      openAtLogin: enabled,
    };
    if (!app.isPackaged) {
      settings.path = process.execPath;
      settings.args = [path.resolve(process.argv[1] || '')];
    }
    app.setLoginItemSettings(settings);
    const updated = app.getLoginItemSettings().openAtLogin;
    return { ok: true, enabled: updated };
  } catch (err: unknown) {
    console.warn('[Main] Falha ao configurar loginItemSettings:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao configurar inicialização automática' };
  }
});

// Google Authentication IPC Handlers
ipcMain.handle(
  'auth:google-login',
  async (_event, clientId: string, clientSecret?: string) => {
    if (!isValidClientIdFormat(clientId)) {
      return { ok: false, error: 'Client ID inválido.' };
    }
    return await startOAuthLoopback(clientId.trim(), clientSecret);
  }
);

ipcMain.handle('auth:get-session', async () => {
  const tokens = loadAuthTokens();
  if (!tokens) {
    return { ok: false, error: 'Nenhuma sessão encontrada' };
  }

  // Check if access token is expired or close to expiring (within 2 minutes)
  let active = tokens;
  if (Date.now() > tokens.expiresAt - 120000 && tokens.refreshToken) {
    const refreshed = await refreshAccessToken(tokens);
    if (refreshed) active = refreshed;
  }

  // Expõe apenas accessToken de curta duração ao renderer — nunca refreshToken/secret.
  return {
    ok: true,
    data: { accessToken: active.accessToken, expiresAt: active.expiresAt, clientId: active.clientId },
  };
});

ipcMain.handle('auth:logout', async () => {
  clearAuthTokens();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && isQuitting) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    win?.show();
    win?.focus();
  }
});

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    // Nega geolocalização, mídia, etc. por padrão — app de tarefas não precisa.
    if (permission === 'notifications') callback(true);
    else callback(false);
  });

  createWindow();
  createTray();

  const initialUrl = process.argv.find((arg) => arg.startsWith('googletasks://') || arg.startsWith('tasks://'));
  if (initialUrl && win) {
    win.webContents.once('did-finish-load', () => {
      handleProtocolUrl(initialUrl);
    });
  }
});
