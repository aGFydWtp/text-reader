import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

const publicPaths = new Set(['/login', '/login/start', '/auth/callback', '/logout']);

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!publicPaths.has(url.pathname) && !locals.user) {
    throw redirect(302, '/login');
  }

  return {
    user: locals.user ?? null,
  };
};
