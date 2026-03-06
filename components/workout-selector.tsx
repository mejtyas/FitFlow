"use client";

import { useState, useRef, useEffect } from "react";
import { ListOrdered, ChevronDown, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { startWorkout } from "@/app/actions/workout-session";

interface WorkoutSelectorProps {
  workouts: { id: string; name: string }[] | null;
}

export function WorkoutSelector({ workouts }: WorkoutSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStart = async () => {
    if (selectedWorkout) {
      try {
        setLoading(true);
        const result = await startWorkout(selectedWorkout.id);
        
        if ("error" in result) {
          console.error(result.error);
          return;
        }

        router.push(`/dashboard/active?session=${result.sessionId}`);
        router.refresh();
      } catch (error) {
        console.error("Failed to start workout:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 w-full" ref={containerRef}>
      <div className="relative flex-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full h-12 pl-10 pr-10 rounded-2xl bg-background border border-border transition-all font-bold text-sm text-left flex items-center relative",
            isOpen ? "ring-2 ring-primary/20 border-primary/50 shadow-lg shadow-primary/5" : "hover:border-primary/30"
          )}
        >
          <ListOrdered className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <span className={cn("truncate", !selectedWorkout && "text-muted-foreground font-medium")}>
            {selectedWorkout ? selectedWorkout.name : "Choose Routine..."}
          </span>
          <ChevronDown className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 z-[100] bg-card border border-border rounded-2xl shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-200">
            <div className="max-h-[300px] overflow-y-auto p-1.5 custom-scrollbar">
              {workouts && workouts.length > 0 ? (
                workouts.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setSelectedWorkout(w);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-colors mb-0.5 last:mb-0",
                      selectedWorkout?.id === w.id 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="truncate pr-2">{w.name}</span>
                    {selectedWorkout?.id === w.id && <Check className="size-4 shrink-0" />}
                  </button>
                ))
              ) : (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-muted-foreground font-medium">No routines found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Button 
        onClick={handleStart}
        disabled={!selectedWorkout || loading}
        variant="secondary" 
        className="h-12 rounded-2xl px-6 font-bold shadow-sm shrink-0 group disabled:opacity-50 transition-all active:scale-95"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Start
            <ChevronDown className="ml-1 size-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>
    </div>
  );
}
