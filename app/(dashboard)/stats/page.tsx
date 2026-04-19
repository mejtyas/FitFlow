import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dumbbell, Clock, Calendar } from "lucide-react";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count: totalWorkouts } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at")
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  let totalMinutes = 0;
  for (const s of sessions ?? []) {
    if (s.ended_at) {
      totalMinutes +=
        (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) /
        60000;
    }
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const remainderMins = Math.round(totalMinutes % 60);
  const totalTimeStr =
    totalHours > 0 ? `${totalHours}h ${remainderMins}m` : `${Math.round(totalMinutes)}m`;

  const ids = (sessions ?? []).map((s) => s.id);

  let countByExercise: Record<string, { name: string; count: number }> = {};
  if (ids.length > 0) {
    const { data: exerciseRows } = await supabase
      .from("session_exercises")
      .select("exercise_id, exercises(name)")
      .in("workout_session_id", ids);
    for (const row of exerciseRows ?? []) {
      const ex = row.exercises as { name: string } | { name: string }[] | null;
      const name = (Array.isArray(ex) ? ex[0]?.name : ex?.name) ?? "?";
      const id = row.exercise_id;
      if (!countByExercise[id]) countByExercise[id] = { name, count: 0 };
      countByExercise[id].count++;
    }
  }
  const topExercises = Object.entries(countByExercise)
    .map(([_, v]) => v)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Stats</h1>
      <p className="text-muted-foreground">
        Summary of your workout activity.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total workouts
            </CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalWorkouts ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total time
            </CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTimeStr}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Most used exercises
          </CardTitle>
          <Dumbbell className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {topExercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Complete some workouts to see your top exercises.
            </p>
          ) : (
            <ul className="space-y-2">
              {topExercises.map((e, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>{e.name}</span>
                  <span className="text-muted-foreground">{e.count} sessions</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
