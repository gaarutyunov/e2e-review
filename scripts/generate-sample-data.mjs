#!/usr/bin/env node
// Generates a sample run report + manifest so the review app and server/MCP can
// be explored without running the browser-based e2e tests. Real runs (with
// videos) are produced by the custom reporter in CI. Sample runs have no video.
//
// Usage: node scripts/generate-sample-data.mjs [outDir]   (default: apps/review/public/data)

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const outDir = path.resolve(process.argv[2] ?? 'apps/review/public/data');
const runId = 'sample-run';

function step(keyword, text, startMs, durationMs, status = 'passed', error) {
  return {
    keyword,
    text,
    status,
    videoOffsetStartMs: startMs,
    videoOffsetEndMs: startMs + durationMs,
    durationMs,
    error,
  };
}

const features = [
  {
    name: 'Login',
    file: 'features/login.feature',
    scenarios: [
      {
        id: 'features-login.feature--Successful-login-with-valid-credentials',
        title: 'Successful login with valid credentials',
        featureFile: 'features/login.feature',
        tags: ['@smoke'],
        status: 'passed',
        durationMs: 1850,
        startTime: new Date().toISOString(),
        video: { path: 'missing/video.webm', durationMs: 2200 },
        steps: [
          step('Given', 'the login page is open', 0, 420),
          step('When', 'I enter the email "user@acme.test"', 420, 180),
          step('And', 'I enter the password "Password123!"', 600, 160),
          step('And', 'I click the sign in button', 760, 520),
          step('Then', 'I should see the dashboard', 1280, 360),
          step('And', 'I should see my name "Ada Lovelace"', 1640, 210),
        ],
      },
      {
        id: 'features-login.feature--Login-fails-with-wrong-credentials',
        title: 'Login fails with wrong credentials',
        featureFile: 'features/login.feature',
        tags: [],
        status: 'passed',
        durationMs: 1300,
        startTime: new Date().toISOString(),
        steps: [
          step('Given', 'the login page is open', 0, 410),
          step('When', 'I enter the email "user@acme.test"', 410, 170),
          step('And', 'I enter the password "wrong-password"', 580, 150),
          step('And', 'I click the sign in button', 730, 300),
          step('Then', 'I should see the error "Invalid email or password"', 1030, 260),
        ],
      },
    ],
  },
  {
    name: 'Locked account messaging',
    file: 'features/locked-account.feature',
    scenarios: [
      {
        id: 'features-locked-account.feature--Locked-out-user-sees-a-helpful-message',
        title: 'Locked-out user sees a helpful message',
        featureFile: 'features/locked-account.feature',
        tags: ['@demo-failure'],
        status: 'failed',
        durationMs: 1500,
        startTime: new Date().toISOString(),
        error: {
          message:
            'Expected the error to contain "Your account is locked, please contact support" but it was "Invalid email or password".',
        },
        steps: [
          step('Given', 'the login page is open', 0, 410),
          step('When', 'I enter the email "locked@acme.test"', 410, 170),
          step('And', 'I enter the password "whatever"', 580, 150),
          step('And', 'I click the sign in button', 730, 300),
          step(
            'Then',
            'I should see the error "Your account is locked, please contact support"',
            1030,
            470,
            'failed',
            { message: 'locator.toContainText: expected "Your account is locked, please contact support"' }
          ),
        ],
      },
    ],
  },
];

const summary = { total: 0, passed: 0, failed: 0, skipped: 0 };
for (const f of features) {
  for (const s of f.scenarios) {
    summary.total++;
    if (s.status === 'passed') summary.passed++;
    else summary.failed++;
  }
}

const report = {
  id: runId,
  createdAt: new Date().toISOString(),
  projectName: 'acme-demo (sample)',
  git: { branch: 'sample', sha: 'sample0000000' },
  environment: { os: 'sample', nodeVersion: process.version },
  summary,
  features,
};

mkdirSync(path.join(outDir, runId), { recursive: true });
writeFileSync(path.join(outDir, runId, 'run.json'), JSON.stringify(report, null, 2));
writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), runs: [{ id: runId, createdAt: report.createdAt, summary, git: report.git, reportPath: `${runId}/run.json` }] },
    null,
    2
  )
);

console.log(`Wrote sample data to ${outDir}`);
