import { themeTokens } from '../theme/tokens';

export interface BadgePalette {
  rim: string;
  fill: string;
  onFill: string;
}

const DEFAULT_TASKBAR_PALETTE: BadgePalette = {
  rim: themeTokens.dark.surfaceDim,
  fill: themeTokens.dark.primary,
  onFill: themeTokens.dark.onPrimary,
};

const DEFAULT_TRAY_COLORS = {
  base: '#1a73e8',
  check: '#ffffff',
  rim: '#1e1f20',
  badge: '#d93025',
  onBadge: '#ffffff',
};

const taskbarCache = new Map<string, string>();
const trayCache = new Map<string, string>();

function getCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  try {
    let canvas: HTMLCanvasElement;
    if (typeof OffscreenCanvas !== 'undefined') {
      const off = new OffscreenCanvas(size, size);
      const ctx = off.getContext('2d') as unknown as CanvasRenderingContext2D | null;
      if (!ctx) return null;
      // Converte Offscreen para HTMLCanvas via document para toDataURL compatível
      canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const htmlCtx = canvas.getContext('2d');
      if (!htmlCtx) return null;
      void off;
      void ctx;
      return { canvas, ctx: htmlCtx };
    }
    canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const htmlCtx = canvas.getContext('2d');
    if (!htmlCtx) return null;
    return { canvas, ctx: htmlCtx };
  } catch {
    return null;
  }
}

/**
 * Generates a crisp, high-DPI circular badge image for the Windows Taskbar overlay icon.
 * Mirrors the aesthetic of Microsoft To Do / Windows 11 notification badges using centralized tokens.
 * Memoizado por (count, palette) para evitar GC pressure a cada 15s.
 */
export function createTaskbarBadgeDataUrl(count: number, palette: BadgePalette = DEFAULT_TASKBAR_PALETTE): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  const safeCount = Math.min(999, Math.floor(count));
  const key = `${safeCount}|${palette.rim}|${palette.fill}|${palette.onFill}`;
  const cached = taskbarCache.get(key);
  if (cached) return cached;

  const size = 64;
  const surface = getCanvas(size);
  if (!surface) return '';
  const { canvas, ctx } = surface;

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 2;

  ctx.clearRect(0, 0, size, size);

  // Outer dark rim for contrast against taskbar and app icon
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = palette.rim;
  ctx.fill();

  // Vibrant light blue circular fill (M3 primary badge)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2);
  ctx.fillStyle = palette.fill;
  ctx.fill();

  // Bold number centered
  const text = safeCount > 99 ? '99+' : String(safeCount);
  const fontSize = text.length > 2 ? 22 : text.length === 2 ? 28 : 36;

  ctx.fillStyle = palette.onFill;
  ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Optical vertical centering adjustment
  const yOffset = text.length > 2 ? 1 : 2;
  ctx.fillText(text, centerX, centerY + yOffset);

  const url = canvas.toDataURL('image/png');
  if (taskbarCache.size > 50) taskbarCache.clear();
  taskbarCache.set(key, url);
  return url;
}

/**
 * Generates a 32x32 composite System Tray icon showing the Google Tasks checkmark
 * with an optional high-contrast pending notification badge in the top-right corner.
 * Memoizado por count.
 */
export function createTrayBadgeIconDataUrl(count: number): string {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.min(999, Math.floor(count))) : 0;
  const key = String(safeCount);
  const cached = trayCache.get(key);
  if (cached) return cached;

  const size = 32;
  const surface = getCanvas(size);
  if (!surface) return '';
  const { canvas, ctx } = surface;

  ctx.clearRect(0, 0, size, size);

  // 1. Draw base Google Tasks icon (blue disc with white checkmark)
  const baseCx = safeCount > 0 ? 13 : 16;
  const baseCy = safeCount > 0 ? 18 : 16;
  const baseRadius = safeCount > 0 ? 12 : 14;

  ctx.beginPath();
  ctx.arc(baseCx, baseCy, baseRadius, 0, Math.PI * 2);
  ctx.fillStyle = DEFAULT_TRAY_COLORS.base;
  ctx.fill();

  // Draw white checkmark inside base disc
  ctx.beginPath();
  ctx.strokeStyle = DEFAULT_TRAY_COLORS.check;
  ctx.lineWidth = safeCount > 0 ? 2.5 : 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.moveTo(baseCx - baseRadius * 0.45, baseCy + baseRadius * 0.05);
  ctx.lineTo(baseCx - baseRadius * 0.1, baseCy + baseRadius * 0.45);
  ctx.lineTo(baseCx + baseRadius * 0.5, baseCy - baseRadius * 0.35);
  ctx.stroke();

  // 2. If count > 0, draw badge in the top-right corner
  if (safeCount > 0) {
    const badgeCx = 23;
    const badgeCy = 9;
    const badgeRadius = 7.5;

    // Dark border for contrast
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, badgeRadius + 1, 0, Math.PI * 2);
    ctx.fillStyle = DEFAULT_TRAY_COLORS.rim;
    ctx.fill();

    // Vibrant notification badge fill
    ctx.beginPath();
    ctx.arc(badgeCx, badgeCy, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = DEFAULT_TRAY_COLORS.badge;
    ctx.fill();

    // Text
    const text = safeCount > 99 ? '99+' : String(safeCount);
    const fontSize = text.length > 2 ? 8 : text.length === 2 ? 9 : 10;
    ctx.fillStyle = DEFAULT_TRAY_COLORS.onBadge;
    ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, badgeCx, badgeCy + 0.5);
  }

  const url = canvas.toDataURL('image/png');
  if (trayCache.size > 50) trayCache.clear();
  trayCache.set(key, url);
  return url;
}
