import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Plus, ListOrdered, Trash2, Edit2, ChevronRight, Dumbbell, Calendar } from "lucide-react";
import { deleteWorkout } from "@/app/actions/workouts";

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workouts } = await supabase
    .from("workouts")
    .select(
      "id, name, created_at, workout_exercises(id, order_index, default_sets, exercises(name))"
    )
    .eq("user_id", user.id)
    .order("name");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <ListOrdered className="size-8 text-primary" />
            Workouts
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Build and manage your custom training routines.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
          <Link href="/workouts/new">
            <Plus className="mr-2 size-5" /> Create Routine
          </Link>
        </Button>
      </div>

      {(!workouts || workouts.length === 0) ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <ListOrdered className="size-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold">No routines yet</p>
              <p className="text-muted-foreground max-w-xs">
                Create a routine to quickly start your favorite workouts without having to add exercises manually.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20">
              <Link href="/workouts/new">Create first routine</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {workouts.map((w) => {
            const exerciseCount = Array.isArray(w.workout_exercises) ? w.workout_exercises.length : 0;
            const exercises = Array.isArray(w.workout_exercises) 
              ? w.workout_exercises.slice(0, 3).map((we: any) => we.exercises?.name).join(", ")
              : "";

            return (
              <Card key={w.id} className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-md flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                        {w.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5 uppercase text-[10px] font-bold tracking-widest">
                        <Dumbbell className="size-3" />
                        {exerciseCount} Exercises
                      </CardDescription>
                    </div>
                    <form action={deleteWorkout} className="shrink-0">
                      <input type="hidden" name="id" value={w.id} />
                      <Button 
                        type="submit" 
                        variant="ghost" 
                        size="icon" 
                        className="size-8 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Delete workout"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {exercises}{exerciseCount > 3 ? "..." : ""}
                  </p>
                </CardContent>
                <CardFooter className="pt-0 border-t bg-muted/20 mt-auto flex gap-2 p-3">
                  <Button asChild variant="ghost" className="flex-1 font-bold rounded-lg group/edit">
                    <Link href={`/workouts/${w.id}/edit`}>
                      <Edit2 className="mr-2 size-4 group-hover/edit:text-primary transition-colors" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild className="flex-1 font-bold rounded-lg group/start shadow-sm shadow-primary/10">
                    <Link href={`/dashboard/start?workout=${w.id}`}>
                      Start
                      <ChevronRight className="ml-1 size-4 group-hover/start:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
