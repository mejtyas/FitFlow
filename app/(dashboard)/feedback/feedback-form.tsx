"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createFeedback } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_LEN = 4000;

export function FeedbackForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [length, setLength] = useState(0);
  const dismissedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dismissedRef.current) clearTimeout(dismissedRef.current);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (dismissedRef.current) {
      clearTimeout(dismissedRef.current);
      dismissedRef.current = null;
    }
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBanner(null);
    setPending(true);
    const res = await createFeedback(fd);
    setPending(false);
    if (res?.error) {
      setBanner({ type: "error", text: res.error });
      return;
    }
    form.reset();
    setLength(0);
    setBanner({ type: "success", text: "Saved. Your note appears in the list." });
    dismissedRef.current = setTimeout(() => setBanner(null), 4500);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {banner && (
        <div
          role={banner.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={cn(
            "flex gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors duration-200",
            banner.type === "error"
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100"
          )}
        >
          {banner.type === "error" ? (
            <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor="body" className="text-sm font-medium text-foreground">
            Message
          </Label>
          <span
            className={cn(
              "text-xs tabular-nums text-muted-foreground",
              length > MAX_LEN && "font-medium text-destructive"
            )}
          >
            {length.toLocaleString()}
            <span className="text-muted-foreground/80"> / {MAX_LEN.toLocaleString()}</span>
          </span>
        </div>
        <textarea
          id="body"
          name="body"
          required
          maxLength={MAX_LEN}
          rows={5}
          placeholder="Describe a bug, rough steps, or an improvement idea…"
          disabled={pending}
          onChange={(e) => setLength(e.target.value.length)}
          className={cn(
            "flex w-full min-h-[120px] resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-xs transition-colors duration-200 outline-none",
            "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "dark:bg-input/30"
          )}
        />
      </div>

      <Button
        type="submit"
        disabled={pending || length > MAX_LEN}
        className="w-full cursor-pointer rounded-lg font-semibold transition-colors duration-200 sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Sending…
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden />
            Send
          </>
        )}
      </Button>
    </form>
  );
}
