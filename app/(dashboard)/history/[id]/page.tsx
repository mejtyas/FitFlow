import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditSessionTimesForm } from "./edit-session-times-form";

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at, workout_id, workouts(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!session || !session.ended_at) notFound();

  const { data: sessionExercises } = await supabase
    .from("session_exercises")
    .select(
      "id, order_index, exercise_id, exercises(name), session_sets(set_index, kg, reps)"
    )
    .eq("workout_session_id", id)
    .order("order_index");

  const w = session.workouts as { name: string } | { name: string }[] | null;
  const workoutName = (Array.isArray(w) ? w[0]?.name : w?.name) ?? "Unnamed Session";
  const durationMs =
    new Date(session.ended_at).getTime() - new Date(session.started_at).getTime();
  const totalSeconds = Math.floor(durationMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history">← History</Link>
          </Button>
          <h1 className="mt-2 text-xl font-semibold">{workoutName}</h1>
          <p className="text-muted-foreground">
            {new Date(session.started_at).toLocaleString()} · {durationStr}
          </p>
        </div>
      </div>

      <EditSessionTimesForm
        key={`${session.started_at}-${session.ended_at}`}
        sessionId={session.id}
        startedAtIso={session.started_at}
        endedAtIso={session.ended_at}
      />

      <div className="space-y-4">
        {(sessionExercises ?? []).map((se) => {
          const sets = ((se.session_sets as { set_index: number; kg: number | null; reps: number | null }[]) ?? []).sort(
            (a, b) => a.set_index - b.set_index
          );
          const ex = se.exercises as { name: string } | { name: string }[] | null;
          const name = (Array.isArray(ex) ? ex[0]?.name : ex?.name) ?? "?";
          return (
            <Card key={se.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {sets.map((set, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">Set {i + 1}:</span>
                      <span>
                        {set.kg != null ? `${set.kg} kg` : "—"} ×{" "}
                        {set.reps != null ? set.reps : "—"} reps
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
