"use client";

import { deleteWorkout } from "@/app/actions/workouts";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteWorkoutForm({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteWorkout}
      onSubmit={(e) => {
        if (!confirm(`Delete “${label}”? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        className="cursor-pointer rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Delete routine: ${label}`}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
