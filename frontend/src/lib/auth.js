// frontend/src/lib/auth.js
export function parseJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch (e) {
    return null;
  }
}

export function isTokenExpired(token) {
  const p = parseJwt(token);
  if (!p) return true;
  const exp = typeof p.exp === "number" ? p.exp : parseInt(p.exp, 10);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= exp;
}

/**
 * authFetch performs:
 *  - attach Authorization header if access_token present
 *  - include credentials by default (so httpOnly refresh cookie is sent)
 *  - on 401, attempt one POST /api/auth/refresh (credentials: include)
 *    and if refresh succeeds, retry original request once with new token.
 */
export async function authFetch(input, init = {}, { retry = true } = {}) {
  init = Object.assign({}, init);
  init.headers = init.headers || {};

  const token = localStorage.getItem("access_token");
  if (token) {
    init.headers["Authorization"] = `Bearer ${token}`;
  }

  // include credentials by default so cookies (refresh token) are sent
  if (!init.credentials) init.credentials = "include";

  let res = await fetch(input, init);

  // If 401 and retry allowed, attempt to refresh and retry once
  if (res.status === 401 && retry) {
    try {
      const refreshRes = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      if (refreshRes.ok) {
        const j = await refreshRes.json();
        if (j && j.access_token) {
          localStorage.setItem("access_token", j.access_token);
          // update header & retry original request once
          init.headers["Authorization"] = `Bearer ${j.access_token}`;
          res = await fetch(input, Object.assign({}, init));
        } else {
          // refresh didn't return token -> treated as failure
        }
      } else {
        // refresh failed; ensure we clear any stale token
        localStorage.removeItem("access_token");
      }
    } catch (err) {
      // network error during refresh; swallow and return original 401
      console.warn("Refresh failed:", err);
    }
  }

  return res;
}
