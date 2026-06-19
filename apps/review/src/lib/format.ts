import type { RunStatus, StepStatus } from '@e2e-review/shared';

/** Format milliseconds as m:ss.t (e.g. 1:07.4). */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export function statusVariant(status: RunStatus | StepStatus): Variant {
  switch (status) {
    case 'passed':
      return 'success';
    case 'failed':
    case 'timedOut':
      return 'destructive';
    case 'skipped':
    case 'pending':
    case 'interrupted':
      return 'warning';
    default:
      return 'secondary';
  }
}
