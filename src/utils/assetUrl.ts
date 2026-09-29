/**
 * Resolve um asset de `public/` funcionando em dev (http) e no Electron
 * empacotado (file:// com base './').
 * Em dev BASE_URL='/' -> '/tasks/x.svg'; no build BASE_URL='./' -> './tasks/x.svg'.
 */
export function assetUrl(path: string): string {
  const clean = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || './';
  return `${base}${clean}`;
}
