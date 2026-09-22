import { themeTokens } from '../theme/tokens';

/**
 * Generates a crisp, high-DPI circular badge image for the Windows Taskbar overlay icon.
 * Mirrors the aesthetic of Microsoft To Do / Windows 11 notification badges using centralized tokens.
 */
export function createTaskbarBadgeDataUrl(count: number): string {
  if (count <= 0) return '';

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 2;

  ctx.clearRect(0, 0, size, size);

  // Outer dark rim for contrast against taskbar and app icon
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = themeTokens.dark.surfaceDim;
  ctx.fill();

  // Vibrant light blue circular fill (M3 primary badge)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius - 3, 0, Math.PI * 2);
  ctx.fillStyle = themeTokens.dark.primary;
  ctx.fill();

  // Bold number centered
  const text = count > 99 ? '99+' : count.toString();
  const fontSize = text.length > 2 ? 22 : text.length === 2 ? 28 : 36;

  ctx.fillStyle = themeTokens.dark.onPrimary;
  ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Optical vertical centering adjustment
  const yOffset = text.length > 2 ? 1 : 2;
  ctx.fillText(text, centerX, centerY + yOffset);

  return canvas.toDataURL('image/png');
}
