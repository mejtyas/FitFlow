"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFeedback } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function FeedbackForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    const res = await createFeedback(fd);
    setPending(false);
    if (res?.error) {
      alert(res.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="body" className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Your note
        </Label>
        <textarea
          id="body"
          name="body"
          required
          rows={4}
          placeholder="Bug, idea, tweak…"
          disabled={pending}
          className={cn(
            "flex w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none",
            "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "dark:bg-input/30"
          )}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full font-bold rounded-xl h-11 sm:w-auto">
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Send feedback
      </Button>
    </form>
  );
}
