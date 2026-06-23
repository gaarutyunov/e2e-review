import type { ReportStep } from '@gaarutyunov/e2e-review-shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatMs, statusVariant } from '@/lib/format';
import { MessageSquare, CheckCircle2, XCircle, Circle } from 'lucide-react';

interface Props {
  steps: ReportStep[];
  activeIndex: number;
  selectedIndex: number | null;
  commentCounts: number[];
  onSelect: (index: number) => void;
}

export function StepTimeline({ steps, activeIndex, selectedIndex, commentCounts, onSelect }: Props) {
  return (
    <ol className="flex flex-col gap-1" data-testid="step-timeline">
      {steps.map((step, i) => {
        const isActive = i === activeIndex;
        const isSelected = i === selectedIndex;
        const count = commentCounts[i] ?? 0;
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              data-active={isActive}
              data-testid={`step-${i}`}
              className={cn(
                'group w-full rounded-md border px-3 py-2 text-left transition-colors',
                'hover:bg-accent',
                isActive ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border',
                isSelected && !isActive && 'border-ring'
              )}
            >
              <div className="flex items-start gap-2">
                <StepIcon status={step.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {step.keyword}
                    </span>
                    <span className="text-sm">{step.text}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatMs(step.videoOffsetStartMs)}</span>
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{step.durationMs} ms</span>
                    {step.status !== 'passed' && (
                      <Badge variant={statusVariant(step.status)} className="ml-1">
                        {step.status}
                      </Badge>
                    )}
                  </div>
                </div>
                {count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground" title={`${count} comment(s)`}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    {count}
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepIcon({ status }: { status: ReportStep['status'] }) {
  if (status === 'passed') return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === 'failed') return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
  return <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
}
