import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const start = performance.now();
  const supabase = await createClient();

  const timings: Record<string, number> = {};

  let t = performance.now();
  await supabase.auth.getSession();
  timings.auth_session_ms = Math.round(performance.now() - t);

  t = performance.now();
  await supabase.from("crew").select("id").limit(1);
  timings.db_query_ms = Math.round(performance.now() - t);

  t = performance.now();
  await supabase.from("profiles").select("id").limit(1);
  timings.db_profiles_ms = Math.round(performance.now() - t);

  timings.total_ms = Math.round(performance.now() - start);

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    timings,
  });
}
