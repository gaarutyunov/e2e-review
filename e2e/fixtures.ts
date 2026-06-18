import { test as base } from 'playwright-bdd';

/**
 * Extends the playwright-bdd test with an auto fixture that records the
 * wall-clock moment the browser context (and therefore the video) is created.
 * The custom reporter reads this `video-start` attachment as t0 so every
 * Gherkin step's timestamp can be expressed as an offset into the video.
 */
export const test = base.extend<{ videoStart: void }>({
  videoStart: [
    async ({ page }, use, testInfo) => {
      // Destructuring `page` forces the context (and video) to be created.
      void page;
      await testInfo.attach('video-start', {
        body: String(Date.now()),
        contentType: 'text/plain',
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
