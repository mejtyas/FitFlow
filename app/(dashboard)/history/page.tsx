import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "./export-buttons";
import { ClearHistoryButton } from "./clear-history-button";
import { HistoryItem } from "./history-item";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  History as HistoryIcon,
  Timer,
  Trophy,
} from "lucide-react";

const PAGE_SIZE = 10;

function formatDuration(started: string, ended: string | null): string {
  if (!ended) return "—";
  const a = new Date(started).getTime();
  const b = new Date(ended).getTime();
  const ms = b - a;
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function workoutNameFromRelation(workouts: unknown): string {
  if (!workouts) return "Session";
  if (Array.isArray(workouts)) {
    const n = (workouts[0] as { name?: string } | undefined)?.name;
    return n?.trim() || "Session";
  }
  if (typeof workouts === "object" && workouts !== null && "name" in workouts) {
    const n = (workouts as { name?: string }).name;
    return n?.trim() || "Session";
  }
  return "Session";
}

function formatTrainTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: sessions }, { count: totalSessions }, { data: statsData }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, started_at, ended_at, workout_id, workouts(name)")
      .eq("user_id", user.id)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .range(from, to),
    supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("ended_at", "is", null),
    supabase
      .from("workout_sessions")
      .select("started_at, ended_at")
      .eq("user_id", user.id)
      .not("ended_at", "is", null),
  ]);

  const totalCount = totalSessions ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  let totalMinutes = 0;
  statsData?.forEach((s) => {
    if (s.ended_at) {
      totalMinutes += Math.floor(
        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
      );
    }
  });

  const avgMinutes =
    totalCount > 0 ? Math.round(totalMinutes / totalCount) : 0;

  const groupedSessions: Record<string, NonNullable<typeof sessions>> = {};
  sessions?.forEach((s) => {
    const key = getMonthYear(s.started_at);
    if (!groupedSessions[key]) groupedSessions[key] = [];
    groupedSessions[key]!.push(s);
  });

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 space-y-6 md:space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight md:text-3xl">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HistoryIcon className="size-[1.35rem]" aria-hidden />
            </span>
            History
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Completed workouts, newest first. Export or clear from the toolbar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <ClearHistoryButton disabled={totalCount === 0} />
          <ExportButtons disabled={totalCount === 0} />
        </div>
      </header>

      {totalCount > 0 && (
        <section aria-label="History summary">
          <ul className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <li>
              <div className="rounded-xl border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4">
                <div className="flex items-center justify-between gap-2">
                  <Trophy className="size-4 text-primary sm:size-5" aria-hidden />
                  <span className="text-lg font-semibold tabular-nums sm:text-xl md:text-2xl">
                    {totalCount}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Sessions
                </p>
              </div>
            </li>
            <li>
              <div className="rounded-xl border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4">
                <div className="flex items-center justify-between gap-2">
                  <Clock className="size-4 text-primary sm:size-5" aria-hidden />
                  <span className="text-lg font-semibold tabular-nums sm:text-xl md:text-2xl">
                    {formatTrainTime(totalMinutes)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Total time
                </p>
              </div>
            </li>
            <li>
              <div className="rounded-xl border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4">
                <div className="flex items-center justify-between gap-2">
                  <Timer className="size-4 text-muted-foreground sm:size-5" aria-hidden />
                  <span className="text-lg font-semibold tabular-nums sm:text-xl md:text-2xl">
                    {totalCount > 0 ? formatTrainTime(avgMinutes) : "—"}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                  Avg session
                </p>
              </div>
            </li>
          </ul>
        </section>
      )}

      {!sessions || sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <HistoryIcon className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">No history yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Finish a workout and it will show up here with duration and details.
            </p>
          </div>
          <Button asChild className="cursor-pointer rounded-lg font-semibold">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSessions).map(([monthYear, monthSessions]) => (
            <section key={monthYear} aria-labelledby={`history-${monthYear.replace(/\s+/g, "-")}`}>
              <h2
                id={`history-${monthYear.replace(/\s+/g, "-")}`}
                className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
                {monthYear}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                {monthSessions!.map((s) => (
                  <HistoryItem
                    key={s.id}
                    sessionId={s.id}
                    workoutName={workoutNameFromRelation(s.workouts)}
                    dateStr={formatDate(s.started_at)}
                    durationStr={formatDuration(s.started_at, s.ended_at)}
                  />
                ))}
              </ul>
            </section>
          ))}

          {totalPages > 1 && (
            <nav
              className="flex flex-wrap items-center justify-center gap-2 pt-2"
              aria-label="Pagination"
            >
              {page <= 1 ? (
                <Button variant="outline" size="sm" className="gap-1.5" disabled>
                  <ChevronLeft className="size-4" aria-hidden />
                  Previous
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="cursor-pointer gap-1.5" asChild>
                  <Link href={`/history?page=${page - 1}`} scroll>
                    <ChevronLeft className="size-4" aria-hidden />
                    Previous
                  </Link>
                </Button>
              )}
              <span className="px-3 text-sm tabular-nums text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page >= totalPages ? (
                <Button variant="outline" size="sm" className="gap-1.5" disabled>
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="cursor-pointer gap-1.5" asChild>
                  <Link href={`/history?page=${page + 1}`} scroll>
                    Next
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
