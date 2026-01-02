import type { Handle } from "@sveltejs/kit";
import { parseIdToken } from "$lib/server/auth/oidc";

export const handle: Handle = async ({ event, resolve }) => {
  const idToken = event.cookies.get("id_token");
  if (idToken) {
    const payload = parseIdToken(idToken);
    if (payload?.sub) {
      event.locals.user = {
        sub: payload.sub,
        email: payload.email,
      };
    }
  }

  return resolve(event);
};
