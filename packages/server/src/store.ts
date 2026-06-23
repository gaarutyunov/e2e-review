import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Comment, Manifest, ManifestEntry, NewComment, RunReport } from '@gaarutyunov/e2e-review-shared';

/** Reads run reports from a results directory (manifest.json + <id>/run.json). */
export class RunStore {
  constructor(private dataDir: string) {}

  listRuns(): ManifestEntry[] {
    const manifestPath = path.join(this.dataDir, 'manifest.json');
    if (existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Manifest;
        return manifest.runs ?? [];
      } catch {
        /* fall through to scan */
      }
    }
    // No manifest: scan immediate subdirectories for run.json.
    if (!existsSync(this.dataDir)) return [];
    const entries: ManifestEntry[] = [];
    for (const name of readdirSync(this.dataDir)) {
      const runJson = path.join(this.dataDir, name, 'run.json');
      if (existsSync(runJson)) {
        try {
          const report = JSON.parse(readFileSync(runJson, 'utf-8')) as RunReport;
          entries.push({
            id: report.id,
            createdAt: report.createdAt,
            summary: report.summary,
            git: report.git,
            reportPath: `${name}/run.json`,
          });
        } catch {
          /* skip invalid */
        }
      }
    }
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getRun(id: string): RunReport | null {
    const runJson = path.join(this.dataDir, id, 'run.json');
    if (!existsSync(runJson)) return null;
    try {
      return JSON.parse(readFileSync(runJson, 'utf-8')) as RunReport;
    } catch {
      return null;
    }
  }
}

/** Persists review comments to a single JSON file inside the data directory. */
export class CommentStore {
  private file: string;

  constructor(dataDir: string) {
    this.file = path.join(dataDir, 'comments.json');
  }

  private read(): Comment[] {
    if (!existsSync(this.file)) return [];
    try {
      return JSON.parse(readFileSync(this.file, 'utf-8')) as Comment[];
    } catch {
      return [];
    }
  }

  private write(comments: Comment[]): void {
    writeFileSync(this.file, JSON.stringify(comments, null, 2));
  }

  list(filter: { runId?: string; scenarioId?: string } = {}): Comment[] {
    return this.read().filter(
      (c) =>
        (filter.runId === undefined || c.runId === filter.runId) &&
        (filter.scenarioId === undefined || c.scenarioId === filter.scenarioId)
    );
  }

  get(id: string): Comment | undefined {
    return this.read().find((c) => c.id === id);
  }

  add(input: NewComment): Comment {
    const comment: Comment = {
      id: randomUUID(),
      runId: input.runId,
      scenarioId: input.scenarioId,
      stepIndex: input.stepIndex ?? null,
      body: input.body,
      author: input.author ?? 'reviewer',
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    const all = this.read();
    all.push(comment);
    this.write(all);
    return comment;
  }

  setResolved(id: string, resolved: boolean): Comment | undefined {
    const all = this.read();
    const c = all.find((x) => x.id === id);
    if (!c) return undefined;
    c.resolved = resolved;
    this.write(all);
    return c;
  }
}
