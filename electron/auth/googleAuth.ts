import http from 'node:http';
import { shell, safeStorage, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  clientId: string;
  clientSecret?: string;
}

const TOKEN_FILE = path.join(app.getPath('userData'), 'google-auth-tokens.enc');
const OAUTH_PORT = 4321;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}`;

const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

/**
 * Persists tokens securely using Electron's safeStorage (DPAPI on Windows)
 */
export function saveAuthTokens(tokens: AuthTokens): void {
  try {
    const raw = JSON.stringify(tokens);
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(raw);
      fs.writeFileSync(TOKEN_FILE, encrypted);
    } else {
      fs.writeFileSync(TOKEN_FILE, Buffer.from(raw).toString('base64'), 'utf-8');
    }
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

    let raw: string;
    if (safeStorage.isEncryptionAvailable()) {
      raw = safeStorage.decryptString(fileData);
    } else {
      raw = Buffer.from(fileData.toString('utf-8'), 'base64').toString('utf-8');
    }

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

    const data = await res.json();
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
 * Initiates the Google OAuth 2.0 Loopback flow on localhost:4321
 */
export function startOAuthLoopback(
  clientId: string,
  clientSecret?: string
): Promise<{ ok: boolean; data?: AuthTokens; error?: string }> {
  return new Promise((resolve) => {
    let server: http.Server | null = null;

    const timeout = setTimeout(() => {
      if (server) {
        server.close();
      }
      resolve({ ok: false, error: 'Tempo limite esgotado para login com o Google.' });
    }, 180000); // 3 minutes timeout

    server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url || '', `http://localhost:${OAUTH_PORT}`);

      if (reqUrl.searchParams.has('code') || reqUrl.searchParams.has('error')) {
        const code = reqUrl.searchParams.get('code');
        const authError = reqUrl.searchParams.get('error');

        if (authError || !code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; background: #111318; color: #ffb4ab; text-align: center; padding: 50px;">
                <h2>Falha na autenticação</h2>
                <p>${authError || 'Nenhum código de autorização recebido.'}</p>
                <p>Você pode fechar esta aba e tentar novamente no aplicativo.</p>
              </body>
            </html>
          `);
          clearTimeout(timeout);
          server?.close();
          resolve({ ok: false, error: authError || 'Autorização negada pelo usuário.' });
          return;
        }

        // Exchange code for tokens
        try {
          const bodyParams = new URLSearchParams({
            code,
            client_id: clientId,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          });

          if (clientSecret) {
            bodyParams.append('client_secret', clientSecret);
          }

          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams.toString(),
          });

          if (!tokenRes.ok) {
            const errText = await tokenRes.text();
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: sans-serif; background: #111318; color: #ffb4ab; text-align: center; padding: 50px;">
                  <h2>Erro ao trocar código por token</h2>
                  <p>${errText}</p>
                </body>
              </html>
            `);
            clearTimeout(timeout);
            server?.close();
            resolve({ ok: false, error: `Erro na troca de token: ${errText}` });
            return;
          }

          const tokenData = await tokenRes.json();

          const tokens: AuthTokens = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
            clientId,
            clientSecret,
          };

          saveAuthTokens(tokens);

          // Success HTML page
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
              <head>
                <title>Autenticado com sucesso</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
                <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
              </head>
              <body style="font-family: 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111318; color: #e2e2e9; text-align: center; padding-top: 60px;">
                <div style="max-width: 420px; margin: 0 auto; background: #1d2024; padding: 32px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08);">
                  <div style="font-size: 40px; margin-bottom: 12px; color: #a8c7fa;">✓</div>
                  <h2 style="margin: 0 0 8px 0; color: #ffffff;">Conectado ao Google Tasks!</h2>
                  <p style="color: #c4c6d0; font-size: 14px; line-height: 1.5;">A autenticação foi concluída com sucesso. Você já pode fechar esta aba do navegador e voltar para o aplicativo desktop.</p>
                </div>
              </body>
            </html>
          `);

          clearTimeout(timeout);
          server?.close();
          resolve({ ok: true, data: tokens });
        } catch (exchangeErr: unknown) {
          const msg = exchangeErr instanceof Error ? exchangeErr.message : 'Erro na requisição';
          clearTimeout(timeout);
          server?.close();
          resolve({ ok: false, error: msg });
        }
      }
    });

    server.listen(OAUTH_PORT, () => {
      // Build authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', SCOPES);
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');

      console.log('[OAuth] Servidor local ouvindo na porta', OAUTH_PORT);
      console.log('[OAuth] Abrindo URL no navegador:', authUrl.toString());

      // Open in default browser
      shell.openExternal(authUrl.toString());
    });

    server.on('error', (err) => {
      console.error('[OAuth] Erro no servidor local:', err);
      clearTimeout(timeout);
      resolve({ ok: false, error: `Erro no servidor local OAuth: ${err.message}` });
    });
  });
}
