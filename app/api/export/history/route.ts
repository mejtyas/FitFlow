import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import Papa from "papaparse";

type HistoryXlsxRow = {
  date: string;
  workout_name: string;
  duration_minutes: string;
  exercise_name: string;
  set_index: string | number;
  kg: string | number | null;
  reps: string | number | null;
};

async function historyRowsToXlsxBlob(rows: HistoryXlsxRow[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("History");
  sheet.columns = [
    { header: "date", key: "date", width: 14 },
    { header: "workout_name", key: "workout_name", width: 28 },
    { header: "duration_minutes", key: "duration_minutes", width: 18 },
    { header: "exercise_name", key: "exercise_name", width: 28 },
    { header: "set_index", key: "set_index", width: 12 },
    { header: "kg", key: "kg", width: 10 },
    { header: "reps", key: "reps", width: 10 },
  ];
  rows.forEach((row) => sheet.addRow(row));
  const buf = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buf);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at, workout_id, workouts(name)")
    .eq("user_id", user.id)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false });

  if (!sessions?.length) {
    const empty = [
      {
        date: "",
        workout_name: "",
        duration_minutes: "",
        exercise_name: "",
        set_index: "",
        kg: "",
        reps: "",
      },
    ];
    if (format === "csv") {
      const csv = Papa.unparse(empty);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="fitflow-history.csv"',
        },
      });
    }
    const body = await historyRowsToXlsxBlob(empty);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="fitflow-history.xlsx"',
      },
    });
  }

  const rows: {
    date: string;
    workout_name: string;
    duration_minutes: string;
    exercise_name: string;
    set_index: number;
    kg: number | null;
    reps: number | null;
  }[] = [];

  for (const session of sessions) {
    const w = session.workouts as { name: string } | { name: string }[] | null;
    const workoutName = (Array.isArray(w) ? w[0]?.name : w?.name) ?? "Unnamed Session";
    const started = new Date(session.started_at).getTime();
    const ended = session.ended_at ? new Date(session.ended_at).getTime() : started;
    const durationMin = ((ended - started) / 60000).toFixed(1);
    const dateStr = new Date(session.started_at).toLocaleDateString();

    const { data: sessionExercises } = await supabase
      .from("session_exercises")
      .select("id, exercises(name), session_sets(set_index, kg, reps)")
      .eq("workout_session_id", session.id)
      .order("order_index");

    for (const se of sessionExercises ?? []) {
      const ex = se.exercises as { name: string } | { name: string }[] | null;
      const name = (Array.isArray(ex) ? ex[0]?.name : ex?.name) ?? "?";
      const sets = (se.session_sets as { set_index: number; kg: number | null; reps: number | null }[]) ?? [];
      for (const set of sets) {
        rows.push({
          date: dateStr,
          workout_name: workoutName,
          duration_minutes: durationMin,
          exercise_name: name,
          set_index: set.set_index + 1,
          kg: set.kg,
          reps: set.reps,
        });
      }
    }
  }

  if (format === "csv") {
    const csv = Papa.unparse(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fitflow-history.csv"',
      },
    });
  }

  const body = await historyRowsToXlsxBlob(
    rows.map((r) => ({
      ...r,
      kg: r.kg ?? "",
      reps: r.reps ?? "",
    }))
  );
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="fitflow-history.xlsx"',
    },
  });
}
