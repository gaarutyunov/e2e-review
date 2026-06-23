import type { RunReport, ManifestEntry, Comment, NewComment } from '@gaarutyunov/e2e-review-shared';
import type { DataSource } from './types';
import { localCommentStore } from './localComments';

/** Rewrite a report's relative asset paths to usable URLs in place. */
function resolveAssets(report: RunReport, toUrl: (relPath: string) => string): RunReport {
  for (const feature of report.features) {
    for (const scenario of feature.scenarios) {
      if (scenario.video?.path) scenario.video.path = toUrl(scenario.video.path);
      for (const step of scenario.steps) {
        if (step.screenshots) {
          for (const shot of step.screenshots) shot.path = toUrl(shot.path);
        }
      }
    }
  }
  return report;
}

/** Bundled-JSON source for GitHub Pages: data under <base>data/. */
export class StaticSource implements DataSource {
  readonly kind = 'static' as const;
  readonly label = 'Bundled results';
  readonly localComments = true;
  private base = `${import.meta.env.BASE_URL}data/`;

  async listRuns(): Promise<ManifestEntry[]> {
    const res = await fetch(`${this.base}manifest.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const manifest = await res.json();
    return manifest.runs ?? [];
  }

  async getRun(id: string): Promise<RunReport> {
    const res = await fetch(`${this.base}${id}/run.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Run "${id}" not found`);
    const report = (await res.json()) as RunReport;
    return resolveAssets(report, (rel) => `${this.base}${id}/${rel}`);
  }

  async listComments(runId: string): Promise<Comment[]> {
    return localCommentStore.list(runId);
  }
  async addComment(comment: NewComment): Promise<Comment> {
    return localCommentStore.add(comment);
  }
  async setResolved(commentId: string, resolved: boolean): Promise<void> {
    localCommentStore.setResolved(commentId, resolved);
  }
}

/** REST source backed by the Express + MCP server. */
export class ServerSource implements DataSource {
  readonly kind = 'server' as const;
  readonly label = 'Server';
  readonly localComments = false;

  async listRuns(): Promise<ManifestEntry[]> {
    const res = await fetch('api/runs');
    if (!res.ok) throw new Error('Failed to list runs');
    return res.json();
  }

  async getRun(id: string): Promise<RunReport> {
    const res = await fetch(`api/runs/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Run "${id}" not found`);
    const report = (await res.json()) as RunReport;
    return resolveAssets(report, (rel) => `data/${id}/${rel}`);
  }

  async listComments(runId: string): Promise<Comment[]> {
    const res = await fetch(`api/comments?runId=${encodeURIComponent(runId)}`);
    if (!res.ok) return [];
    return res.json();
  }

  async addComment(comment: NewComment): Promise<Comment> {
    const res = await fetch('api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(comment),
    });
    if (!res.ok) throw new Error('Failed to add comment');
    return res.json();
  }

  async setResolved(commentId: string, resolved: boolean): Promise<void> {
    await fetch(`api/comments/${encodeURIComponent(commentId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resolved }),
    });
  }
}

/**
 * In-browser source backed by a folder the user picks via the File System
 * Access API. Reads manifest.json / run.json and turns videos + screenshots
 * into object URLs. Comments stay in localStorage (export/import to share).
 */
export class FolderSource implements DataSource {
  readonly kind = 'folder' as const;
  readonly label: string;
  readonly localComments = true;
  private dir: FileSystemDirectoryHandle;
  private objectUrls: string[] = [];

  constructor(dir: FileSystemDirectoryHandle) {
    this.dir = dir;
    this.label = `Folder: ${dir.name}`;
  }

  static isSupported(): boolean {
    return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';
  }

  static async pick(): Promise<FolderSource> {
    const handle = await (window as unknown as {
      showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker();
    return new FolderSource(handle);
  }

  private async getFileByPath(relPath: string): Promise<File> {
    const parts = relPath.split('/').filter(Boolean);
    let dir = this.dir;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]);
    }
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
    return fileHandle.getFile();
  }

  private async readJson<T>(relPath: string): Promise<T> {
    const file = await this.getFileByPath(relPath);
    return JSON.parse(await file.text()) as T;
  }

  async listRuns(): Promise<ManifestEntry[]> {
    try {
      const manifest = await this.readJson<{ runs: ManifestEntry[] }>('manifest.json');
      return manifest.runs ?? [];
    } catch {
      return [];
    }
  }

  async getRun(id: string): Promise<RunReport> {
    const report = await this.readJson<RunReport>(`${id}/run.json`);
    // Resolve assets to object URLs (async), so do it eagerly here.
    for (const feature of report.features) {
      for (const scenario of feature.scenarios) {
        if (scenario.video?.path) scenario.video.path = await this.toObjectUrl(`${id}/${scenario.video.path}`);
        for (const step of scenario.steps) {
          if (step.screenshots) {
            for (const shot of step.screenshots) shot.path = await this.toObjectUrl(`${id}/${shot.path}`);
          }
        }
      }
    }
    return report;
  }

  private async toObjectUrl(relPath: string): Promise<string> {
    try {
      const file = await this.getFileByPath(relPath);
      const url = URL.createObjectURL(file);
      this.objectUrls.push(url);
      return url;
    } catch {
      return '';
    }
  }

  dispose(): void {
    for (const url of this.objectUrls) URL.revokeObjectURL(url);
    this.objectUrls = [];
  }

  async listComments(runId: string): Promise<Comment[]> {
    return localCommentStore.list(runId);
  }
  async addComment(comment: NewComment): Promise<Comment> {
    return localCommentStore.add(comment);
  }
  async setResolved(commentId: string, resolved: boolean): Promise<void> {
    localCommentStore.setResolved(commentId, resolved);
  }
}

export function createDefaultSource(): DataSource {
  const mode = import.meta.env.VITE_DATA_MODE;
  return mode === 'server' ? new ServerSource() : new StaticSource();
}
