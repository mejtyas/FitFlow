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
  size?: "default" | "sm";
}

export function StartWorkoutButton({
  workoutId,
  className,
  size = "default",
}: StartWorkoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async () => {
    try {
      setLoading(true);
      const result = await startWorkout(workoutId);

      if ("error" in result && result.error) {
        if (
          result.error === "active_session_exists" &&
          "existingSessionId" in result &&
          typeof result.existingSessionId === "string"
        ) {
          const resume = window.confirm(
            "You already have an active workout. Open it instead of starting a new one?"
          );
          if (resume) {
            router.push(`/dashboard/active?session=${result.existingSessionId}`);
            router.refresh();
          }
          return;
        }
        console.error(result.error);
        return;
      }

      if ("sessionId" in result && result.sessionId) {
        router.push(`/dashboard/active?session=${result.sessionId}`);
        router.refresh();
      }
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
      size={size}
      className={cn(
        "cursor-pointer rounded-lg font-semibold transition-colors duration-200 group/start shadow-sm shadow-primary/10",
        size === "default" && "flex-1",
        className
      )}
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
