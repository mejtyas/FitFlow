import { createClient } from "@/lib/supabase/server";
import { ExerciseList } from "./exercise-list";
import { Dumbbell } from "lucide-react";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Dumbbell className="size-8 text-primary" />
          Exercises
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Manage your exercise library and create your own training movements.
        </p>
      </div>
      
      <ExerciseList exercises={exercises ?? []} />
    </div>
  );
}
