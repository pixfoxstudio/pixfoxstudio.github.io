const OWNER = "pixfoxstudio";
const REPO = "pixfoxstudio.github.io";
const BRANCH = "main";
const RAW = "https://raw.githubusercontent.com/pixfoxstudio/pixfoxstudio.github.io/main/admin/";
const COOKIE = "pixfox_admin";
const STATE_COOKIE = "pixfox_oauth_state";
const SESSION_SECONDS = 8 * 60 * 60;
const SESSION_MAX_SECONDS = 7 * 24 * 60 * 60;

function baseHeaders(extra) {
  return Object.assign({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://pixfoxstudio.github.io data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
  }, extra || {});
}
function response(body, status, extra) {
  return new Response(body, { status: status || 200, headers: baseHeaders(extra) });
}
function json(data, status, extra) {
  return response(JSON.stringify(data), status || 200, Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  }, extra || {}));
}
function randomHex(bytes) {
  const value = crypto.getRandomValues(new Uint8Array(bytes || 32));
  return Array.from(value).map(x => x.toString(16).padStart(2, "0")).join("");
}
function parseCookies(request) {
  const out = {};
  (request.headers.get("Cookie") || "").split(";").forEach(part => {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}
function cookie(name, value, maxAge) {
  return name + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + maxAge;
}
function clearCookie(name) {
  return name + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(value) {
  const s = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s + "=".repeat((4 - s.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function cryptoKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function seal(payload, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await cryptoKey(secret),
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return b64url(iv) + "." + b64url(new Uint8Array(encrypted));
}
async function unseal(value, secret) {
  try {
    const parts = value.split(".");
    if (parts.length !== 2) return null;
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64url(parts[0]) },
      await cryptoKey(secret),
      fromB64url(parts[1])
    );
    const payload = JSON.parse(new TextDecoder().decode(decrypted));
    return payload.exp && payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}
async function saveSession(payload, env) {
  const value = await seal(payload, env.SESSION_SECRET);
  return cookie(COOKIE, value, Math.max(0, Math.floor((payload.exp - Date.now()) / 1000)));
}
async function getSession(request, env) {
  const value = parseCookies(request)[COOKIE];
  if (!value) return null;
  const session = await unseal(value, env.SESSION_SECRET);
  if (!session) return null;
  if (session.accessExpiresAt && session.accessExpiresAt < Date.now() + 90000) {
    if (!session.refreshToken) return null;
    const refreshed = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken
      })
    });
    const data = await refreshed.json().catch(() => ({}));
    if (!refreshed.ok || !data.access_token) return null;
    session.accessToken = data.access_token;
    session.refreshToken = data.refresh_token || session.refreshToken;
    session.accessExpiresAt = Date.now() + (Number(data.expires_in) || SESSION_SECONDS) * 1000;
    /* Keep the encrypted session alive while its refresh token remains valid. */
    session._setCookie = await saveSession(session, env);
  }
  return session;
}
async function github(path, token, options) {
  const result = await fetch("https://api.github.com" + path, Object.assign({}, options || {}, {
    headers: Object.assign({
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    }, (options && options.headers) || {})
  }));
  const data = await result.json().catch(() => ({}));
  if (!result.ok) {
    const error = new Error(data.message || ("GitHub API error " + result.status));
    error.status = result.status;
    throw error;
  }
  return data;
}
function withSessionCookie(result, session) {
  if (session && session._setCookie) result.headers.append("Set-Cookie", session._setCookie);
  return result;
}
function safeText(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max || 5000);
}
function cleanItems(collection, items) {
  if (!Array.isArray(items) || items.length > 100) throw new Error("Invalid content list.");
  const ids = new Set();
  return items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid item " + (index + 1) + ".");
    const id = safeText(item.id, 80);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw new Error("Each item needs a unique, simple ID.");
    ids.add(id);
    const title = safeText(item.title, 140);
    if (!title) throw new Error("Item " + (index + 1) + ": title is required.");
    const image = safeText(item.image, 500);
    if (image && !image.startsWith("https://") && !image.startsWith("/")) throw new Error("Images must use HTTPS or a site-relative path.");
    if (collection === "news") {
      return { id, title, date: safeText(item.date, 30), category: safeText(item.category, 50), image,
        excerpt: safeText(item.excerpt, 400), body: safeText(item.body, 12000) };
    }
    const storeUrl = safeText(item.storeUrl, 500);
    if (storeUrl && !storeUrl.startsWith("https://")) throw new Error("Store links must use HTTPS.");
    return { id, title, status: safeText(item.status, 40), platform: safeText(item.platform, 80),
      image, description: safeText(item.description, 1000), storeUrl };
  });
}
async function serveStatic(path) {
  const allowed = {
    "/": ["index.html", "text/html; charset=utf-8"],
    "/app.css": ["app.css", "text/css; charset=utf-8"],
    "/app.js": ["app.js", "text/javascript; charset=utf-8"]
  };
  const item = allowed[path];
  if (!item) return response("Not found", 404);
  const asset = await fetch(RAW + item[0], { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!asset.ok) return response("Admin UI is not published yet. Merge the PIXFOX Admin pull request first.", 503, { "Content-Type": "text/plain; charset=utf-8" });
  return response(await asset.text(), 200, { "Content-Type": item[1], "Cache-Control": "no-cache" });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET || !env.ADMIN_GITHUB_LOGIN) {
      return response("PIXFOX Admin is not configured. Add the required Worker variables and secrets.", 503, { "Content-Type": "text/plain; charset=utf-8" });
    }
    if (request.method === "GET" && ["/", "/app.css", "/app.js"].includes(path)) return serveStatic(path);

    if (request.method === "GET" && path === "/login") {
      const state = randomHex(24);
      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authorize.searchParams.set("redirect_uri", url.origin + "/callback");
      authorize.searchParams.set("scope", "public_repo");
      authorize.searchParams.set("state", state);
      return new Response(null, { status: 302, headers: baseHeaders({
        "Location": authorize.toString(), "Set-Cookie": cookie(STATE_COOKIE, state, 600), "Cache-Control": "no-store"
      }) });
    }

    if (request.method === "GET" && path === "/callback") {
      const queryState = url.searchParams.get("state");
      const cookieState = parseCookies(request)[STATE_COOKIE];
      const code = url.searchParams.get("code");
      if (!code || !queryState || !cookieState || queryState !== cookieState) {
        return response("OAuth state check failed. Please try signing in again.", 400, {
          "Content-Type": "text/plain; charset=utf-8", "Set-Cookie": clearCookie(STATE_COOKIE)
        });
      }
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: url.origin + "/callback" })
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.access_token) {
        return response("GitHub authorization failed. Check the OAuth app settings and try again.", 401, {
          "Content-Type": "text/plain; charset=utf-8", "Set-Cookie": clearCookie(STATE_COOKIE)
        });
      }
      const profile = await github("/user", tokenData.access_token);
      if (String(profile.login).toLowerCase() !== String(env.ADMIN_GITHUB_LOGIN).toLowerCase()) {
        return response("This GitHub account is not allowed to use PIXFOX Admin.", 403, {
          "Content-Type": "text/plain; charset=utf-8", "Set-Cookie": clearCookie(COOKIE)
        });
      }
      const repo = await github("/repos/" + OWNER + "/" + REPO, tokenData.access_token);
      if (!repo.permissions || repo.permissions.push !== true) {
        return response("This GitHub account does not have write access to the PIXFOX website repository.", 403, {
          "Content-Type": "text/plain; charset=utf-8", "Set-Cookie": [clearCookie(STATE_COOKIE), clearCookie(COOKIE)]
        });
      }
      const now = Date.now();
      const accessLifetime = Number(tokenData.expires_in) || SESSION_SECONDS;
      const session = {
        login: profile.login, accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token || "",
        accessExpiresAt: now + accessLifetime * 1000,
        exp: now + (tokenData.refresh_token ? SESSION_MAX_SECONDS : Math.min(accessLifetime, SESSION_SECONDS)) * 1000,
        csrf: randomHex(24)
      };
      const callbackHeaders = new Headers(baseHeaders({ "Location": "/", "Cache-Control": "no-store" }));
      callbackHeaders.append("Set-Cookie", await saveSession(session, env));
      callbackHeaders.append("Set-Cookie", clearCookie(STATE_COOKIE));
      return new Response(null, { status: 302, headers: callbackHeaders });
    }

    if (path.startsWith("/api/")) {
      if (request.method !== "GET" && request.headers.get("Origin") !== url.origin) return json({ error: "Cross-origin request blocked." }, 403);

      if (request.method === "POST" && path === "/api/logout") {
        const session = await getSession(request, env);
        if (!session) return json({ ok: true }, 200, { "Set-Cookie": clearCookie(COOKIE) });
        if (request.headers.get("X-CSRF-Token") !== session.csrf) return json({ error: "Invalid request token." }, 403);
        return json({ ok: true }, 200, { "Set-Cookie": clearCookie(COOKIE) });
      }

      const session = await getSession(request, env);
      if (!session) return json({ error: "Your session has expired. Sign in again." }, 401);

      if (request.method === "GET" && path === "/api/me") {
        return withSessionCookie(json({ login: session.login, csrf: session.csrf }), session);
      }

      if (request.method === "GET" && path === "/api/data") {
        const collection = url.searchParams.get("collection");
        if (!["news", "games"].includes(collection)) return json({ error: "Unknown collection." }, 400);
        try {
          const file = await github("/repos/" + OWNER + "/" + REPO + "/contents/data/" + collection + ".json?ref=" + BRANCH, session.accessToken);
          const decoded = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\n/g, "")), c => c.charCodeAt(0)));
          return withSessionCookie(json({ items: JSON.parse(decoded), sha: file.sha }), session);
        } catch (error) {
          if (error.status === 404) return withSessionCookie(json({ items: [], sha: null }), session);
          return withSessionCookie(json({ error: error.message }, error.status || 500), session);
        }
      }

      if (request.method === "POST" && path === "/api/save") {
        if (request.headers.get("X-CSRF-Token") !== session.csrf) return json({ error: "Invalid request token." }, 403);
        let body;
        try { body = await request.json(); } catch { return json({ error: "Invalid JSON." }, 400); }
        const collection = body.collection;
        if (!["news", "games"].includes(collection)) return json({ error: "Unknown collection." }, 400);
        let items;
        try { items = cleanItems(collection, body.items); } catch (error) { return json({ error: error.message }, 400); }
        try {
          const filePath = "data/" + collection + ".json";
          let sha;
          try {
            const current = await github("/repos/" + OWNER + "/" + REPO + "/contents/" + filePath + "?ref=" + BRANCH, session.accessToken);
            sha = current.sha;
          } catch (error) { if (error.status !== 404) throw error; }
          const bytes = new TextEncoder().encode(JSON.stringify(items, null, 2) + "\n");
          let binary = "";
          for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const payload = { message: "Update PIXFOX " + collection + " via admin", content: btoa(binary), branch: BRANCH };
          if (sha) payload.sha = sha;
          const saved = await github("/repos/" + OWNER + "/" + REPO + "/contents/" + filePath, session.accessToken, {
            method: "PUT", body: JSON.stringify(payload)
          });
          return withSessionCookie(json({ ok: true, commit: saved.commit.sha, items }), session);
        } catch (error) {
          return withSessionCookie(json({ error: error.message || "GitHub save failed." }, error.status || 500), session);
        }
      }
      return json({ error: "Not found." }, 404);
    }
    return response("Not found", 404);
  }
};