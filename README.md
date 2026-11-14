# marcosantana.dev

Personal site of Marco Santana. The first screen is one live stage of how the work runs, framed by business value: three lanes (Harness, Production, Speed) run at the same time and feed one Throughput counter, while the client's team keeps receiving releases and sending validations back. It is not a carousel and has no steps to page through: it simply never stops. Under it, past work as a row of tiles, then the résumé as proof, with the PDF downloads.

Static files, no build step: `v1/` is the site root and is published as is.

| Path | Role |
|------|------|
| `v1/index.html` | the page, English (the markup carries the English text) |
| `v1/pt/index.html`, `v1/es/index.html` | Portuguese and Spanish entry pages, generated (never edit by hand) |
| `v1/assets/scenes.js` | the stage as data: lanes, cards, links and a timed list of events that repeats without resetting. Edit the story here. |
| `v1/assets/loop.js` | stage engine: timeline, counters, session log, captions, keyboard proxies for lanes and cards; the flat HTML/SVG view on narrow stages, without WebGL and under reduced motion |
| `v1/assets/hero3d.js` | the stage in 3D (three.js) from 700 px up: the whole board at once, lit lane bands, curved links, lit packets, a slowly drifting camera that moves in on a selection |
| `v1/assets/i18n.js`, `v1/assets/i18n/*.json` | the language loader and every visible string, résumé included |
| `v1/assets/theme.js` | light/dark toggle (follows the system unless the visitor picks one) |
| `v1/assets/site.css` | palette tokens and styles; every colour of the stage, 3D included, comes from here |
| `v1/assets/vendor/` | three.js r169 (MIT), pinned, with its licence |
| `v1/assets/fonts/` | JetBrains Mono, woff2, SIL OFL 1.1 (licence alongside) |
| `v1/Marco_Santana_Resume.pdf`, `v1/Marco_Santana_Curriculo.pdf` | the résumé PDFs, built from `print/` |
| `print/` | the PDF sources and their generator (`npm run pdf`) |

The stage pauses when the tab is hidden or it is off screen, has a pause control, and under `prefers-reduced-motion` draws a still frame with captions still interactive.

## Languages

English (default), Brazilian Portuguese and Spanish. Every visible string lives in `v1/assets/i18n/<locale>.json` with the same keys; markup carries `data-i18n` keys and the stage data holds ids only. The locale comes from `?lang=`, then the entry page (`/pt/`, `/es/`), then the saved choice, then the browser languages, then English; the header switcher re-renders in place.

```
npm run i18n:check   # gate: fails if a key is missing or differs in kind
npm run i18n:pages   # rewrites v1/pt/ and v1/es/ from v1/index.html
```

Run `i18n:pages` after editing `v1/index.html` or a locale file, and commit its output.

## Palette

The site's own tokens: a warm paper page, ink text and one copper accent; in dark, a warm charcoal page with near-white text and a lighter copper. The stage runs on terminal surfaces drawn from the dark tokens in both themes, with one hue per lane, one for Throughput and the copper for the client's team, all above 7:1 on the stage panels. Every text pair passes WCAG AA; ratios are in the stylesheet's comments.

## Checks

```
npm install
npm test             # i18n check, html-validate on the three pages, Playwright
npm run serve        # v1/ on http://localhost:4173/, served the way the deploy publishes it
```

Playwright loads every language at 320, 375 and 1280 px, light and dark, motion on and reduced, and fails on any console error or sideways scroll; it also checks that there is no carousel or rail, that the whole stage fits the first screen at 1280 px, that the counter keeps climbing and the log keeps writing, and exercises the switchers, the captions and Esc, the flat view without WebGL, and both PDFs. It uses the installed Google Chrome; set `PW_BUNDLED=1` to use Playwright's own Chromium.

## Deploy

A push to a `release/**` branch runs `.github/workflows/deploy.yml`, which publishes `v1/` to the Cloudflare Pages project `marcosantana-dev` as its production deployment. There is no build step.
