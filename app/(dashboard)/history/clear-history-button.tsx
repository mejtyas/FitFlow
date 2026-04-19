"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteCompletedWorkoutHistory } from "@/app/actions/workout-session";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function ClearHistoryButton({ disabled }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear your workout history? This will delete all completed sessions and cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      await deleteCompletedWorkoutHistory();
      router.refresh();
    } catch (error) {
      console.error("Failed to clear history:", error);
      alert("An error occurred while clearing history.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="cursor-pointer rounded-lg font-medium text-muted-foreground transition-colors duration-200 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-40"
      onClick={handleClear}
      disabled={loading || disabled}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
      <span>Clear History</span>
    </Button>
  );
}
