import { useEffect, useMemo, useRef, useState } from 'react';
import type { Comment, RunReport, Scenario } from '@gaarutyunov/e2e-review-shared';
import { StepTimeline } from './StepTimeline';
import { VideoTimeline } from './VideoTimeline';
import { CommentsPanel } from './CommentsPanel';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { statusVariant } from '@/lib/format';
import { VideoOff } from 'lucide-react';

interface Props {
  run: RunReport;
  scenario: Scenario;
  comments: Comment[];
  onAddComment: (scenarioId: string, stepIndex: number | null, body: string) => void;
  onResolveComment: (id: string, resolved: boolean) => void;
}

export function ScenarioView({ run, scenario, comments, onAddComment, onResolveComment }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const unlockingRef = useRef(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  // Authoritative duration: the reporter bakes it in (Playwright webm files
  // don't expose it to the browser); fall back to the last step's end.
  const lastStepEnd = scenario.steps.length
    ? scenario.steps[scenario.steps.length - 1].videoOffsetEndMs
    : 0;
  const [durationMs, setDurationMs] = useState(scenario.video?.durationMs ?? lastStepEnd);

  // Reset transient view state when the scenario changes.
  useEffect(() => {
    setCurrentMs(0);
    setSelectedStepIndex(null);
    setDurationMs(scenario.video?.durationMs ?? lastStepEnd);
  }, [scenario.id, scenario.video?.durationMs, lastStepEnd]);

  // Playwright webm has no seek index, so Chrome reports duration === Infinity
  // and refuses to seek. Force it to scan the file by seeking far past the end;
  // once a finite duration appears, reset to 0 and seeking works.
  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (!v) return;
    if (!Number.isFinite(v.duration) || v.duration === 0) {
      unlockingRef.current = true;
      const onUpdate = () => {
        if (Number.isFinite(v.duration) && v.duration > 0) {
          v.removeEventListener('timeupdate', onUpdate);
          unlockingRef.current = false;
          v.currentTime = 0;
          setDurationMs(Math.round(v.duration * 1000));
        }
      };
      v.addEventListener('timeupdate', onUpdate);
      v.currentTime = 1e7;
    } else {
      setDurationMs(Math.round(v.duration * 1000));
    }
  }

  function seekTo(ms: number) {
    const v = videoRef.current;
    if (v) v.currentTime = ms / 1000;
    setCurrentMs(ms);
  }

  // The active step is the last one whose start offset has been reached.
  const activeIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < scenario.steps.length; i++) {
      if (scenario.steps[i].videoOffsetStartMs <= currentMs) idx = i;
      else break;
    }
    return idx;
  }, [currentMs, scenario.steps]);

  const commentCounts = useMemo(() => {
    const counts = new Array(scenario.steps.length).fill(0);
    for (const c of comments) {
      if (c.stepIndex !== null && c.stepIndex >= 0 && c.stepIndex < counts.length) counts[c.stepIndex]++;
    }
    return counts;
  }, [comments, scenario.steps.length]);

  function selectStep(stepIndex: number) {
    setSelectedStepIndex(stepIndex);
    const step = scenario.steps[stepIndex];
    if (step) seekTo(step.videoOffsetStartMs);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{scenario.title}</h2>
        <Badge variant={statusVariant(scenario.status)}>{scenario.status}</Badge>
        {scenario.tags.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>

      {scenario.video?.path ? (
        <div className="space-y-2">
          <video
            ref={videoRef}
            data-testid="scenario-video"
            src={scenario.video.path}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-lg border bg-black aspect-video"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={(e) => {
              if (!unlockingRef.current) setCurrentMs(e.currentTarget.currentTime * 1000);
            }}
            onSeeked={(e) => {
              if (!unlockingRef.current) setCurrentMs(e.currentTarget.currentTime * 1000);
            }}
          />
          <VideoTimeline
            steps={scenario.steps}
            durationMs={durationMs}
            currentMs={currentMs}
            activeIndex={activeIndex}
            onSeek={seekTo}
          />
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border bg-muted text-muted-foreground">
          <VideoOff className="h-8 w-8" />
          <p className="text-sm">No video recorded for this scenario.</p>
        </div>
      )}

      {scenario.error && (
        <Alert variant="destructive" data-testid="scenario-error">
          <AlertTitle>This scenario failed</AlertTitle>
          <AlertDescription>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">
              {scenario.error.message}
            </pre>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Steps</h3>
          <StepTimeline
            steps={scenario.steps}
            activeIndex={activeIndex}
            selectedIndex={selectedStepIndex}
            commentCounts={commentCounts}
            onSelect={selectStep}
          />
          <button
            type="button"
            className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setSelectedStepIndex(null)}
          >
            Comment on the whole scenario instead
          </button>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Comments</h3>
          <CommentsPanel
            comments={comments}
            steps={scenario.steps}
            selectedStepIndex={selectedStepIndex}
            onAdd={(body, stepIndex) => onAddComment(scenario.id, stepIndex, body)}
            onResolve={onResolveComment}
          />
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        Run <span className="font-mono">{run.id}</span>
        {run.git?.sha ? ` · ${run.git.sha.slice(0, 7)}` : ''}
      </p>
    </div>
  );
}
