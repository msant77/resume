// Browser checks for the published site (v1/), served the way the deploy
// publishes it. Uses the installed Google Chrome by default; set
// PW_BUNDLED=1 to use Playwright's own Chromium instead.
import { defineConfig } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests',
  timeout: 45_000,
  fullyParallel: true,
  reporter: [['list']],
  // kept under node_modules/, which git already ignores
  outputDir: 'node_modules/.playwright/test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_BUNDLED ? undefined : 'chrome'
  },
  webServer: {
    command: `node scripts/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true
  }
});
