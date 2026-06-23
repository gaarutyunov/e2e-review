import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { RunStore, CommentStore } from './store.js';
import { buildMcpServer } from './mcp.js';
import type { NewComment } from '@gaarutyunov/e2e-review-shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ServerOptions {
  /** Directory holding manifest.json + <runId>/run.json + videos + comments.json. */
  dataDir: string;
  /** Built review SPA to serve at /. Defaults to apps/review/dist in the monorepo. */
  reviewDist?: string;
  port?: number;
}

export function createApp(options: ServerOptions) {
  const dataDir = path.resolve(options.dataDir);
  // Prefer the review SPA bundled into the published package (dist/review, built
  // in server data-mode); fall back to the monorepo build path for workspace dev.
  const bundledReview = path.resolve(__dirname, 'review');
  const reviewDist =
    options.reviewDist ??
    (existsSync(bundledReview) ? bundledReview : path.resolve(__dirname, '../../../apps/review/dist'));

  const runStore = new RunStore(dataDir);
  const commentStore = new CommentStore(dataDir);

  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Permissive CORS so local MCP clients / tools can reach the API.
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, mcp-protocol-version');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // --- REST API (consumed by the review app in "server" mode) ---
  app.get('/api/runs', (_req, res) => {
    res.json(runStore.listRuns());
  });

  app.get('/api/runs/:id', (req, res) => {
    const run = runStore.getRun(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  });

  app.get('/api/comments', (req, res) => {
    const { runId, scenarioId } = req.query as { runId?: string; scenarioId?: string };
    res.json(commentStore.list({ runId, scenarioId }));
  });

  app.post('/api/comments', (req, res) => {
    const body = req.body as NewComment;
    if (!body?.runId || !body?.scenarioId || !body?.body) {
      return res.status(400).json({ error: 'runId, scenarioId and body are required' });
    }
    res.status(201).json(commentStore.add(body));
  });

  app.patch('/api/comments/:id', (req, res) => {
    const { resolved } = req.body as { resolved?: boolean };
    const updated = commentStore.setResolved(req.params.id, resolved ?? true);
    if (!updated) return res.status(404).json({ error: 'Comment not found' });
    res.json(updated);
  });

  // --- MCP endpoint (stateless: one server+transport per request) ---
  app.post('/mcp', async (req, res) => {
    try {
      const server = buildMcpServer(runStore, commentStore);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      if (!res.headersSent) res.status(500).json({ error: String(err) });
    }
  });
  const methodNotAllowed = (_req: express.Request, res: express.Response) =>
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  app.get('/mcp', methodNotAllowed);
  app.delete('/mcp', methodNotAllowed);

  // --- Static assets: test-result videos/screenshots + the review SPA ---
  app.use('/data', express.static(dataDir));
  if (existsSync(reviewDist)) {
    app.use(express.static(reviewDist));
    // SPA fallback (Express 5: avoid '*' route string; use a final middleware).
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/data')) {
        return next();
      }
      res.sendFile(path.join(reviewDist, 'index.html'));
    });
  }

  return { app, dataDir, reviewDist };
}

export function startServer(options: ServerOptions) {
  const { app, dataDir, reviewDist } = createApp(options);
  const port = options.port ?? 3000;
  return app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`\n  e2e-review server\n  ─────────────────`);
    console.log(`  Frontend : http://localhost:${port}/`);
    console.log(`  MCP      : http://localhost:${port}/mcp`);
    console.log(`  Data dir : ${dataDir}`);
    if (!existsSync(reviewDist)) {
      console.log(`  (review build not found at ${reviewDist} — run "npm run build:review")`);
    }
    console.log('');
  });
}
