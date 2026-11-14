# marcosantana.dev

Personal site of Marco Santana. A still page: the first screen sells the outcome (what you get, a link down to the work delivered and the résumé PDFs), then the journey of one request from the reader's side (you ask, you approve the plan, it is built and checked, you test, you say go, you get a report) and a one-line strip of the people behind it; then past work as a row of tiles, the résumé as proof, and contact. Nothing on it loops or plays: hover and focus states only.

Static files, no build step: `v1/` is the site root and is published as is.

| Path | Role |
|------|------|
| `v1/index.html` | the page, English (the markup carries the English text) |
| `v1/pt/index.html`, `v1/es/index.html` | Portuguese and Spanish entry pages, generated (never edit by hand) |
| `v1/assets/i18n.js`, `v1/assets/i18n/*.json` | the language loader and every visible string, résumé included |
| `v1/assets/theme.js` | light/dark toggle (follows the system unless the visitor picks one) |
| `v1/assets/site.css` | palette tokens and styles |
| `v1/assets/fonts/` | JetBrains Mono, woff2, SIL OFL 1.1 (licence alongside) |
| `v1/Marco_Santana_Resume.pdf`, `v1/Marco_Santana_Curriculo.pdf` | the résumé PDFs, built from `print/` |
| `print/` | the PDF sources and their generator (`npm run pdf`) |

## Languages

English (default), Brazilian Portuguese and Spanish. Every visible string lives in `v1/assets/i18n/<locale>.json` with the same keys; markup carries `data-i18n` keys. The locale comes from `?lang=`, then the entry page (`/pt/`, `/es/`), then the saved choice, then the browser languages, then English; the header switcher re-renders in place.

```
npm run i18n:check   # gate: fails if a key is missing or differs in kind
npm run i18n:pages   # rewrites v1/pt/ and v1/es/ from v1/index.html
```

Run `i18n:pages` after editing `v1/index.html` or a locale file, and commit its output.

## Palette

The site's own tokens: a warm paper page, ink text and one copper accent; in dark, a warm charcoal page with near-white text and a lighter copper. Every text pair passes WCAG AA; ratios are in the stylesheet's comments.

## Checks

```
npm install
npm test             # i18n check, html-validate on the three pages, Playwright
npm run serve        # v1/ on http://localhost:4173/, served the way the deploy publishes it
```

Playwright loads every language at 320, 375 and 1280 px, light and dark, and fails on any console error, any sideways scroll, a canvas or a running animation; it also checks that the PDFs and the journey are on the first screen (with the people strip at 1280 px), the six steps, the link to the work, the switchers, and both PDFs. It uses the installed Google Chrome; set `PW_BUNDLED=1` to use Playwright's own Chromium.

## Deploy

A push to a `release/**` branch runs `.github/workflows/deploy.yml`, which publishes `v1/` to the Cloudflare Pages project `marcosantana-dev` as its production deployment. There is no build step.
