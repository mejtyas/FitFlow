"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteWorkoutSession } from "@/app/actions/workout-session";
import { Trash2, Calendar, Clock, ChevronRight, Activity } from "lucide-react";

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

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this workout? This cannot be undone.")) return;
    const result = await deleteWorkoutSession(sessionId);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
      <Link href={`/history/${sessionId}`} className="block">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-inner shrink-0">
            <Activity className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors truncate">
              {workoutName}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Calendar className="size-3" />
                {dateStr}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <Clock className="size-3" />
                {durationStr}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Delete workout"
              onClick={handleDelete}
              className="size-9 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 className="size-4" />
            </Button>
            <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
