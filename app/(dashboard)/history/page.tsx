import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportButtons } from "./export-buttons";
import { ClearHistoryButton } from "./clear-history-button";
import { HistoryItem } from "./history-item";
import { History as HistoryIcon, TrendingUp, Clock, Trophy, ChevronLeft, ChevronRight } from "lucide-react";

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
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  // Run paginated query and count query in parallel
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

  // Calculate training time from stats query
  let totalMinutes = 0;
  statsData?.forEach((s) => {
    if (s.ended_at) {
      totalMinutes += Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
    }
  });
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Group by month/year
  const groupedSessions: Record<string, typeof sessions> = {};
  sessions?.forEach((s) => {
    const key = getMonthYear(s.started_at);
    if (!groupedSessions[key]) groupedSessions[key] = [];
    groupedSessions[key].push(s);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <HistoryIcon className="size-8 text-primary" />
            History
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Review your past training sessions and track your progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClearHistoryButton />
          <ExportButtons />
        </div>
      </div>

      {/* History Stats */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="bg-primary/5 border-primary/10 shadow-none">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="size-3 text-primary" />
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-2xl font-black">{totalCount}</span>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/10 shadow-none">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="size-3 text-primary" />
                Training Time
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <span className="text-2xl font-black">{totalHours}h {remainingMinutes}m</span>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/10 shadow-none">
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <TrendingUp className="size-3 text-primary" />
                Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 text-2xl font-black">
              +12%
            </CardContent>
          </Card>
        </div>
      )}

      {(!sessions || sessions.length === 0) ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <HistoryIcon className="size-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold">No history yet</p>
              <p className="text-muted-foreground max-w-xs">
                Once you complete a workout, it will appear here for you to track.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20">
              <Link href="/dashboard">Start first workout</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedSessions).map(([monthYear, monthSessions]) => (
            <div key={monthYear} className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                <span className="size-1.5 rounded-full bg-primary" />
                {monthYear}
              </h2>
              <div className="grid gap-3">
                {monthSessions!.map((s) => (
                  <HistoryItem
                    key={s.id}
                    sessionId={s.id}
                    workoutName={(Array.isArray(s.workouts) ? (s.workouts as { name: string }[])[0]?.name : (s.workouts as { name: string } | null)?.name) ?? "Unnamed Session"}
                    dateStr={formatDate(s.started_at)}
                    durationStr={formatDuration(s.started_at, s.ended_at)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                asChild
                disabled={page <= 1}
              >
                <Link
                  href={page <= 1 ? "/history" : `/history?page=${page - 1}`}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                asChild
                disabled={page >= totalPages}
              >
                <Link
                  href={page >= totalPages ? `/history?page=${totalPages}` : `/history?page=${page + 1}`}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
