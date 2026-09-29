import http from 'node:http';
import { shell, safeStorage, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  clientId: string;
  clientSecret?: string;
}

const TOKEN_FILE = path.join(app.getPath('userData'), 'google-auth-tokens.enc');

const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function generateCodeVerifier(): string {
  return base64UrlEncode(crypto.randomBytes(64));
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

function generateState(): string {
  return base64UrlEncode(crypto.randomBytes(32));
}

function closeServer(server: http.Server | null): void {
  try {
    if (!server) return;
    server.close();
    const withCloseAll = server as http.Server & { closeAllConnections?: () => void };
    if (typeof withCloseAll.closeAllConnections === 'function') {
      withCloseAll.closeAllConnections();
    }
  } catch {
    // ignore
  }
}

/**
 * Persists tokens securely using Electron's safeStorage (DPAPI on Windows).
 * Falha explicitamente se criptografia indisponível — nunca grava base64 reversível.
 */
export function saveAuthTokens(tokens: AuthTokens): void {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[Auth] safeStorage indisponível — tokens NÃO foram persistidos em disco.');
      return;
    }
    const raw = JSON.stringify(tokens);
    const encrypted = safeStorage.encryptString(raw);
    fs.writeFileSync(TOKEN_FILE, encrypted);
  } catch (err) {
    console.error('Falha ao salvar tokens:', err);
  }
}

/**
 * Loads stored authentication tokens
 */
export function loadAuthTokens(): AuthTokens | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const fileData = fs.readFileSync(TOKEN_FILE);

    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[Auth] safeStorage indisponível — sessão criptografada não pode ser lida.');
      return null;
    }
    const raw = safeStorage.decryptString(fileData);
    return JSON.parse(raw) as AuthTokens;
  } catch (err) {
    console.error('Falha ao carregar tokens salvos:', err);
    return null;
  }
}

/**
 * Clears saved tokens on logout
 */
export function clearAuthTokens(): void {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
    }
  } catch (err) {
    console.error('Falha ao remover tokens:', err);
  }
}

/** Remove arquivo legado em base64 (migração de versões antigas). */
export function migrateLegacyTokenFile(): void {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return;
    if (safeStorage.isEncryptionAvailable()) return;
    // Mantém arquivo existente para não derrubar sessão, mas alerta.
    console.warn('[Auth] Arquivo de token legado detectado. Reautentique para migrar para safeStorage.');
  } catch {
    // ignore
  }
}

/**
 * Refreshes an expired access token using the refresh_token
 */
export async function refreshAccessToken(tokens: AuthTokens): Promise<AuthTokens | null> {
  if (!tokens.refreshToken) return null;

  try {
    const bodyParams = new URLSearchParams({
      client_id: tokens.clientId,
      refresh_token: tokens.refreshToken,
      grant_type: 'refresh_token',
    });

    if (tokens.clientSecret) {
      bodyParams.append('client_secret', tokens.clientSecret);
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
    });

    if (!res.ok) {
      console.error('Falha ao atualizar token do Google:', await res.text());
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in?: number };
    const updated: AuthTokens = {
      ...tokens,
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    };

    saveAuthTokens(updated);
    return updated;
  } catch (err) {
    console.error('Erro na requisição de refresh token:', err);
    return null;
  }
}

/**
 * Initiates Google OAuth 2.0 Loopback flow with PKCE (RFC 8252) on 127.0.0.1 com porta efêmera.
 */
export function startOAuthLoopback(
  clientId: string,
  clientSecret?: string
): Promise<{ ok: boolean; data?: AuthTokens; error?: string }> {
  return new Promise((resolve) => {
    const trimmedId = (clientId || '').trim();
    if (!CLIENT_ID_PATTERN.test(trimmedId)) {
      resolve({ ok: false, error: 'Client ID inválido. Verifique em Configurações.' });
      return;
    }

    let server: http.Server | null = null;
    let settled = false;
    const finish = (result: { ok: boolean; data?: AuthTokens; error?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      closeServer(server);
      resolve(result);
    };

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    const timeout = setTimeout(() => {
      finish({ ok: false, error: 'Tempo limite esgotado para login com o Google.' });
    }, 180000); // 3 minutes timeout

    server = http.createServer(async (req, res) => {
      const host = '127.0.0.1';
      const reqUrl = new URL(req.url || '', `http://${host}`);

      if (reqUrl.searchParams.has('code') || reqUrl.searchParams.has('error')) {
        const code = reqUrl.searchParams.get('code');
        const returnedState = reqUrl.searchParams.get('state');
        const authError = reqUrl.searchParams.get('error');

        if (returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body style="font-family:sans-serif;background:#111318;color:#ffb4ab;text-align:center;padding:50px;"><h2>Estado inválido (CSRF)</h2><p>Feche e tente novamente.</p></body></html>');
          finish({ ok: false, error: 'Estado OAuth inválido.' });
          return;
        }

        if (authError || !code) {
          const safeError = escapeHtml(authError || 'Nenhum código de autorização recebido.');
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; background: #111318; color: #ffb4ab; text-align: center; padding: 50px;">
                <h2>Falha na autenticação</h2>
                <p>${safeError}</p>
                <p>Você pode fechar esta aba e tentar novamente no aplicativo.</p>
              </body>
            </html>
          `);
          finish({ ok: false, error: authError || 'Autorização negada pelo usuário.' });
          return;
        }

        // Exchange code for tokens (PKCE + secret quando disponível)
        try {
          const redirectUri = `http://127.0.0.1:${(server?.address() as { port: number } | null)?.port ?? 0}`;
          const trimmedSecret = (clientSecret || '').trim() || undefined;
          const bodyParams = new URLSearchParams({
            code,
            client_id: trimmedId,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier,
          });

          if (trimmedSecret) {
            bodyParams.append('client_secret', trimmedSecret);
          }

          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams.toString(),
          });

          if (!tokenRes.ok) {
            const rawErr = await tokenRes.text();
            const errText = escapeHtml(rawErr);
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; background: #111318; color: #ffb4ab; text-align: center; padding: 50px;">
                  <h2>Erro ao trocar código por token</h2>
                  <p>${errText}</p>
                </body>
              </html>
            `);
            const friendly = /client_secret/i.test(rawErr)
              ? 'Este Client ID exige client_secret. Preencha em Configurações > Google (chaves cloud) e tente de novo.'
              : `Erro na troca de token: ${rawErr.slice(0, 300)}`;
            finish({ ok: false, error: friendly });
            return;
          }

          const tokenData = (await tokenRes.json()) as {
            access_token: string;
            refresh_token?: string;
            expires_in?: number;
          };

          const tokens: AuthTokens = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
            clientId: trimmedId,
            clientSecret: (clientSecret || '').trim() || undefined,
          };

          saveAuthTokens(tokens);

          // Success HTML page (sem CDN externo para evitar exfiltração)
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <head><title>Autenticado com sucesso</title></head>
              <body style="font-family: system-ui, sans-serif; background: #111318; color: #e2e2e9; text-align: center; padding-top: 60px;">
                <div style="max-width: 420px; margin: 0 auto; background: #1d2024; padding: 32px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08);">
                  <div style="font-size: 40px; margin-bottom: 12px; color: #a8c7fa;">✓</div>
                  <h2 style="margin: 0 0 8px 0; color: #ffffff;">Conectado ao Google Tasks!</h2>
                  <p style="color: #c4c6d0; font-size: 14px; line-height: 1.5;">A autenticação foi concluída com sucesso. Você já pode fechar esta aba do navegador e voltar para o aplicativo desktop.</p>
                </div>
              </body>
            </html>
          `);

          finish({ ok: true, data: tokens });
        } catch (exchangeErr: unknown) {
          const msg = exchangeErr instanceof Error ? exchangeErr.message : 'Erro na requisição';
          finish({ ok: false, error: msg });
        }
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server?.address() as { port: number } | null;
      const port = address?.port ?? 0;
      const redirectUri = `http://127.0.0.1:${port}`;
      // Build authorization URL with PKCE + state
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', trimmedId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', SCOPES);
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      authUrl.searchParams.append('state', state);

      // Open in default browser
      void shell.openExternal(authUrl.toString());
    });

    server.on('error', (err) => {
      finish({ ok: false, error: `Erro no servidor local OAuth: ${err.message}` });
    });
  });
}
