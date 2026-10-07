import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { season_id, week_start, target_count, penalty_per_miss, reward_per_extra, progressive_penalty, progressive_step } = body;

  if (!season_id || !week_start || !target_count || !penalty_per_miss) {
    return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "필수 항목을 입력해주세요" } }, { status: 400 });
  }

  const upsertData: Record<string, unknown> = {
    season_id,
    week_start,
    target_count,
    penalty_per_miss,
    reward_per_extra: reward_per_extra ?? 0,
  };
  if (progressive_penalty !== undefined) upsertData.progressive_penalty = progressive_penalty;
  if (progressive_step !== undefined) upsertData.progressive_step = progressive_step;

  const { data, error } = await supabase.from("weekly_rule").upsert(upsertData, { onConflict: "season_id,week_start" }).select().single();

  if (error) return NextResponse.json({ error: { code: "UPSERT_FAILED", message: error.message } }, { status: 500 });
  return NextResponse.json(data);
}
