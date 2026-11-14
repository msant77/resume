// Builds the standalone resume PDFs from print/*.html (independent of the website).
// Picks the largest base font size that keeps each document at or under two pages.
import puppeteer from 'puppeteer';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const docs = [
  { src: 'resume-en.html', out: '../v1/Marco_Santana_Resume.pdf', format: 'Letter' },
  { src: 'resume-pt.html', out: '../v1/Marco_Santana_Curriculo.pdf', format: 'A4' },
];
const sizes = ['10.5pt', '10.25pt', '10pt', '9.75pt', '9.5pt'];

function pages(file) {
  try {
    const info = execFileSync('pdfinfo', [file]).toString();
    return Number(/^Pages:\s+(\d+)/m.exec(info)[1]);
  } catch {
    return NaN; // pdfinfo missing: no check possible
  }
}

const browser = await puppeteer.launch({ headless: true });
for (const d of docs) {
  const page = await browser.newPage();
  await page.goto(`file://${resolve(here, d.src)}`, { waitUntil: 'networkidle0' });
  const out = resolve(here, d.out);
  let chosen = null;
  for (const size of sizes) {
    await page.evaluate((s) => document.documentElement.style.setProperty('--base', s), size);
    await page.pdf({ path: out, format: d.format, printBackground: true, preferCSSPageSize: false,
      margin: { top: '0.55in', right: '0.65in', bottom: '0.55in', left: '0.65in' } });
    const n = pages(out);
    if (Number.isNaN(n) || n <= 2) { chosen = { size, n }; break; }
  }
  console.log(`${d.src} -> ${d.out}: base ${chosen.size}, ${Number.isNaN(chosen.n) ? '? (pdfinfo missing)' : chosen.n} page(s)`);
  await page.close();
}
await browser.close();
