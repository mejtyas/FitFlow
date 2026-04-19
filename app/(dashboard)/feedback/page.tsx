import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, CircleDot, MessageSquareText } from "lucide-react";
import { FeedbackForm } from "./feedback-form";
import { FeedbackList } from "./feedback-list";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows, error } = await supabase
    .from("app_feedback")
    .select("id, author_email, body, solved, created_at")
    .order("created_at", { ascending: false });

  const items =
    error || !rows
      ? []
      : rows.map((r) => ({
          id: r.id,
          author_email: r.author_email,
          body: r.body,
          solved: r.solved,
          created_at: r.created_at,
        }));

  const openCount = items.reduce((n, i) => n + (i.solved ? 0 : 1), 0);
  const solvedCount = items.reduce((n, i) => n + (i.solved ? 1 : 0), 0);

  return (
    <div
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 space-y-6"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight md:text-3xl">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquareText className="size-[1.35rem]" aria-hidden />
            </span>
            Feedback
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Share bugs and ideas. Track what&apos;s open and mark items done when you ship fixes.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 sm:justify-end">
          <div
            className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm"
            aria-label={`${openCount} open`}
          >
            <CircleDot className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="leading-tight">
              <span className="font-medium tabular-nums">{openCount}</span>
              <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Open
              </span>
            </div>
          </div>
          <div
            className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm"
            aria-label={`${solvedCount} solved`}
          >
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <div className="leading-tight">
              <span className="font-medium tabular-nums">{solvedCount}</span>
              <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Solved
              </span>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Could not load feedback. If this table is new, run the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            create_app_feedback
          </code>{" "}
          migration in Supabase, then refresh.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start xl:grid-cols-[minmax(0,24rem)_1fr]">
        <Card className="border bg-card shadow-sm lg:sticky lg:top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">New note</CardTitle>
            <CardDescription className="text-sm">
              Short and specific helps you act on it faster.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <FeedbackForm />
          </CardContent>
        </Card>

        <section
          aria-labelledby="feedback-notes-heading"
          className="min-h-0 lg:max-h-[min(36rem,calc(100vh-11rem))] lg:overflow-y-auto lg:rounded-xl lg:border lg:border-border lg:bg-muted/20 lg:p-1 lg:shadow-inner"
        >
          <h2 id="feedback-notes-heading" className="sr-only">
            Notes list
          </h2>
          <div className="lg:p-3 lg:pt-2">
            <FeedbackList items={items} />
          </div>
        </section>
      </div>
    </div>
  );
}
