# PIXFOX Admin — deployment guide

## Architecture
- Public website: GitHub Pages at https://pixfoxstudio.github.io/
- Content: data/news.json and data/games.json in this repository
- Admin interface, OAuth callback and API: one Cloudflare Worker origin (*.workers.dev)
- Login: GitHub OAuth, exact username allowlist, GitHub repository push-permission check, encrypted HttpOnly Secure SameSite cookie and CSRF token
- No VPS, database or always-on computer is required.

The Worker serves the UI files from this repository's main/admin directory. Merge this pull request before deploying the Worker.

## 1. Create the Cloudflare Worker
1. Sign in at https://dash.cloudflare.com/
2. Open Workers & Pages → Create → Create Worker.
3. Name it pixfox-admin (or another name) and deploy the starter Worker.
4. Open the Worker, choose Edit code, replace the starter code with the complete contents of admin/worker.js, then deploy.
5. Open the Worker's *.workers.dev URL and copy it. This will be the admin address.

## 2. Create the GitHub OAuth application
1. Open https://github.com/settings/developers
2. Open OAuth Apps → New OAuth App.
3. Application name: PIXFOX Admin.
4. Homepage URL: the exact Worker URL from step 1.
5. Authorization callback URL: the Worker URL followed by /callback.
   Example: https://pixfox-admin.example-account.workers.dev/callback
6. Register the application, copy the Client ID and generate a Client secret.

## 3. Add Worker variables and secrets
In Cloudflare: Workers & Pages → pixfox-admin → Settings → Variables and Secrets.

Add as plain-text variables:
- GITHUB_CLIENT_ID = OAuth app Client ID
- ADMIN_GITHUB_LOGIN = NillFrost
- GITHUB_REPO_OWNER = pixfoxstudio
- GITHUB_REPO_NAME = pixfoxstudio.github.io

Add as Secret values (not plain-text variables):
- GITHUB_CLIENT_SECRET = OAuth app Client secret
- SESSION_SECRET = new random value of at least 32 characters

Generate SESSION_SECRET locally:
- Linux/macOS: openssl rand -hex 32
- Windows PowerShell: [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

Never commit or send either secret in chat. Cloudflare hides Secret values after saving them. Click Deploy after adding all values.

## 4. Test
1. Open the Worker URL.
2. Click Continue with GitHub.
3. Authorize while signed into GitHub account NillFrost.
4. The Worker checks the exact username and verifies that the account has push access to this repository.
5. The workspace should show News and Games.

## Security notes
- Never share GITHUB_CLIENT_SECRET, SESSION_SECRET, OAuth tokens or browser cookies.
- The browser never receives the GitHub access token. It is stored in an encrypted HttpOnly Secure cookie.
- Sessions are time-limited. Sign out on shared devices.
- Only the allowlisted GitHub login can sign in, and it must also have repository push permission.
- The Worker only writes data/news.json and data/games.json on main.
- Images are currently entered as HTTPS URLs or paths to images already in the site repository. Direct image upload can be added later.

## Troubleshooting
- Configuration message: verify all variable/secret names exactly.
- OAuth callback error: callback URL must exactly match https://YOUR-WORKER-URL/callback.
- Not allowed: ADMIN_GITHUB_LOGIN must be the exact GitHub username, not display name.
- No write access: grant the GitHub account Write or higher access to pixfoxstudio/pixfoxstudio.github.io.
- Admin UI not published: merge this pull request first so the admin files exist on main.
