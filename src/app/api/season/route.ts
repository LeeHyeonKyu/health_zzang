import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: { code: "NO_PROFILE", message: "프로필이 없습니다" } }, { status: 400 });

  const { data: activeSeason } = await supabase.from("season").select("id").eq("crew_id", profile.crew_id).eq("is_active", true).single();
  if (activeSeason) return NextResponse.json({ error: { code: "ACTIVE_SEASON_EXISTS", message: "이미 진행 중인 시즌이 있습니다" } }, { status: 400 });

  const body = await request.json();
  const { name, start_date, default_target_count, default_penalty_per_miss, default_reward_per_extra } = body;

  if (!name || !start_date || !default_target_count || !default_penalty_per_miss) {
    return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "필수 항목을 입력해주세요" } }, { status: 400 });
  }

  const { data, error } = await supabase.from("season").insert({
    crew_id: profile.crew_id,
    name,
    start_date,
    default_target_count,
    default_penalty_per_miss,
    default_reward_per_extra: default_reward_per_extra ?? 0,
  }).select().single();

  if (error) return NextResponse.json({ error: { code: "CREATE_FAILED", message: error.message } }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { season_id, action } = body;

  if (action === "end") {
    const { error } = await supabase.from("season").update({
      is_active: false,
      end_date: body.end_date ?? new Date().toISOString().split("T")[0],
    }).eq("id", season_id);

    if (error) return NextResponse.json({ error: { code: "END_FAILED", message: error.message } }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "update_defaults") {
    const { default_target_count, default_penalty_per_miss, default_reward_per_extra } = body;
    const { error } = await supabase.from("season").update({
      default_target_count,
      default_penalty_per_miss,
      default_reward_per_extra: default_reward_per_extra ?? 0,
    }).eq("id", season_id);

    if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED", message: error.message } }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: { code: "UNKNOWN_ACTION", message: "알 수 없는 작업입니다" } }, { status: 400 });
}
