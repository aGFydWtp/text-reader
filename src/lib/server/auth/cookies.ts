import type { Cookies } from "@sveltejs/kit";
import { dev } from "$app/environment";

const baseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: !dev,
  path: "/",
};

export function setPkceCookies(
  cookies: Cookies,
  payload: { verifier: string; state: string },
  maxAgeSeconds = 10 * 60,
) {
  cookies.set("pkce_verifier", payload.verifier, {
    ...baseOptions,
    maxAge: maxAgeSeconds,
  });
  cookies.set("oidc_state", payload.state, {
    ...baseOptions,
    maxAge: maxAgeSeconds,
  });
}

export function clearPkceCookies(cookies: Cookies) {
  cookies.delete("pkce_verifier", { path: "/" });
  cookies.delete("oidc_state", { path: "/" });
}

export function setAuthCookies(
  cookies: Cookies,
  payload: { idToken: string; accessToken: string },
  maxAgeSeconds = 60 * 60,
) {
  cookies.set("id_token", payload.idToken, {
    ...baseOptions,
    maxAge: maxAgeSeconds,
  });
  cookies.set("access_token", payload.accessToken, {
    ...baseOptions,
    maxAge: maxAgeSeconds,
  });
}

export function clearAuthCookies(cookies: Cookies) {
  cookies.delete("id_token", { path: "/" });
  cookies.delete("access_token", { path: "/" });
}
