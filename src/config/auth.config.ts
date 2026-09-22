/**
 * Google OAuth Configuration
 */

export const DEFAULT_AUTH_CONFIG = {
  clientId:
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
    '387338481589-8vp6f1c52n10nua5hlrkh8dbdikqsn9c.apps.googleusercontent.com',
  clientSecret:
    (import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string) ||
    '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',
};

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
  return DEFAULT_AUTH_CONFIG.clientSecret || undefined;
}
