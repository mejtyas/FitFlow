"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createFeedback(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const body = (formData.get("body") as string)?.trim();
  if (!body) return { error: "Please enter feedback." };

  const { error } = await supabase.from("app_feedback").insert({
    user_id: user.id,
    author_email: user.email ?? "unknown",
    body,
  });

  if (error) return { error: error.message };

  revalidatePath("/feedback");
  return {};
}

export async function setFeedbackSolved(id: string, solved: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("app_feedback")
    .update({
      solved,
      solved_at: solved ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/feedback");
  return {};
}
