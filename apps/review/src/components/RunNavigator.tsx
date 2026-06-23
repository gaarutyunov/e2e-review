import type { ManifestEntry, RunReport } from '@gaarutyunov/e2e-review-shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  runs: ManifestEntry[];
  selectedRunId: string | null;
  onSelectRun: (id: string) => void;
  run: RunReport | null;
  selectedScenarioId: string | null;
  onSelectScenario: (id: string) => void;
}

export function RunNavigator({
  runs,
  selectedRunId,
  onSelectRun,
  run,
  selectedScenarioId,
  onSelectScenario,
}: Props) {
  return (
    <nav className="space-y-4" data-testid="run-navigator">
      <div>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Runs
        </h2>
        <ul className="space-y-1">
          {runs.length === 0 && (
            <li className="px-2 py-2 text-sm text-muted-foreground">No runs found.</li>
          )}
          {runs.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelectRun(r.id)}
                data-testid={`run-${r.id}`}
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                  r.id === selectedRunId && 'bg-accent'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{r.id}</span>
                  <Badge variant={r.summary.failed > 0 ? 'destructive' : 'success'}>
                    {r.summary.passed}/{r.summary.total}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {run && (
        <div>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Scenarios
          </h2>
          <div className="space-y-3">
            {run.features.map((feature) => (
              <div key={feature.name}>
                <p className="px-1 text-xs font-medium text-muted-foreground">{feature.name}</p>
                <ul className="mt-1 space-y-0.5">
                  {feature.scenarios.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSelectScenario(s.id)}
                        data-testid={`scenario-${s.id}`}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                          s.id === selectedScenarioId && 'bg-accent'
                        )}
                      >
                        {s.status === 'passed' ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <span className="truncate">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
