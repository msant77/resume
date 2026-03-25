import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(__dirname, 'v1/index.html');

const pdfConfig = {
  format: 'A4',
  margin: { top: '2cm', right: '2.2cm', bottom: '2cm', left: '2.2cm' },
  printBackground: true,
  preferCSSPageSize: false,
};

async function generatePdf(page, lang, outputFile) {
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  await page.evaluate((targetLang) => {
    // Force light mode
    document.documentElement.removeAttribute('data-theme');

    // Force all reveal elements visible
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    // Switch language via the globally exposed setLang
    if (window.setLang) {
      window.setLang(targetLang);
    }
  }, lang);

  const outputPath = resolve(__dirname, 'v1', outputFile);
  await page.pdf({ ...pdfConfig, path: outputPath });
  console.log(`PDF generated: ${outputPath}`);
}

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await generatePdf(page, 'en', 'Marco_Santana_Resume.pdf');
await generatePdf(page, 'pt', 'Marco_Santana_Curriculo.pdf');

await browser.close();
