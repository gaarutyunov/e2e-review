import type { ReportStep } from '@e2e-review/shared';
import { cn } from '@/lib/utils';
import { formatMs } from '@/lib/format';

interface Props {
  steps: ReportStep[];
  durationMs: number;
  currentMs: number;
  activeIndex: number;
  onSeek: (ms: number) => void;
}

const STATUS_COLOR: Record<string, string> = {
  passed: 'bg-emerald-500',
  failed: 'bg-destructive',
  skipped: 'bg-amber-500',
  pending: 'bg-amber-500',
  undefined: 'bg-muted-foreground',
};

/**
 * A proportional track that maps the Gherkin steps onto the full video
 * duration. Each step is a segment positioned by its video offset; clicking a
 * segment (or anywhere on the track) seeks the video. A playhead reflects the
 * current video time. This makes the step ↔ video-time relationship explicit.
 */
export function VideoTimeline({ steps, durationMs, currentMs, activeIndex, onSeek }: Props) {
  const total = Math.max(durationMs, 1);
  const pct = (ms: number) => `${Math.min(100, Math.max(0, (ms / total) * 100))}%`;

  function onTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.round(ratio * total));
  }

  return (
    <div className="space-y-1" data-testid="video-timeline">
      <div
        className="relative h-7 w-full cursor-pointer overflow-hidden rounded-md border bg-muted"
        onClick={onTrackClick}
        role="slider"
        aria-label="Video timeline"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={currentMs}
        tabIndex={0}
      >
        {steps.map((step, i) => {
          const left = (step.videoOffsetStartMs / total) * 100;
          const width = Math.max(0.5, ((step.videoOffsetEndMs - step.videoOffsetStartMs) / total) * 100);
          return (
            <button
              key={i}
              type="button"
              title={`${step.keyword} ${step.text} — ${formatMs(step.videoOffsetStartMs)}`}
              data-testid={`timeline-seg-${i}`}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(step.videoOffsetStartMs);
              }}
              className={cn(
                'absolute top-0 h-full border-r border-background/70 opacity-70 transition-opacity hover:opacity-100',
                STATUS_COLOR[step.status] ?? 'bg-muted-foreground',
                i === activeIndex && 'opacity-100 ring-2 ring-inset ring-primary'
              )}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {/* Playhead */}
        <div
          className="pointer-events-none absolute top-0 z-10 h-full w-0.5 bg-foreground"
          style={{ left: pct(currentMs) }}
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span data-testid="timeline-current">{formatMs(currentMs)}</span>
        <span>{formatMs(total)}</span>
      </div>
    </div>
  );
}
