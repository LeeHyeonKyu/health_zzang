import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { week_start, reason, media_r2_key } = body as {
    week_start: string;
    reason: string;
    media_r2_key?: string;
  };

  if (!week_start || !reason) {
    return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "주차와 사유를 입력해주세요" } }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: { code: "NO_PROFILE", message: "프로필이 없습니다" } }, { status: 400 });

  const { data: activeSeason } = await supabase.from("season").select("id").eq("crew_id", profile.crew_id).eq("is_active", true).single();
  if (!activeSeason) return NextResponse.json({ error: { code: "NO_ACTIVE_SEASON", message: "진행 중인 시즌이 없습니다" } }, { status: 400 });

  const { data, error } = await supabase.from("week_exemption").insert({
    user_id: user.id,
    season_id: activeSeason.id,
    week_start,
    reason,
    media_r2_key: media_r2_key ?? null,
  }).select().single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: { code: "ALREADY_EXEMPTED", message: "이미 해당 주차에 면제가 등록되어 있습니다" } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: "CREATE_FAILED", message: error.message } }, { status: 500 });
  }

  revalidatePath("/records");
  revalidatePath("/penalty");
  revalidatePath("/stats");
  revalidatePath("/workout/new");

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("week_start");
  if (!weekStart) return NextResponse.json({ error: { code: "MISSING_WEEK", message: "week_start가 필요합니다" } }, { status: 400 });

  const { error } = await supabase.from("week_exemption").delete().eq("user_id", user.id).eq("week_start", weekStart);
  if (error) return NextResponse.json({ error: { code: "DELETE_FAILED", message: error.message } }, { status: 500 });

  revalidatePath("/records");
  revalidatePath("/penalty");
  revalidatePath("/stats");
  revalidatePath("/workout/new");

  return NextResponse.json({ success: true });
}
