'use client';

import { useTransition } from 'react';
import { deleteWorkout } from '@/app/actions/workouts';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

export function DeleteWorkoutForm({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm(`Delete “${label}”? This cannot be undone.`)) {
          return;
        }
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await deleteWorkout(fd);
          if (result?.error) {
            window.alert(result.error);
          }
        });
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        className="cursor-pointer rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        aria-label={`Delete routine: ${label}`}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
