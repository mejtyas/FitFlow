"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteWorkoutSession } from "@/app/actions/workout-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock,
  Loader2,
  Trash2,
} from "lucide-react";

type HistoryItemProps = {
  sessionId: string;
  workoutName: string;
  dateStr: string;
  durationStr: string;
};

export function HistoryItem({
  sessionId,
  workoutName,
  dateStr,
  durationStr,
}: HistoryItemProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    if (!confirm("Delete this workout? This cannot be undone.")) return;
    setBusy(true);
    const result = await deleteWorkoutSession(sessionId);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li>
      <div className="group flex items-stretch gap-0 transition-colors duration-200 hover:bg-muted/40">
        <Link
          href={`/history/${sessionId}`}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4"
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary"
            aria-hidden
          >
            <Activity className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground group-hover:text-primary transition-colors duration-200">
              {workoutName}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5 shrink-0" aria-hidden />
                {dateStr}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5 shrink-0" aria-hidden />
                {durationStr}
              </span>
            </div>
          </div>
          <ChevronRight
            className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
            aria-hidden
          />
        </Link>

        <div className="flex shrink-0 items-center border-l border-border pr-3 pl-2 sm:pr-4">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete workout: ${workoutName}`}
            disabled={busy}
            onClick={handleDelete}
            className="cursor-pointer rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className={cn(
            "flex items-center gap-2 border-t border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive sm:px-5"
          )}
        >
          <AlertCircle className="size-3.5 shrink-0" aria-hidden />
          {error}
        </div>
      )}
    </li>
  );
}
