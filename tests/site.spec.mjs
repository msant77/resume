// The page in every language, width, theme and motion setting: it loads
// without console errors, never scrolls sideways, opens on the live stage
// (lanes, never a carousel or a rail of steps) and keeps the résumé, the
// PDFs and the switchers working.
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
const MOTIONS = ['no-preference', 'reduce'];

/* collect console errors and uncaught exceptions for the whole test */
function watch(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  return errors;
}

/* the stage has mounted: either the 3D canvas or the flat cards are on the page */
async function sceneReady(page) {
  await page.waitForFunction(() => document.querySelector('.hero-canvas, .dom-stage .node'));
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
      for (const reducedMotion of MOTIONS) {
        test(`${loc} ${width}px ${colorScheme} motion:${reducedMotion}`, async ({ browser }) => {
          const context = await browser.newContext({
            viewport: { width, height: width < 600 ? 740 : 800 }, colorScheme, reducedMotion
          });
          const page = await context.newPage();
          const errors = watch(page);
          await page.goto(path, { waitUntil: 'networkidle' });
          await sceneReady(page);

          await expect(page.locator('html')).toHaveAttribute('lang', loc);
          await expect(page.locator('h1')).toHaveText(d.home.h1);
          // the stage is the first thing on the page, and it starts within the first viewport
          const heroTop = await page.locator('#how').evaluate((el) => el.getBoundingClientRect().top);
          expect(heroTop).toBeLessThan(200);
          // depth where there is room for the whole board and motion is welcome; flat otherwise
          const view = await page.locator('#how').evaluate((el) => el.classList.contains('is-3d') ? '3d' : 'flat');
          expect(view).toBe(reducedMotion === 'reduce' || width < 700 ? 'flat' : '3d');
          // one continuous stage: no carousel, no rail of steps, no walker
          await expect(page.locator('.rail, .rail-btn, .bot, .satellites')).toHaveCount(0);
          await expect(page.locator('.frame-label strong')).toHaveText(d.hero.frame);
          // a keyboard proxy for each lane and each node
          await expect(page.locator('.proxy')).toHaveCount(13);
          if (view === 'flat') {
            await expect(page.locator('.dom-lane')).toHaveCount(3);
            await expect(page.locator('.dom-lane .lane-label').first()).toHaveText(d.hero.lane.harness.title);
          }
          if (view === '3d' && width >= 1100) {
            // the whole stage, Business value frame included, on the first screen
            const bottom = await page.locator('.stage-frame').evaluate((el) => el.getBoundingClientRect().bottom);
            expect(bottom, 'the stage fits the first screen').toBeLessThanOrEqual(800);
          }

          // let the stage run a little, then scroll through the whole page
          await page.waitForTimeout(reducedMotion === 'reduce' ? 300 : 2500);
          if (reducedMotion !== 'reduce') {
            // the session log is writing
            await expect.poll(() => page.locator('.log-list li:not(.log-empty)').count(), { timeout: 10_000 }).toBeGreaterThan(1);
          }
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
  await page.goto('/');
  await sceneReady(page);
  for (const { loc, d } of [LOCALES[1], LOCALES[2], LOCALES[0]]) {
    await page.locator(`[data-lang-btn="${loc}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', loc);
    await expect(page.locator('h1')).toHaveText(d.home.h1);
    await expect(page.locator('#experience-title')).toHaveText(d.resume.section.experience);
    await expect(page.locator(`[data-lang-btn="${loc}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.proxy').first()).toHaveText(d.hero.lane.harness.title);
    await expect(page.locator('.frame-label strong')).toHaveText(d.hero.frame);
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

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`captions open from the keyboard and Esc goes back (motion:${reducedMotion})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion });
    const page = await context.newPage();
    const errors = watch(page);
    await page.goto('/');
    await sceneReady(page);
    const d = LOCALES[0].d;
    // a lane, through its keyboard proxy
    const lane = page.locator('.proxy').first();
    await lane.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.cap')).toBeVisible();
    await expect(page.locator('.cap-title')).toHaveText(d.hero.lane.harness.title);
    await page.keyboard.press('Escape');
    await expect(page.locator('.cap')).toBeHidden();
    // a node: the throughput counter
    const node = page.locator('.proxy', { hasText: d.hero.node.throughput.title });
    await node.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.cap-title')).toHaveText(d.hero.node.throughput.title);
    await page.keyboard.press('Escape');
    await expect(page.locator('.cap')).toBeHidden();
    expect(errors, errors.join('\n')).toEqual([]);
    await context.close();
  });
}

test('the stage never stops: the throughput counter climbs and the log keeps writing', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 740 } });
  const page = await context.newPage();
  const errors = watch(page);
  await page.goto('/');
  await page.waitForSelector('.dom-stage .node');
  const counter = page.locator('.node.is-big .m-row.is-big .m-val');
  const read = async () => Number((await counter.textContent()).replace(/\D/g, ''));
  const before = await read();
  await page.waitForTimeout(7000);
  expect(await read()).toBeGreaterThan(before);
  expect(await page.locator('.log-list li:not(.log-empty)').count()).toBeGreaterThan(3);
  expect(errors, errors.join('\n')).toEqual([]);
  await context.close();
});

test('without WebGL the scene falls back to the flat view', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
      return /webgl/i.test(kind) ? null : get.call(this, kind, ...rest);
    };
  });
  const page = await context.newPage();
  const errors = watch(page);
  await page.goto('/');
  await page.waitForSelector('.dom-stage .node');
  await expect(page.locator('#how')).not.toHaveClass(/is-3d/);
  await expect(page.locator('.dom-stage .node')).toHaveCount(10);
  await expect(page.locator('.dom-lane')).toHaveCount(3);
  expect(errors, errors.join('\n')).toEqual([]);
  await context.close();
});

test('both résumé PDFs are served', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.locator('.profile-actions a.btn').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(['/Marco_Santana_Resume.pdf', '/Marco_Santana_Curriculo.pdf']);
  for (const href of hrefs) {
    const r = await request.get(href);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('application/pdf');
    expect((await r.body()).subarray(0, 5).toString()).toBe('%PDF-');
  }
});
