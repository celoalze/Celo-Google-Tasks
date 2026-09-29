/**
 * Google OAuth Configuration
 * BYO-credentials: nenhum secret é embutido no bundle.
 * O Client ID vem de VITE_GOOGLE_CLIENT_ID (build) ou de Settings (localStorage).
 * O Client Secret é OPCIONAL mas na prática OBRIGATÓRIO para a maioria dos
 * Client IDs (inclusive tipo Desktop): o Google retorna
 * "client_secret is missing" na troca code→token se não for enviado.
 * Fluxo usa PKCE S256 + state + secret quando disponível.
 * Rotacione qualquer secret previously hardcoded no Google Cloud.
 */

const ENV_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || '';
const ENV_CLIENT_SECRET = (import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string | undefined)?.trim() || '';

export const DEFAULT_AUTH_CONFIG = {
  clientId: ENV_CLIENT_ID,
  clientSecret: ENV_CLIENT_SECRET || undefined,
} as const;

const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i;

export function isValidClientIdFormat(clientId: string): boolean {
  return CLIENT_ID_PATTERN.test(clientId.trim());
}

export function getActiveClientId(): string {
  const custom = localStorage.getItem('google_client_id');
  if (custom && custom.trim().length > 0) {
    return custom.trim();
  }
  return DEFAULT_AUTH_CONFIG.clientId;
}

export function getActiveClientSecret(): string | undefined {
  const custom = localStorage.getItem('google_client_secret');
  if (custom && custom.trim().length > 0) {
    return custom.trim();
  }
  // Fallback opcional via env (build). Nunca há fallback hardcoded.
  return DEFAULT_AUTH_CONFIG.clientSecret || undefined;
}
