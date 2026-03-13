import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutForm } from "../../workout-form";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, workout_exercises(id, exercise_id, order_index, default_sets)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!workout) redirect("/workouts");

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const workoutExercises = (workout.workout_exercises as { id: string; exercise_id: string; order_index: number; default_sets: number }[] ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((we) => ({
      exercise_id: we.exercise_id,
      default_sets: we.default_sets,
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit workout</h1>
      <WorkoutForm
        exercises={exercises ?? []}
        workoutId={id}
        initialName={workout.name}
        initialExercises={workoutExercises}
      />
    </div>
  );
}
