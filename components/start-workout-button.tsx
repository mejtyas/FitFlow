"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startWorkout } from "@/app/actions/workout-session";
import { ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StartWorkoutButtonProps {
  workoutId: string;
  className?: string;
}

export function StartWorkoutButton({ workoutId, className }: StartWorkoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async () => {
    try {
      setLoading(true);
      const result = await startWorkout(workoutId);
      
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
  };

  return (
    <Button 
      onClick={handleStart} 
      disabled={loading}
      className={cn("flex-1 font-bold rounded-lg group/start shadow-sm shadow-primary/10", className)}
    >
      {loading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <>
          Start
          <ChevronRight className="ml-1 size-4 group-hover/start:translate-x-1 transition-transform" />
        </>
      )}
    </Button>
  );
}
