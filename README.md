# e2e-review

Review Playwright **BDD** end-to-end test runs by watching their videos, comment
on individual Gherkin steps (bound to the video timeline), and hand the results
to an AI agent over an embedded **MCP** server so it can act on them — e.g. fix
the failing flow in Claude Code.

> Steps are bound to video timestamps: click a step to seek the video, and the
> step currently playing is highlighted as the video plays.

## The workflow

1. **Run e2e tests** — `playwright-bdd` runs Gherkin scenarios against the demo
   app and records a video per scenario.
2. **Open the review app** and point it at a results folder (bundled, a local
   folder, or a server).
3. **Review runs** — watch the video, scrub by step, and **comment** on a step
   or the whole scenario. Resolve comments as they're addressed.
4. **Get results over MCP** — an agent connects to the `/mcp` endpoint and calls
   `list_failures`, `get_run`, `list_comments`, `add_comment`, …
5. **Fix it** — the agent reads the failure + reviewer comments and fixes the
   code, then writes a comment back.

## Repository layout

```
apps/
  demo/        Login demo app (React + Vite + shadcn/ui) — the System Under Test
  review/      The review SPA (mobile-friendly). Static-bundle OR server-backed.
packages/
  shared/      Shared data model (RunReport, Scenario, ReportStep, Comment)
  reporter/    Custom Playwright reporter → video-aligned run.json + manifest.json
  server/      Express server: serves the review SPA at / and MCP at /mcp
e2e/           playwright-bdd: .feature files, step defs, fixtures, config
.github/workflows/
  deploy-main.yml   Production deploy to GitHub Pages (gh-pages branch)
  pr-preview.yml    Per-PR preview deploy + comment (rossjrw/pr-preview-action)
```

## How step ↔ video alignment works

Playwright starts recording video when the browser context is created. A test
fixture (`e2e/fixtures.ts`) records that exact wall-clock moment via
`testInfo.attach('video-start', …)`. The custom reporter
(`packages/reporter`) then expresses every Gherkin step's start/end as an offset
relative to that t0 (`step.startTime − videoStart`). Those offsets land in
`run.json`; the review UI uses them to seek the video and to highlight the
active step on every `timeupdate`, and renders them as a proportional timeline
track under the video.

Playwright's webm recordings have no seek index, so browsers report
`duration === Infinity` and refuse to seek. The reporter therefore parses the
real duration out of the webm container and bakes it into `run.json`, and the
player applies a "seek past the end" unlock so the video becomes seekable.

## Quick start

```bash
npm ci
npm run build:shared && npm run build:reporter   # build workspace deps first
```

### Run the demo app on its own

```bash
npm run dev:demo            # http://localhost:5173  (login / reset / register)
```

Seeded credentials: `user@acme.test` / `Password123!`.

### Run the e2e tests (records videos + run report)

```bash
npm run test:e2e
```

This generates `e2e-results/<runId>/run.json`, per-scenario videos, and
`e2e-results/manifest.json`. The `@demo-failure` scenario fails on purpose so
there's always a failure to review.

> Requires the Playwright browser. If your network blocks `cdn.playwright.dev`,
> run the tests in CI (the workflows install the browser on GitHub runners).

### Explore the review app without running browsers

```bash
npm run sample-data        # writes a sample run into e2e-results/ (no video)
npm run dev:review         # http://localhost:4173
```

### Full server experience (frontend + MCP together)

```bash
npm run build              # builds shared, reporter, review, server
npm run serve              # serves http://localhost:3000/  and  /mcp
```

- Frontend: <http://localhost:3000/>
- MCP (Streamable HTTP): <http://localhost:3000/mcp>
- REST: `/api/runs`, `/api/runs/:id`, `/api/comments`

To make the UI persist comments to disk (instead of localStorage), build the
review app in server mode:

```bash
VITE_DATA_MODE=server npm run build:review && npm run serve
```

## Connect an agent (Claude Code) to the MCP server

```bash
claude mcp add --transport http e2e-review http://localhost:3000/mcp
```

Then ask the agent to `list_failures`, read the reviewer's `list_comments`,
fix the code, and `add_comment` / `resolve_comment` back. Reviewer comments
(from the UI) and agent comments share the same on-disk `comments.json`.

### MCP tools

| Tool | Purpose |
| --- | --- |
| `list_runs` | All runs with pass/fail summary |
| `get_run` | Full report: features, scenarios, steps, video offsets |
| `list_failures` | Failing scenarios + failing step + error + video offset |
| `list_comments` | Reviewer/agent comments (filter by run/scenario) |
| `add_comment` | Add a comment to a scenario or a specific step |
| `resolve_comment` | Resolve / reopen a comment |

## Deployment (GitHub Pages)

Both production and PR previews publish to the **`gh-pages` branch**:

- **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root.**
- `deploy-main.yml` builds the review app (bundling the latest results) and
  publishes it to the branch root, excluding `pr-preview/` so previews survive.
- `pr-preview.yml` builds each PR with a preview base path and publishes it to
  `pr-preview/pr-<N>/`, commenting the preview URL on the PR (and cleaning up on
  close).

The MCP server is **not** part of the Pages build — Pages is static-only. The
deployed site reads bundled JSON and stores comments in `localStorage` (with
export/import to share). The MCP server only runs when you host it yourself.

## Mobile support

Both apps are responsive. The review app collapses the run/scenario navigator
into a drawer on small screens and stacks the video, step timeline, and comments
vertically.
