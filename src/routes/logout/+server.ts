import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import { buildLogoutUrl } from '$lib/server/auth/oidc';
import { clearAuthCookies } from '$lib/server/auth/cookies';

export const GET: RequestHandler = async ({ cookies }) => {
  clearAuthCookies(cookies);
  throw redirect(302, buildLogoutUrl());
};
