import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { RunStore, CommentStore } from './store.js';
import type { RunReport } from '@e2e-review/shared';

const json = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

/**
 * Builds an MCP server exposing the review data so an agent (e.g. Claude Code)
 * can read run results + reviewer comments and write its own comments back.
 */
export function buildMcpServer(runs: RunStore, comments: CommentStore): McpServer {
  const server = new McpServer({ name: 'e2e-review', version: '0.1.0' });

  server.registerTool(
    'list_runs',
    {
      title: 'List runs',
      description: 'List all available e2e test runs with their pass/fail summary.',
      inputSchema: {},
    },
    async () => json(runs.listRuns())
  );

  server.registerTool(
    'get_run',
    {
      title: 'Get run',
      description: 'Get the full report for a run: features, scenarios, Gherkin steps and their video offsets.',
      inputSchema: { runId: z.string().describe('Run id, as returned by list_runs') },
    },
    async ({ runId }) => {
      const run = runs.getRun(runId);
      if (!run) return { isError: true, content: [{ type: 'text', text: `Run "${runId}" not found` }] };
      return json(run);
    }
  );

  server.registerTool(
    'list_failures',
    {
      title: 'List failures',
      description:
        'List failing scenarios (optionally for one run) with the failing step, error message, and the video offset where it failed. Use this to find what an agent should fix.',
      inputSchema: { runId: z.string().optional().describe('Limit to a single run id') },
    },
    async ({ runId }) => {
      const targetRuns = runId
        ? [runs.getRun(runId)].filter(Boolean)
        : runs.listRuns().map((r) => runs.getRun(r.id));
      const failures: unknown[] = [];
      for (const run of targetRuns as RunReport[]) {
        if (!run) continue;
        for (const feature of run.features) {
          for (const scenario of feature.scenarios) {
            if (scenario.status === 'passed') continue;
            const failingStep = scenario.steps.find((s) => s.status === 'failed');
            failures.push({
              runId: run.id,
              feature: feature.name,
              featureFile: feature.file,
              scenarioId: scenario.id,
              scenario: scenario.title,
              status: scenario.status,
              failingStep: failingStep
                ? {
                    keyword: failingStep.keyword,
                    text: failingStep.text,
                    videoOffsetStartMs: failingStep.videoOffsetStartMs,
                    error: failingStep.error?.message,
                  }
                : null,
              error: scenario.error?.message,
            });
          }
        }
      }
      return json(failures);
    }
  );

  server.registerTool(
    'list_comments',
    {
      title: 'List comments',
      description: 'List review comments, optionally filtered by run and/or scenario.',
      inputSchema: {
        runId: z.string().optional(),
        scenarioId: z.string().optional(),
      },
    },
    async ({ runId, scenarioId }) => json(comments.list({ runId, scenarioId }))
  );

  server.registerTool(
    'add_comment',
    {
      title: 'Add comment',
      description:
        'Add a review comment to a scenario, or to a specific Gherkin step (stepIndex is the 0-based index into the scenario steps).',
      inputSchema: {
        runId: z.string(),
        scenarioId: z.string(),
        stepIndex: z.number().int().nullable().optional().describe('0-based step index, or null/omit for a scenario-level comment'),
        body: z.string(),
        author: z.string().optional().describe('Defaults to "agent"'),
      },
    },
    async ({ runId, scenarioId, stepIndex, body, author }) =>
      json(comments.add({ runId, scenarioId, stepIndex: stepIndex ?? null, body, author: author ?? 'agent' }))
  );

  server.registerTool(
    'resolve_comment',
    {
      title: 'Resolve comment',
      description: 'Mark a comment as resolved (or reopen it).',
      inputSchema: {
        commentId: z.string(),
        resolved: z.boolean().optional().describe('Defaults to true'),
      },
    },
    async ({ commentId, resolved }) => {
      const updated = comments.setResolved(commentId, resolved ?? true);
      if (!updated) return { isError: true, content: [{ type: 'text', text: `Comment "${commentId}" not found` }] };
      return json(updated);
    }
  );

  return server;
}
