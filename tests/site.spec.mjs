// The page in every language, width and theme: it loads without console
// errors, never scrolls sideways, stays still (nothing animates, no canvas),
// leads with the résumé PDFs and the squad, and keeps the résumé and the
// switchers working.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const dict = (loc) => JSON.parse(readFileSync(new URL(`../v1/assets/i18n/${loc}.json`, import.meta.url), 'utf8'));
const LOCALES = [
  { path: '/', loc: 'en', d: dict('en') },
  { path: '/pt/', loc: 'pt-BR', d: dict('pt-BR') },
  { path: '/es/', loc: 'es', d: dict('es') }
];
const WIDTHS = [320, 375, 1280];
const SCHEMES = ['light', 'dark'];

/* collect console errors and uncaught exceptions for the whole test */
function watch(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  return errors;
}

async function noSideScroll(page) {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth
  }));
  expect(sw, 'page must not scroll sideways').toBeLessThanOrEqual(cw);
}

for (const { path, loc, d } of LOCALES) {
  for (const width of WIDTHS) {
    for (const colorScheme of SCHEMES) {
      test(`${loc} ${width}px ${colorScheme}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width, height: width < 600 ? 740 : 800 }, colorScheme
        });
        const page = await context.newPage();
        const errors = watch(page);
        await page.goto(path, { waitUntil: 'networkidle' });

        await expect(page.locator('html')).toHaveAttribute('lang', loc);
        await expect(page.locator('h1')).toHaveText(d.home.h1);
        // the résumé PDFs are the first call to action, inside the first screen
        const pdf = page.locator('.hero-actions a.btn').first();
        await expect(pdf).toBeInViewport();

        // a still page: no canvas, nothing animating
        await expect(page.locator('canvas')).toHaveCount(0);
        expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

        // the squad sits in the hero, where the scene was: four seats, then the seven steps of one request
        await expect(page.locator('#how .seats > li')).toHaveCount(4);
        await expect(page.locator('#how .cycle')).toBeVisible();
        if (width >= 1040) {
          // wide screens: title, PDFs and all four seats on the first screen, without scrolling
          const seatsBottom = await page.locator('.seats').evaluate((el) => el.getBoundingClientRect().bottom);
          expect(seatsBottom, 'the four seats fit the first screen').toBeLessThanOrEqual(800);
        } else {
          // phones: the first seat starts on the first screen
          await expect(page.locator('.seat').first()).toBeInViewport();
        }
        await expect(page.locator('.seat-title').first()).toHaveText(d.how.seat.lead.title);
        await expect(page.locator('.cycle > li')).toHaveCount(7);
        await expect(page.locator('.cycle .cycle-step').last()).toHaveText(d.how.cycle.live);

        await noSideScroll(page);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(200);
        await noSideScroll(page);

        await expect(page.locator('.work-tile')).toHaveCount(9);
        await expect(page.locator('#experience .job')).toHaveCount(16);
        await expect(page.locator('#resume h2')).toHaveText(d.resume.h2);

        expect(errors, errors.join('\n')).toEqual([]);
        await context.close();
      });
    }
  }
}

test('entry pages carry hreflang alternates and their own canonical URL', async ({ page }) => {
  for (const { path } of LOCALES) {
    await page.goto(path);
    const alts = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((ls) => ls.map((l) => `${l.hreflang} ${l.href}`));
    expect(alts).toEqual([
      'en https://marcosantana.dev/',
      'pt-BR https://marcosantana.dev/pt/',
      'es https://marcosantana.dev/es/',
      'x-default https://marcosantana.dev/'
    ]);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://marcosantana.dev${path}`);
  }
});

test('the language switcher re-renders in place', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  for (const { loc, d } of [LOCALES[1], LOCALES[2], LOCALES[0]]) {
    await page.locator(`[data-lang-btn="${loc}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', loc);
    await expect(page.locator('h1')).toHaveText(d.home.h1);
    await expect(page.locator('#experience-title')).toHaveText(d.resume.section.experience);
    await expect(page.locator(`[data-lang-btn="${loc}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.seat-title').first()).toHaveText(d.how.seat.lead.title);
    await expect(page.locator('.cycle .cycle-step').first()).toHaveText(d.how.cycle.request);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the theme toggle switches light and dark', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const toggle = page.locator('[data-theme-toggle]');
  await expect(toggle).toBeVisible();
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const light = await bg();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await bg()).not.toBe(light);
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('both résumé PDFs are served, from the first screen and the résumé', async ({ page, request }) => {
  await page.goto('/');
  for (const where of ['.hero-actions', '.profile-actions']) {
    const links = await page.locator(`${where} a.btn`).evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(links).toEqual(['/Marco_Santana_Resume.pdf', '/Marco_Santana_Curriculo.pdf']);
  }
  const hrefs = ['/Marco_Santana_Resume.pdf', '/Marco_Santana_Curriculo.pdf'];
  for (const href of hrefs) {
    const r = await request.get(href);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('application/pdf');
    expect((await r.body()).subarray(0, 5).toString()).toBe('%PDF-');
  }
});
