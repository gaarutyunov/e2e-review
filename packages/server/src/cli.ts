#!/usr/bin/env node
import { startServer } from './server.js';

/**
 * Minimal CLI:
 *   e2e-review serve [--dir <results>] [--port <n>] [--review <dist>]
 */
function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

const [command, ...rest] = process.argv.slice(2);

if (command !== 'serve') {
  // eslint-disable-next-line no-console
  console.log(`Usage: e2e-review serve [--dir <results-dir>] [--port <port>] [--review <review-dist>]

Serves the e2e review frontend at / and the MCP server at /mcp.

Options:
  --dir     Directory with manifest.json + <runId>/run.json + videos  (default: ./e2e-results)
  --port    Port to listen on                                          (default: 3000)
  --review  Path to the built review SPA                               (default: apps/review/dist)
`);
  process.exit(command ? 1 : 0);
}

const args = parseArgs(rest);
startServer({
  dataDir: args.dir ?? process.env.E2E_REVIEW_DATA ?? './e2e-results',
  port: args.port ? Number(args.port) : Number(process.env.PORT ?? 3000),
  reviewDist: args.review,
});
