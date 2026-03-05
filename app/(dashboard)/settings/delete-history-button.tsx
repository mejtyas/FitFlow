"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllWorkoutHistory } from "@/app/actions/workout-session";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

export function DeleteHistoryButton() {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteAllWorkoutHistory();
      setConfirmOpen(false);
      router.refresh();
      alert("Workout history deleted successfully.");
    } catch (error) {
      console.error("Failed to delete history:", error);
      alert("An error occurred while deleting history.");
    } finally {
      setLoading(false);
    }
  };

  if (!confirmOpen) {
    return (
      <Button
        variant="destructive"
        className="w-full sm:w-auto font-bold rounded-xl shadow-lg shadow-destructive/20 h-12"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="size-4 mr-2" />
        Delete All History
      </Button>
    );
  }

  return (
    <div className="space-y-4 p-6 border-2 border-destructive/20 bg-destructive/5 rounded-2xl animate-in zoom-in-95 duration-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-6 text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-black text-destructive uppercase tracking-widest text-xs">Danger Zone</p>
          <p className="text-sm font-bold text-foreground">
            Are you absolutely sure? This will permanently delete all your workout sessions, sets, and exercise data. This action cannot be undone.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          variant="destructive"
          className="flex-1 font-bold rounded-xl h-12"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="size-4 mr-2" />
          )}
          Yes, Delete Everything
        </Button>
        <Button
          variant="ghost"
          className="flex-1 font-bold rounded-xl h-12"
          onClick={() => setConfirmOpen(false)}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
