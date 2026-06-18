import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import {
  type RunReport,
  type Feature,
  type Scenario,
  type ReportStep,
  type Manifest,
  type ManifestEntry,
  type RunStatus,
  type Screenshot,
  type GitMeta,
  emptySummary,
  isGherkinStepTitle,
  scenarioId,
} from '@e2e-review/shared';

export interface ReporterOptions {
  /** Where to write run folders + manifest.json. Resolved from cwd. */
  outputDir?: string;
  /** Logical run id; defaults to env RUN_ID or a timestamp. */
  runId?: string;
  projectName?: string;
}

/**
 * Custom Playwright reporter that emits a video-aligned run report.
 *
 * For every scenario it records each Gherkin step together with the offset
 * (relative to the start of the scenario's video) at which the step started and
 * ended. Videos and failure screenshots are copied next to the report so the
 * whole folder is self-contained and can be bundled into a static site.
 */
export default class E2eReviewReporter implements Reporter {
  private outputDir: string;
  private runId: string;
  private projectName: string;
  private runDir!: string;
  private features = new Map<string, Feature>();
  private startedAt = new Date().toISOString();

  constructor(options: ReporterOptions = {}) {
    this.outputDir = path.resolve(process.cwd(), options.outputDir ?? 'e2e-results');
    this.runId =
      options.runId ?? process.env.RUN_ID ?? `run-${Date.now()}`;
    this.projectName = options.projectName ?? 'e2e-review';
  }

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.runDir = path.join(this.outputDir, this.runId);
    mkdirSync(this.runDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const featureName = test.parent?.title || 'Unknown feature';
    const featureFile = relativeFeatureFile(test.location?.file);

    const scenario = this.buildScenario(test, result, featureFile);

    let feature = this.features.get(featureName);
    if (!feature) {
      feature = { name: featureName, file: featureFile, scenarios: [] };
      this.features.set(featureName, feature);
    }
    feature.scenarios.push(scenario);
  }

  private buildScenario(test: TestCase, result: TestResult, featureFile: string): Scenario {
    const id = scenarioId(featureFile, test.title);
    const folder = sanitize(id);
    const scenarioDir = path.join(this.runDir, folder);

    // The video clock starts at browser-context creation. A fixture records
    // that wall-clock moment via testInfo.attach('video-start'); use it as t0,
    // falling back to the test's own start time.
    const t0 = readVideoStart(result) ?? result.startTime.getTime();

    const steps = collectGherkinSteps(result.steps).map((s): ReportStep => {
      const start = Math.max(0, s.startTime.getTime() - t0);
      const duration = s.duration >= 0 ? s.duration : 0;
      const [keyword, ...rest] = s.title.split(' ');
      return {
        keyword,
        text: rest.join(' '),
        status: s.error ? 'failed' : 'passed',
        videoOffsetStartMs: start,
        videoOffsetEndMs: start + duration,
        durationMs: duration,
        error: s.error
          ? { message: stripAnsi(s.error.message ?? ''), stack: s.error.stack }
          : undefined,
      };
    });

    // Copy the video next to the report.
    let video: Scenario['video'];
    const videoAtt = result.attachments.find((a) => a.name === 'video' && a.path);
    if (videoAtt?.path && existsSync(videoAtt.path)) {
      mkdirSync(scenarioDir, { recursive: true });
      const ext = path.extname(videoAtt.path) || '.webm';
      const dest = path.join(scenarioDir, `video${ext}`);
      copyFileSync(videoAtt.path, dest);
      video = { path: `${folder}/video${ext}` };
    }

    // Copy failure screenshots and attach them to the failed step (if any).
    const screenshots: Screenshot[] = [];
    result.attachments
      .filter((a) => a.contentType.startsWith('image/') && a.path && existsSync(a.path))
      .forEach((a, i) => {
        mkdirSync(scenarioDir, { recursive: true });
        const ext = path.extname(a.path!) || '.png';
        const name = `screenshot-${i + 1}${ext}`;
        copyFileSync(a.path!, path.join(scenarioDir, name));
        screenshots.push({ path: `${folder}/${name}` });
      });
    if (screenshots.length) {
      const failed = steps.find((s) => s.status === 'failed') ?? steps[steps.length - 1];
      if (failed) failed.screenshots = screenshots;
    }

    return {
      id,
      title: test.title,
      featureFile,
      tags: extractTags(test),
      status: mapStatus(result.status),
      durationMs: result.duration,
      startTime: result.startTime.toISOString(),
      video,
      steps,
      error: result.error
        ? { message: stripAnsi(result.error.message ?? ''), stack: result.error.stack }
        : undefined,
    };
  }

  onEnd(): void {
    const features = [...this.features.values()];
    const summary = emptySummary();
    for (const f of features) {
      for (const s of f.scenarios) {
        summary.total++;
        if (s.status === 'passed') summary.passed++;
        else if (s.status === 'skipped') summary.skipped++;
        else summary.failed++;
      }
    }

    const git = readGit();
    const report: RunReport = {
      id: this.runId,
      createdAt: this.startedAt,
      projectName: this.projectName,
      git,
      environment: { os: process.platform, nodeVersion: process.version },
      summary,
      features,
    };

    writeFileSync(path.join(this.runDir, 'run.json'), JSON.stringify(report, null, 2));
    this.updateManifest({
      id: this.runId,
      createdAt: this.startedAt,
      summary,
      git,
      reportPath: `${this.runId}/run.json`,
    });

    // eslint-disable-next-line no-console
    console.log(`\n[e2e-review] wrote run "${this.runId}" → ${this.runDir}`);
  }

  private updateManifest(entry: ManifestEntry): void {
    const manifestPath = path.join(this.outputDir, 'manifest.json');
    let manifest: Manifest = { generatedAt: new Date().toISOString(), runs: [] };
    if (existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
      } catch {
        /* start fresh on parse error */
      }
    }
    manifest.runs = manifest.runs.filter((r) => r.id !== entry.id);
    manifest.runs.unshift(entry);
    manifest.generatedAt = new Date().toISOString();
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

function collectGherkinSteps(steps: TestStep[]): TestStep[] {
  const out: TestStep[] = [];
  const walk = (list: TestStep[]) => {
    for (const s of list) {
      if (s.category === 'test.step' && isGherkinStepTitle(s.title)) {
        out.push(s);
      }
      if (s.steps?.length) walk(s.steps);
    }
  };
  walk(steps);
  // Keep chronological order.
  return out.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

function readVideoStart(result: TestResult): number | null {
  const att = result.attachments.find((a) => a.name === 'video-start');
  if (!att) return null;
  const raw = att.body ? att.body.toString('utf-8') : undefined;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

function extractTags(test: TestCase): string[] {
  // Playwright exposes tags as `@tag` tokens; playwright-bdd also maps Gherkin
  // tags onto them.
  const tags = (test as unknown as { tags?: string[] }).tags;
  if (Array.isArray(tags)) return tags;
  const matches = test.title.match(/@[\w-]+/g);
  return matches ?? [];
}

function mapStatus(status: TestResult['status']): RunStatus {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'skipped':
      return 'skipped';
    case 'timedOut':
      return 'timedOut';
    case 'interrupted':
      return 'interrupted';
    default:
      return 'failed';
  }
}

function relativeFeatureFile(file?: string): string {
  if (!file) return 'unknown.feature';
  const idx = file.lastIndexOf('features' + path.sep);
  return idx >= 0 ? file.slice(idx).split(path.sep).join('/') : path.basename(file);
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;]*m/g, '');
}

function readGit(): GitMeta {
  const sha = process.env.GITHUB_SHA ?? safeGit('git rev-parse HEAD');
  const branch =
    process.env.GITHUB_REF_NAME ?? safeGit('git rev-parse --abbrev-ref HEAD');
  let commitUrl: string | undefined;
  const server = process.env.GITHUB_SERVER_URL;
  const repo = process.env.GITHUB_REPOSITORY;
  if (server && repo && sha) commitUrl = `${server}/${repo}/commit/${sha}`;
  return { sha, branch, commitUrl };
}

function safeGit(cmd: string): string | undefined {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return undefined;
  }
}
