import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquareText } from "lucide-react";
import { FeedbackForm } from "./feedback-form";
import { FeedbackList } from "./feedback-list";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows, error } = await supabase
    .from("app_feedback")
    .select("id, author_email, body, solved, created_at")
    .order("created_at", { ascending: false });

  const items =
    error || !rows
      ? []
      : rows.map((r) => ({
          id: r.id,
          author_email: r.author_email,
          body: r.body,
          solved: r.solved,
          created_at: r.created_at,
        }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <MessageSquareText className="size-8 text-primary" />
          Feedback
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Notes for you and your teammate. Mark items solved when they&apos;re done.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive font-medium rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          Could not load feedback. If this is new, run the{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">create_app_feedback</code>{" "}
          migration in Supabase, then refresh.
        </p>
      )}

      <Card className="border-none shadow-xl shadow-primary/5 bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-lg font-bold">Add feedback</CardTitle>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            One field — keep it quick
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <FeedbackForm />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Notes
        </h2>
        <FeedbackList items={items} />
      </div>
    </div>
  );
}
