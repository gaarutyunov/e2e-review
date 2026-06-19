import type { Comment, NewComment } from '@e2e-review/shared';

const STORAGE_KEY = 'e2e-review:comments';

/**
 * Client-side comment store backed by localStorage, used by the static and
 * folder data sources (which have no backend). Supports export/import so a
 * reviewer can hand a JSON file to an agent or to a teammate.
 */
export class LocalCommentStore {
  private read(): Comment[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Comment[]) : [];
    } catch {
      return [];
    }
  }

  private write(comments: Comment[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  }

  list(runId: string): Comment[] {
    return this.read().filter((c) => c.runId === runId);
  }

  add(input: NewComment): Comment {
    const comment: Comment = {
      id: crypto.randomUUID(),
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

  setResolved(commentId: string, resolved: boolean): void {
    const all = this.read();
    const c = all.find((x) => x.id === commentId);
    if (c) {
      c.resolved = resolved;
      this.write(all);
    }
  }

  exportAll(): string {
    return JSON.stringify(this.read(), null, 2);
  }

  importAll(json: string, mode: 'merge' | 'replace' = 'merge'): number {
    const incoming = JSON.parse(json) as Comment[];
    if (!Array.isArray(incoming)) throw new Error('Invalid comments file');
    if (mode === 'replace') {
      this.write(incoming);
      return incoming.length;
    }
    const all = this.read();
    const byId = new Map(all.map((c) => [c.id, c]));
    for (const c of incoming) byId.set(c.id, c);
    this.write([...byId.values()]);
    return incoming.length;
  }
}

export const localCommentStore = new LocalCommentStore();
