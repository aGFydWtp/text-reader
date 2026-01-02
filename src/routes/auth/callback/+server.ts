import { redirect } from "@sveltejs/kit";
import { clearPkceCookies, setAuthCookies } from "$lib/server/auth/cookies";
import { exchangeCodeForTokens, requireQueryParam } from "$lib/server/auth/oidc";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies, url }) => {
  const code = requireQueryParam(url.searchParams.get("code"), "code");
  const state = requireQueryParam(url.searchParams.get("state"), "state");

  const cookieState = cookies.get("oidc_state");
  const verifier = cookies.get("pkce_verifier");

  if (!cookieState || !verifier || cookieState !== state) {
    throw redirect(302, "/login?error=state_mismatch");
  }

  const tokenResponse = await exchangeCodeForTokens({
    code,
    codeVerifier: verifier,
  });
  setAuthCookies(cookies, {
    idToken: tokenResponse.id_token,
    accessToken: tokenResponse.access_token,
  });

  clearPkceCookies(cookies);
  throw redirect(302, "/");
};
