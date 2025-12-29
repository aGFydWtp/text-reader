import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { buildAuthorizeUrl } from '$lib/server/auth/oidc';
import { generateCodeChallenge, generateCodeVerifier, generateState } from '$lib/server/auth/pkce';
import { setPkceCookies } from '$lib/server/auth/cookies';

export const GET: RequestHandler = async ({ cookies }) => {
  const verifier = generateCodeVerifier();
  const state = generateState();
  const challenge = generateCodeChallenge(verifier);

  setPkceCookies(cookies, { verifier, state });

  throw redirect(302, buildAuthorizeUrl({ state, codeChallenge: challenge }));
};
