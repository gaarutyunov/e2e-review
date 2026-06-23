import { useCallback, useEffect, useState } from 'react';
import type { Comment, ManifestEntry, RunReport } from '@gaarutyunov/e2e-review-shared';
import type { DataSource } from '@/data/types';
import { createDefaultSource, FolderSource, StaticSource } from '@/data/sources';
import { localCommentStore } from '@/data/localComments';
import { Header } from '@/components/Header';
import { RunNavigator } from '@/components/RunNavigator';
import { ScenarioView } from '@/components/ScenarioView';
import { cn } from '@/lib/utils';

export function App() {
  const [source, setSource] = useState<DataSource>(() => createDefaultSource());
  const [runs, setRuns] = useState<ManifestEntry[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [run, setRun] = useState<RunReport | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  // Load the run list whenever the data source changes.
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setRun(null);
    setSelectedRunId(null);
    source
      .listRuns()
      .then((list) => {
        if (cancelled) return;
        setRuns(list);
        if (list.length > 0) setSelectedRunId(list[0].id);
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [source]);

  const loadComments = useCallback(
    (runId: string) => {
      source.listComments(runId).then(setComments).catch(() => setComments([]));
    },
    [source]
  );

  // Load a run report + its comments when the selection changes.
  useEffect(() => {
    if (!selectedRunId) return;
    let cancelled = false;
    setError(null);
    source
      .getRun(selectedRunId)
      .then((report) => {
        if (cancelled) return;
        setRun(report);
        const first = report.features[0]?.scenarios[0]?.id ?? null;
        setSelectedScenarioId(first);
      })
      .catch((e) => !cancelled && setError(String(e)));
    loadComments(selectedRunId);
    return () => {
      cancelled = true;
    };
  }, [selectedRunId, source, loadComments]);

  async function handleAddComment(scenarioId: string, stepIndex: number | null, body: string) {
    if (!selectedRunId) return;
    await source.addComment({ runId: selectedRunId, scenarioId, stepIndex, body });
    loadComments(selectedRunId);
  }

  async function handleResolveComment(id: string, resolved: boolean) {
    await source.setResolved(id, resolved);
    if (selectedRunId) loadComments(selectedRunId);
  }

  async function handleOpenFolder() {
    try {
      const folder = await FolderSource.pick();
      setSource(folder);
    } catch {
      /* user cancelled */
    }
  }

  function handleExport() {
    const blob = new Blob([localCommentStore.exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `e2e-review-comments-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    try {
      const count = localCommentStore.importAll(await file.text(), 'merge');
      if (selectedRunId) loadComments(selectedRunId);
      alert(`Imported ${count} comment(s).`);
    } catch (e) {
      alert(`Import failed: ${String(e)}`);
    }
  }

  const scenario =
    run?.features.flatMap((f) => f.scenarios).find((s) => s.id === selectedScenarioId) ?? null;
  const scenarioComments = scenario
    ? comments.filter((c) => c.scenarioId === scenario.id)
    : [];

  return (
    <div className="min-h-screen">
      <Header
        source={source}
        canUseFolder={FolderSource.isSupported()}
        onOpenFolder={handleOpenFolder}
        onUseBundled={() => setSource(new StaticSource())}
        onExport={handleExport}
        onImport={handleImport}
        onToggleNav={() => setNavOpen((v) => !v)}
      />

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar: overlay on mobile, static column on desktop */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-20 w-72 overflow-y-auto border-r bg-background p-3 pt-16 transition-transform lg:static lg:z-0 lg:translate-x-0 lg:pt-3',
            navOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <RunNavigator
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={(id) => {
              setSelectedRunId(id);
              setNavOpen(false);
            }}
            run={run}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={(id) => {
              setSelectedScenarioId(id);
              setNavOpen(false);
            }}
          />
        </aside>

        {navOpen && (
          <div className="fixed inset-0 z-10 bg-black/40 lg:hidden" onClick={() => setNavOpen(false)} />
        )}

        <main className="min-w-0 flex-1 p-3 sm:p-6">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {!error && !scenario && (
            <div className="flex h-[60vh] items-center justify-center text-center text-muted-foreground">
              <div>
                <p className="text-lg font-medium">No scenario selected</p>
                <p className="text-sm">
                  {runs.length === 0
                    ? 'No runs found. Run the e2e tests or open a results folder.'
                    : 'Pick a run and scenario from the navigator.'}
                </p>
              </div>
            </div>
          )}
          {scenario && run && (
            <ScenarioView
              run={run}
              scenario={scenario}
              comments={scenarioComments}
              onAddComment={handleAddComment}
              onResolveComment={handleResolveComment}
            />
          )}
        </main>
      </div>
    </div>
  );
}
