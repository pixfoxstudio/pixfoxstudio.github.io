# PIXFOX - Studio

The official website of **PIXFOX - Studio**, an independent game development studio operated by **PIXFOX STUDIO LTD**, registered in England and Wales (company number **17381272**).

## Website

After transferring the repository to the PIXFOX organization, the site will be available at:

**https://pixfoxstudio.github.io/**

The site is a fast, responsive static website built with HTML, CSS and a small amount of vanilla JavaScript. No build step or backend is required.

## Create the studio organization and publish the site

1. Open https://github.com/account/organizations/new and create a **free** organization with the username `pixfoxstudio` (if available). You can use `PIXFOX - Studio` as the organization's display name.
2. Open the source repository: https://github.com/NillFrost/pixfoxstudio.
3. Go to **Settings → General → Danger Zone → Transfer**.
4. Choose **Select one of my organizations** and select **pixfoxstudio**.
5. In **Repository name**, enter `pixfoxstudio.github.io`. Transfer and rename together.
6. Open the moved repository at `https://github.com/pixfoxstudio/pixfoxstudio.github.io`.
7. Go to **Settings → Pages**; select **Deploy from a branch**, branch **main**, folder **/(root)**; click **Save**.
8. After deployment, open `https://pixfoxstudio.github.io/`. GitHub Pages publication is not verified until this address actually loads.

**Important:** If `pixfoxstudio` is already taken, a different organization username produces a different `*.github.io` domain. Do not expect `pixfoxstudio.github.io` from an organization with a different username.

## Google Play Console website verification

Google Play requires organizations to verify website ownership. Use **Google Search Console** and choose an **URL-prefix property** for:

`https://pixfoxstudio.github.io/`

Choose **HTML file upload** in Search Console, then put the exact file supplied by Google in the root of this repository (next to `index.html`). After GitHub Pages deploys the file, confirm that its URL works and click **Verify** in Search Console. The account used to verify your website should be the same as your Play Console account if possible. Complete the association request in Play Console.

**Do not invent or change Google's verification filename, token or content.** You must obtain it directly from Search Console.

A custom domain you own (e.g. `pixfoxstudio.com`) is preferable in the long term because you control the domain, while GitHub Pages uses a shared hostname.

## Files

- `index.html` — home page, metadata and organization details
- `styles.css` — branding, animations and responsive layout
- `script.js` — scroll reveal and navigation behavior
- `privacy.html` — website privacy policy (not a policy for game apps)
- `assets/fox-mark.svg` — studio mark / favicon
- `assets/og-cover.svg` — sharing cover
- `sitemap.xml` and `robots.txt` — search engine discovery

## Contact

- Email: [pixfoxstudioofficial@gmail.com](mailto:pixfoxstudioofficial@gmail.com)
- Phone: [+7 927 484 04 06](tel:+79274840406)

## Legal details

**PIXFOX STUDIO LTD** — England and Wales company no. 17381272.

Registered office: Office 20218, 182–184 High Street North, East Ham, London, E6 2JA, United Kingdom.

Company register: https://find-and-update.company-information.service.gov.uk/company/17381272

## Editing

Edit the HTML, CSS and JavaScript files directly. The site intentionally contains no fictional game launches or made-up awards. When your real projects are ready to announce, replace the "coming soon" section with genuine game artwork, descriptions and store links.

Before launching games, create a separate app-specific privacy policy describing the actual data practices and SDKs used by each app, if applicable.
