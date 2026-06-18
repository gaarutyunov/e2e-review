/**
 * Shared data model for the e2e-review tool.
 *
 * A *run* is the result of one Playwright BDD test run. It contains features,
 * each with scenarios (Gherkin scenarios), each with steps (Given/When/Then).
 * Every step carries the offset (in ms) of when it started and ended *relative
 * to the start of the scenario's video*, so the review UI can seek the video to
 * a step and highlight the step that is currently playing.
 */

export type StepStatus =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'undefined';

export type RunStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';

export interface StepError {
  message: string;
  stack?: string;
}

export interface Screenshot {
  /** Path relative to the run folder, e.g. "login-success/failed-1.png". */
  path: string;
  /** Offset in ms from the start of the video, if known. */
  offsetMs?: number;
}

export interface ReportStep {
  keyword: string; // Given | When | Then | And | But
  text: string;
  status: StepStatus;
  /** Offset (ms) from video start when the step began. */
  videoOffsetStartMs: number;
  /** Offset (ms) from video start when the step ended. */
  videoOffsetEndMs: number;
  durationMs: number;
  error?: StepError;
  screenshots?: Screenshot[];
}

export interface VideoMeta {
  /** Path relative to the run folder, e.g. "login-success/video.webm". */
  path: string;
  durationMs?: number;
  width?: number;
  height?: number;
}

export interface Scenario {
  /** Stable id, derived from feature file + scenario title. */
  id: string;
  title: string;
  featureFile: string;
  tags: string[];
  status: RunStatus;
  durationMs: number;
  /** Wall-clock start of the scenario, ISO string. */
  startTime: string;
  video?: VideoMeta;
  steps: ReportStep[];
  error?: StepError;
}

export interface Feature {
  name: string;
  file: string;
  description?: string;
  scenarios: Scenario[];
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface GitMeta {
  sha?: string;
  branch?: string;
  commitUrl?: string;
}

export interface RunReport {
  id: string;
  createdAt: string; // ISO
  projectName: string;
  git?: GitMeta;
  environment?: {
    os?: string;
    browser?: string;
    nodeVersion?: string;
  };
  summary: RunSummary;
  features: Feature[];
}

/** One entry per run in the top-level manifest.json. */
export interface ManifestEntry {
  id: string;
  createdAt: string;
  summary: RunSummary;
  git?: GitMeta;
  /** Path (relative to the manifest) to the run's run.json. */
  reportPath: string;
}

export interface Manifest {
  generatedAt: string;
  runs: ManifestEntry[];
}

/**
 * A review comment. `stepIndex` is null for a scenario-level comment, or the
 * 0-based index into the scenario's `steps` array for a per-step comment.
 */
export interface Comment {
  id: string;
  runId: string;
  scenarioId: string;
  stepIndex: number | null;
  body: string;
  author: string;
  createdAt: string; // ISO
  resolved: boolean;
}

export interface NewComment {
  runId: string;
  scenarioId: string;
  stepIndex?: number | null;
  body: string;
  author?: string;
}

/** Helpers shared by reporter, server and UI. */
export function scenarioId(featureFile: string, title: string): string {
  return `${featureFile}::${title}`.replace(/[^a-zA-Z0-9:._-]+/g, '-');
}

export function emptySummary(): RunSummary {
  return { total: 0, passed: 0, failed: 0, skipped: 0 };
}

export const GHERKIN_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But', '*'];

/** Detect whether a Playwright step title looks like a Gherkin step. */
export function isGherkinStepTitle(title: string): boolean {
  return GHERKIN_KEYWORDS.some((k) => title.startsWith(k + ' '));
}
