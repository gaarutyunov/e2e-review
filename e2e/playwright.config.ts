import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Generate Playwright specs from the Gherkin .feature files + step definitions.
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['fixtures.ts', 'steps/**/*.ts'],
});

export default defineConfig({
  testDir,
  outputDir: 'test-results',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    // Our custom reporter writes the video-aligned run.json + manifest.json
    // consumed by the review app, into the repo-root e2e-results/ folder.
    ['@gaarutyunov/e2e-review-reporter', { outputDir: '../e2e-results', projectName: 'acme-demo' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    video: 'on',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -w @gaarutyunov/e2e-review-demo',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
