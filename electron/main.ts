import { app, BrowserWindow, ipcMain, shell, Notification, Tray, Menu, nativeImage } from 'electron';
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
  app.setAppUserModelId(app.isPackaged ? 'com.google.tasks.desktop' : process.execPath);
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
    const urlArg = commandLine.find((arg) => arg.startsWith('googletasks://'));
    if (urlArg) {
      handleProtocolUrl(urlArg);
    }
  });
}

// Register custom protocol for toast button activation
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('googletasks', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('googletasks');
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
let lastBadge: { count: number; dataUrl?: string } | null = null;

const preloadCjs = path.join(__dirname, 'preload.cjs');
const preloadDev = path.join(process.env.APP_ROOT, 'electron', 'preload.cjs');
const preload = fs.existsSync(preloadCjs) ? preloadCjs : preloadDev;

const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = path.join(RENDERER_DIST, 'index.html');

function getIconPath(): string {
  const publicDir = process.env.VITE_PUBLIC || path.join(process.env.APP_ROOT || '', 'public');
  return path.join(publicDir, 'icon.png');
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function handleProtocolUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const action = parsed.hostname; // 'open' | 'snooze' | 'complete'
    const taskId = parsed.searchParams.get('taskId') || '';

    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();

      if (action === 'complete') {
        win.webContents.send('notification:action', { action: 'complete', taskId });
      } else if (action === 'snooze') {
        win.webContents.send('notification:action', { action: 'snooze', taskId });
      } else {
        win.webContents.send('notification:clicked', taskId);
      }
    }
  } catch (err) {
    console.error('[Main] Erro ao processar URL de protocolo:', err);
  }
}

function showNativeNotification(options: { title: string; body: string; taskId?: string }) {
  if (!Notification.isSupported()) {
    console.warn('[Main] Notificações não são suportadas neste sistema');
    return { ok: false, error: 'Notificações não são suportadas neste sistema' };
  }

  const iconPath = getIconPath();
  const taskId = options.taskId || 'general';

  // On Windows, construct native Toast Generic XML with large app icon and "Adiar" / "Concluir" buttons
  if (process.platform === 'win32') {
    const titleXml = escapeXml(options.title || 'Google Tasks');
    const bodyXml = escapeXml(options.body || '');
    const xml = `
<toast activationType="protocol" launch="googletasks://open?taskId=${encodeURIComponent(taskId)}">
  <visual>
    <binding template="ToastGeneric">
      <text>${titleXml}</text>
      ${bodyXml ? `<text>${bodyXml}</text>` : ''}
      ${fs.existsSync(iconPath) ? `<image placement="appLogoOverride" hint-crop="circle" src="${iconPath}" />` : ''}
    </binding>
  </visual>
  <actions>
    <action content="Adiar" activationType="protocol" arguments="googletasks://snooze?taskId=${encodeURIComponent(taskId)}" />
    <action content="Concluir" activationType="protocol" arguments="googletasks://complete?taskId=${encodeURIComponent(taskId)}" />
  </actions>
</toast>`.trim();

    try {
      const notif = new Notification({ toastXml: xml });
      notif.on('click', () => {
        if (win) {
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
          if (options.taskId) {
            win.webContents.send('notification:clicked', options.taskId);
          }
        }
      });
      notif.show();
      return { ok: true };
    } catch (err) {
      console.warn('[Main] Falha ao exibir toastXml, usando fallback:', err);
    }
  }

  // Fallback for non-Windows or if toastXml fails
  const fallbackNotif = new Notification({
    title: options.title,
    body: options.body,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    silent: false,
  });

  fallbackNotif.on('click', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      if (options.taskId) {
        win.webContents.send('notification:clicked', options.taskId);
      }
    }
  });

  fallbackNotif.show();
  return { ok: true };
}

function createTray() {
  const trayIconPath = getIconPath();
  if (!fs.existsSync(trayIconPath)) return;

  tray = new Tray(trayIconPath);
  tray.setToolTip('Google Tasks Desktop');

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
  tray.on('double-click', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
}

function applyTaskbarBadge(count: number, dataUrl?: string) {
  lastBadge = { count, dataUrl };

  if (process.platform === 'darwin') {
    app.setBadgeCount(count);
  }

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
      applyTaskbarBadge(lastBadge.count, lastBadge.dataUrl);
    }
  });

  win.on('show', () => {
    if (lastBadge) {
      applyTaskbarBadge(lastBadge.count, lastBadge.dataUrl);
    }
  });

  // Keep app running in tray when user closes the window, like Microsoft To Do
  win.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win?.hide();
    }
  });

  // Open external links in user's default browser
  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
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
    title: 'test',
    body: 'Lembrete de tarefa com botões de contexto',
    taskId: 'test-task',
  });
});

// Windows Taskbar & System Overlay Badge IPC
ipcMain.handle('app:set-badge', async (_event, count: number, dataUrl?: string) => {
  applyTaskbarBadge(count, dataUrl);
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
    console.log('[Main] auth:google-login chamado com:', clientId);
    return await startOAuthLoopback(clientId, clientSecret);
  }
);

ipcMain.handle('auth:get-session', async () => {
  const tokens = loadAuthTokens();
  if (!tokens) {
    return { ok: false, error: 'Nenhuma sessão encontrada' };
  }

  // Check if access token is expired or close to expiring (within 2 minutes)
  if (Date.now() > tokens.expiresAt - 120000 && tokens.refreshToken) {
    const refreshed = await refreshAccessToken(tokens);
    if (refreshed) {
      return { ok: true, data: refreshed };
    }
  }

  return { ok: true, data: tokens };
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
  createWindow();
  createTray();

  const initialUrl = process.argv.find((arg) => arg.startsWith('googletasks://'));
  if (initialUrl && win) {
    win.webContents.once('did-finish-load', () => {
      handleProtocolUrl(initialUrl);
    });
  }
});
