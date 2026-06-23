import type { RunReport, ManifestEntry, Comment, NewComment } from '@gaarutyunov/e2e-review-shared';

/**
 * A pluggable source of runs + comments. The UI is written against this
 * interface so the exact same code works against bundled static JSON (GitHub
 * Pages), a locally-picked folder, or the Express/MCP server.
 *
 * `getRun` returns a report whose `video.path` / screenshot `path` fields are
 * already rewritten to directly-usable URLs (http(s): or blob:).
 */
export interface DataSource {
  readonly kind: 'static' | 'server' | 'folder';
  readonly label: string;
  /** Whether comments live client-side and can be exported/imported. */
  readonly localComments: boolean;
  listRuns(): Promise<ManifestEntry[]>;
  getRun(id: string): Promise<RunReport>;
  listComments(runId: string): Promise<Comment[]>;
  addComment(comment: NewComment): Promise<Comment>;
  setResolved(commentId: string, resolved: boolean): Promise<void>;
}
