import { redirect } from "@sveltejs/kit";
import { clearAuthCookies } from "$lib/server/auth/cookies";
import { buildLogoutUrl } from "$lib/server/auth/oidc";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies }) => {
  clearAuthCookies(cookies);
  throw redirect(302, buildLogoutUrl());
};
