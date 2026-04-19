"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setFeedbackSolved } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2, User } from "lucide-react";

export type FeedbackFilter = "open" | "solved" | "all";

export type FeedbackItem = {
  id: string;
  author_email: string;
  body: string;
  solved: boolean;
  created_at: string;
};

function formatAuthor(email: string) {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return email.slice(0, at);
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function FeedbackList({ items }: { items: FeedbackItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedbackFilter>("open");

  const openCount = useMemo(
    () => items.reduce((n, i) => n + (i.solved ? 0 : 1), 0),
    [items]
  );
  const solvedCount = useMemo(
    () => items.reduce((n, i) => n + (i.solved ? 1 : 0), 0),
    [items]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "open") return items.filter((i) => !i.solved);
    return items.filter((i) => i.solved);
  }, [items, filter]);

  async function toggleSolved(id: string, next: boolean) {
    setBusyId(id);
    const res = await setFeedbackSolved(id, next);
    setBusyId(null);
    if (res?.error) {
      alert(res.error);
      return;
    }
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground font-medium text-center py-12 border border-dashed rounded-2xl">
        No notes yet — add something above.
      </p>
    );
  }

  const filterTabs: { key: FeedbackFilter; label: string; count: number }[] = [
    { key: "open", label: "Open", count: openCount },
    { key: "solved", label: "Solved", count: solvedCount },
    { key: "all", label: "All", count: items.length },
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter by status"
      >
        {filterTabs.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition-colors",
              filter === key
                ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums",
                filter === key
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background/80 text-foreground"
              )}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground font-medium text-center py-12 border border-dashed rounded-2xl">
          {filter === "open"
            ? "Nothing open — switch to Solved or All, or add a note above."
            : filter === "solved"
              ? "Nothing solved yet."
              : "No notes to show."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((item) => {
            const busy = busyId === item.id;
            return (
              <li key={item.id}>
                <Card
                  className={
                    item.solved
                      ? "border-muted bg-muted/20 opacity-90"
                      : "border-none shadow-xl shadow-primary/5 bg-gradient-to-br from-card to-muted/20"
                  }
                >
                  <CardHeader className="pb-2 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <User className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <CardTitle className="text-base font-bold truncate">
                            {formatAuthor(item.author_email)}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground font-medium truncate">
                            {item.author_email}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {formatWhen(item.created_at)}
                        </span>
                        {item.solved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
                            <CheckCircle2 className="size-3" />
                            Solved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <Circle className="size-3" />
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {item.body}
                    </p>
                    <Button
                      type="button"
                      variant={item.solved ? "outline" : "default"}
                      size="sm"
                      className="rounded-xl font-bold"
                      disabled={busy}
                      onClick={() => toggleSolved(item.id, !item.solved)}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : item.solved ? (
                        "Mark open"
                      ) : (
                        "Mark solved"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
