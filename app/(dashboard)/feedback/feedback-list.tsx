'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { setFeedbackSolved } from '@/app/actions/feedback';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquareText,
  UserRound,
} from 'lucide-react';

type FeedbackFilter = 'open' | 'solved' | 'all';

type FeedbackItem = {
  id: string;
  author_email: string;
  body: string;
  solved: boolean;
  created_at: string;
};

function formatAuthor(email: string) {
  const at = email.indexOf('@');
  if (at <= 0) {return email;}
  return email.slice(0, at);
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedbackFilter>('open');
  const [listError, setListError] = useState<string | null>(null);

  const openCount = useMemo(
    () => items.reduce((n, i) => n + (i.solved ? 0 : 1), 0),
    [items]
  );
  const solvedCount = useMemo(
    () => items.reduce((n, i) => n + (i.solved ? 1 : 0), 0),
    [items]
  );

  const filtered = useMemo(() => {
    if (filter === 'all') {return items;}
    if (filter === 'open') {return items.filter((i) => !i.solved);}
    return items.filter((i) => i.solved);
  }, [items, filter]);

  async function toggleSolved(id: string, next: boolean) {
    setListError(null);
    setBusyId(id);
    const res = await setFeedbackSolved(id, next);
    setBusyId(null);
    if (res?.error) {
      setListError(res.error);
      return;
    }
    router.refresh();
  }

  const filterTabs: { key: FeedbackFilter; label: string; count: number }[] = [
    { key: 'open', label: 'Open', count: openCount },
    { key: 'solved', label: 'Solved', count: solvedCount },
    { key: 'all', label: 'All', count: items.length },
  ];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
        <MessageSquareText
          className="size-10 text-muted-foreground"
          strokeWidth={1.5}
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Use the composer to add your first note.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-foreground">Inbox</h3>
        <div
          className="inline-flex rounded-lg border border-border bg-muted/50 p-1"
          role="tablist"
          aria-label="Filter by status"
        >
          {filterTabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => {
                setListError(null);
                setFilter(key);
              }}
              className={cn(
                'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200 sm:text-sm',
                filter === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums sm:text-xs',
                  filter === key ? 'bg-primary/10 text-primary' : 'bg-background/60 text-foreground'
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {listError && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {listError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === 'open'
              ? 'Nothing open — try Solved or All, or add a new note.'
              : filter === 'solved'
                ? 'Nothing marked solved yet.'
                : 'No notes match this filter.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {filtered.map((item) => {
            const busy = busyId === item.id;
            return (
              <li key={item.id}>
                <article
                  className={cn(
                    'flex gap-3 p-4 transition-colors duration-200 sm:gap-4 sm:p-4',
                    item.solved
                      ? 'bg-muted/20'
                      : 'bg-card hover:bg-muted/30'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      item.solved ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                    )}
                    aria-hidden
                  >
                    <UserRound className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {formatAuthor(item.author_email)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{item.author_email}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                        <time
                          dateTime={item.created_at}
                          className="text-[11px] font-medium tabular-nums text-muted-foreground sm:text-xs"
                        >
                          {formatWhen(item.created_at)}
                        </time>
                        {item.solved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" aria-hidden />
                            Solved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Circle className="size-3" aria-hidden />
                            Open
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {item.body}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant={item.solved ? 'outline' : 'default'}
                        size="sm"
                        disabled={busy}
                        onClick={() => toggleSolved(item.id, !item.solved)}
                        className="cursor-pointer rounded-lg font-semibold transition-colors duration-200"
                      >
                        {busy ? (
                          <>
                            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                            Updating…
                          </>
                        ) : item.solved ? (
                          'Mark open'
                        ) : (
                          'Mark solved'
                        )}
                      </Button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
