import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';

type TokenResponse = {
  id_token: string;
  access_token: string;
  expires_in?: number;
  token_type?: string;
};

export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const { COGNITO_CLIENT_ID, COGNITO_DOMAIN } = privateEnv;
  const { PUBLIC_APP_ORIGIN } = publicEnv;

  const authorizeUrl = new URL('/oauth2/authorize', COGNITO_DOMAIN);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', COGNITO_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', `${PUBLIC_APP_ORIGIN}/auth/callback`);
  authorizeUrl.searchParams.set('scope', 'openid email profile');
  authorizeUrl.searchParams.set('identity_provider', 'Google');
  authorizeUrl.searchParams.set('code_challenge', params.codeChallenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('state', params.state);
  return authorizeUrl.toString();
}

export async function exchangeCodeForTokens(payload: {
  code: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const { COGNITO_CLIENT_ID, COGNITO_DOMAIN } = privateEnv;
  const { PUBLIC_APP_ORIGIN } = publicEnv;

  const tokenUrl = new URL('/oauth2/token', COGNITO_DOMAIN);
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('client_id', COGNITO_CLIENT_ID);
  body.set('code', payload.code);
  body.set('redirect_uri', `${PUBLIC_APP_ORIGIN}/auth/callback`);
  body.set('code_verifier', payload.codeVerifier);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  return (await response.json()) as TokenResponse;
}

type JwtPayload = {
  sub: string;
  email?: string;
  exp?: number;
  iss?: string;
};

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf-8');
}

export function parseIdToken(idToken: string): JwtPayload | null {
  const { COGNITO_ISSUER } = privateEnv;
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
    if (payload.iss && payload.iss !== COGNITO_ISSUER) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildLogoutUrl(): string {
  const { COGNITO_CLIENT_ID, COGNITO_DOMAIN } = privateEnv;
  const { PUBLIC_APP_ORIGIN } = publicEnv;

  const logoutUrl = new URL('/logout', COGNITO_DOMAIN);
  logoutUrl.searchParams.set('client_id', COGNITO_CLIENT_ID);
  logoutUrl.searchParams.set('logout_uri', `${PUBLIC_APP_ORIGIN}/`);
  return logoutUrl.toString();
}

export function requireQueryParam(value: string | null, name: string): string {
  if (!value) {
    throw redirect(302, `/login?error=${encodeURIComponent(`${name}_missing`)}`);
  }
  return value;
}
