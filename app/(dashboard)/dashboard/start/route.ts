import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createWorkoutSession } from "@/lib/create-workout-session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workoutId = searchParams.get("freestyle") ? null : searchParams.get("workout") ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const result = await createWorkoutSession(supabase, user.id, workoutId);

  if ("error" in result) {
    return NextResponse.redirect(
      new URL("/dashboard?error=" + encodeURIComponent(result.error), request.url)
    );
  }

  revalidatePath("/dashboard");
  const url = new URL("/dashboard/active", request.url);
  url.searchParams.set("session", result.sessionId);
  return NextResponse.redirect(url);
}
