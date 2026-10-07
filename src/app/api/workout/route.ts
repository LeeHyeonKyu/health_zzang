import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { date, note, media } = body as {
    date: string;
    note?: string;
    media: { r2_key: string; type: "photo" | "video"; size_bytes: number }[];
  };

  if (!date) return NextResponse.json({ error: { code: "MISSING_DATE", message: "날짜를 선택해주세요" } }, { status: 400 });
  if (!media || media.length === 0) return NextResponse.json({ error: { code: "NO_MEDIA", message: "사진을 1장 이상 올려주세요" } }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];
  if (date > today) return NextResponse.json({ error: { code: "FUTURE_DATE", message: "미래 날짜는 선택할 수 없습니다" } }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: { code: "NO_PROFILE", message: "프로필이 없습니다" } }, { status: 400 });

  const { data: activeSeason } = await supabase.from("season").select("id").eq("crew_id", profile.crew_id).eq("is_active", true).single();
  if (!activeSeason) return NextResponse.json({ error: { code: "NO_ACTIVE_SEASON", message: "진행 중인 시즌이 없습니다" } }, { status: 400 });

  const { data: existing } = await supabase.from("workout").select("id").eq("user_id", user.id).eq("date", date).single();
  if (existing) return NextResponse.json({ error: { code: "DUPLICATE_DATE", message: "이미 인증한 날짜입니다" } }, { status: 400 });

  const { data: workout, error: workoutError } = await supabase.from("workout").insert({
    user_id: user.id,
    season_id: activeSeason.id,
    date,
    note: note || null,
  }).select().single();

  if (workoutError) return NextResponse.json({ error: { code: "CREATE_FAILED", message: workoutError.message } }, { status: 500 });

  const mediaInserts = media.map((m) => ({
    workout_id: workout.id,
    r2_key: m.r2_key,
    type: m.type,
    size_bytes: m.size_bytes,
  }));

  const { error: mediaError } = await supabase.from("media").insert(mediaInserts);
  if (mediaError) return NextResponse.json({ error: { code: "MEDIA_FAILED", message: mediaError.message } }, { status: 500 });

  revalidatePath("/records");
  revalidatePath("/penalty");
  revalidatePath("/stats");

  return NextResponse.json(workout, { status: 201 });
}
