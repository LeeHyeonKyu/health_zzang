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

    // 기본 규칙 변경 전, 지난 주 중 override가 없는 주를 현재 default로 스냅샷
    const { data: season } = await supabase.from("season").select("*").eq("id", season_id).single();
    if (season) {
      const today = new Date();
      const currentWeekStart = getMonday(today);
      const seasonStart = new Date(season.start_date + "T00:00:00");

      const pastWeeks: string[] = [];
      const d = new Date(seasonStart);
      const day = d.getDay();
      d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
      while (d < currentWeekStart) {
        pastWeeks.push(d.toISOString().split("T")[0]);
        d.setDate(d.getDate() + 7);
      }

      if (pastWeeks.length > 0) {
        const { data: existingOverrides } = await supabase
          .from("weekly_rule")
          .select("week_start")
          .eq("season_id", season_id)
          .in("week_start", pastWeeks);

        const existingWeeks = new Set((existingOverrides ?? []).map((r) => r.week_start));
        const toSnapshot = pastWeeks.filter((w) => !existingWeeks.has(w));

        if (toSnapshot.length > 0) {
          await supabase.from("weekly_rule").insert(
            toSnapshot.map((week_start) => ({
              season_id,
              week_start,
              target_count: season.default_target_count,
              penalty_per_miss: season.default_penalty_per_miss,
              reward_per_extra: season.default_reward_per_extra,
            }))
          );
        }
      }
    }

    const { error } = await supabase.from("season").update({
      default_target_count,
      default_penalty_per_miss,
      default_reward_per_extra: default_reward_per_extra ?? 0,
    }).eq("id", season_id);

    if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED", message: error.message } }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "update_defaults_with_migration") {
    const { default_target_count, default_penalty_per_miss, default_reward_per_extra } = body;

    // 이전 주 override를 모두 삭제 → 새 default가 소급 적용
    await supabase.from("weekly_rule").delete().eq("season_id", season_id);

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

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
