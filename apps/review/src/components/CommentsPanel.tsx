import { useState } from 'react';
import type { Comment, ReportStep } from '@e2e-review/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { Check, Undo2 } from 'lucide-react';

interface Props {
  comments: Comment[];
  steps: ReportStep[];
  selectedStepIndex: number | null;
  onAdd: (body: string, stepIndex: number | null) => void;
  onResolve: (id: string, resolved: boolean) => void;
}

export function CommentsPanel({ comments, steps, selectedStepIndex, onAdd, onResolve }: Props) {
  const [body, setBody] = useState('');

  const targetLabel =
    selectedStepIndex === null
      ? 'the whole scenario'
      : `step ${selectedStepIndex + 1}: ${steps[selectedStepIndex]?.keyword} ${steps[selectedStepIndex]?.text}`;

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    onAdd(trimmed, selectedStepIndex);
    setBody('');
  }

  const sorted = [...comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="flex flex-col gap-3" data-testid="comments-panel">
      <div className="rounded-lg border bg-card p-3">
        <p className="mb-2 text-xs text-muted-foreground">
          Commenting on <span className="font-medium text-foreground">{targetLabel}</span>
        </p>
        <Textarea
          data-testid="comment-input"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a review comment…"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={submit} disabled={!body.trim()} data-testid="comment-submit">
            Add comment
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2" data-testid="comment-list">
        {sorted.length === 0 && (
          <p className="px-1 py-4 text-center text-sm text-muted-foreground">No comments yet.</p>
        )}
        {sorted.map((c) => (
          <div
            key={c.id}
            className={cn('rounded-lg border p-3 text-sm', c.resolved && 'opacity-60')}
            data-testid="comment-item"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.author}</span>
                <Badge variant="outline">
                  {c.stepIndex === null ? 'scenario' : `step ${c.stepIndex + 1}`}
                </Badge>
                {c.resolved && <Badge variant="success">resolved</Badge>}
              </div>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                title={c.resolved ? 'Reopen' : 'Resolve'}
                onClick={() => onResolve(c.id, !c.resolved)}
                data-testid="comment-resolve"
              >
                {c.resolved ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </button>
            </div>
            <p className="whitespace-pre-wrap">{c.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
