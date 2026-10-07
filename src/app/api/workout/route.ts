import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { todayStr } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { date, note, media, user_id: targetUserId, tagged_with } = body as {
    date: string;
    note?: string;
    media?: { r2_key: string; type: "photo" | "video"; size_bytes: number }[];
    user_id?: string;
    tagged_with?: string[];
  };

  if (!date) return NextResponse.json({ error: { code: "MISSING_DATE", message: "날짜를 선택해주세요" } }, { status: 400 });

  const today = todayStr();
  if (date > today) return NextResponse.json({ error: { code: "FUTURE_DATE", message: "미래 날짜는 선택할 수 없습니다" } }, { status: 400 });

  const effectiveUserId = targetUserId ?? user.id;

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", effectiveUserId).single();
  if (!profile) return NextResponse.json({ error: { code: "NO_PROFILE", message: "프로필이 없습니다" } }, { status: 400 });

  const { data: activeSeason } = await supabase.from("season").select("id").eq("crew_id", profile.crew_id).eq("is_active", true).single();
  if (!activeSeason) return NextResponse.json({ error: { code: "NO_ACTIVE_SEASON", message: "진행 중인 시즌이 없습니다" } }, { status: 400 });

  const { data: existing } = await supabase.from("workout").select("id").eq("user_id", effectiveUserId).eq("date", date).single();
  if (existing) return NextResponse.json({ error: { code: "DUPLICATE_DATE", message: "이미 인증한 날짜입니다" } }, { status: 400 });

  const validTags = (tagged_with ?? []).filter((id) => id !== effectiveUserId);

  const { data: workout, error: workoutError } = await supabase.from("workout").insert({
    user_id: effectiveUserId,
    season_id: activeSeason.id,
    date,
    note: note || null,
    tagged_with: validTags.length > 0 ? validTags : [],
  }).select().single();

  if (workoutError) return NextResponse.json({ error: { code: "CREATE_FAILED", message: workoutError.message } }, { status: 500 });

  if (media && media.length > 0) {
    const mediaInserts = media.map((m) => ({
      workout_id: workout.id,
      r2_key: m.r2_key,
      type: m.type,
      size_bytes: m.size_bytes,
    }));
    await supabase.from("media").insert(mediaInserts);
  }

  if (validTags.length > 0) {
    const adminClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: taggerProfile } = await adminClient.from("profiles").select("nickname").eq("id", effectiveUserId).single();
    const taggerName = taggerProfile?.nickname ?? "크루원";

    for (const taggedUserId of validTags) {
      const { data: existingTagged } = await adminClient.from("workout").select("id").eq("user_id", taggedUserId).eq("date", date).single();
      if (existingTagged) continue;

      await adminClient.from("workout").insert({
        user_id: taggedUserId,
        season_id: activeSeason.id,
        date,
        note: `${taggerName}님과 함께`,
        source_workout_id: workout.id,
        tagged_with: [],
      });
    }
  }

  revalidatePath("/records");
  revalidatePath("/penalty");
  revalidatePath("/stats");

  return NextResponse.json(workout, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const body = await request.json();
  const { workout_id, date, note } = body as { workout_id: string; date?: string; note?: string };

  if (!workout_id) return NextResponse.json({ error: { code: "MISSING_ID", message: "workout_id가 필요합니다" } }, { status: 400 });

  const { data: workout } = await supabase.from("workout").select("user_id").eq("id", workout_id).single();
  if (!workout) return NextResponse.json({ error: { code: "NOT_FOUND", message: "기록을 찾을 수 없습니다" } }, { status: 404 });
  if (workout.user_id !== user.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "본인의 기록만 수정할 수 있습니다" } }, { status: 403 });

  const update: Record<string, unknown> = {};
  if (date !== undefined) {
    const today = todayStr();
    if (date > today) return NextResponse.json({ error: { code: "FUTURE_DATE", message: "미래 날짜는 선택할 수 없습니다" } }, { status: 400 });
    update.date = date;
  }
  if (note !== undefined) update.note = note || null;

  const { error } = await supabase.from("workout").update(update).eq("id", workout_id);
  if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED", message: error.message } }, { status: 500 });

  revalidatePath("/records");
  revalidatePath("/penalty");
  revalidatePath("/stats");

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workoutId = searchParams.get("id");
  if (!workoutId) return NextResponse.json({ error: { code: "MISSING_ID", message: "id가 필요합니다" } }, { status: 400 });

  const { data: workout } = await supabase.from("workout").select("user_id").eq("id", workoutId).single();
  if (!workout) return NextResponse.json({ error: { code: "NOT_FOUND", message: "기록을 찾을 수 없습니다" } }, { status: 404 });
  if (workout.user_id !== user.id) return NextResponse.json({ error: { code: "FORBIDDEN", message: "본인의 기록만 삭제할 수 있습니다" } }, { status: 403 });

  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // cascade: 태그로 생성된 연결 workout도 함께 삭제 (다른 유저 소유이므로 service_role 사용)
  const { data: taggedWorkouts } = await adminClient.from("workout").select("id").eq("source_workout_id", workoutId);
  if (taggedWorkouts && taggedWorkouts.length > 0) {
    const taggedIds = taggedWorkouts.map((w) => w.id);
    await adminClient.from("media").delete().in("workout_id", taggedIds);
    await adminClient.from("workout").delete().in("id", taggedIds);
  }

  await adminClient.from("media").delete().eq("workout_id", workoutId);
  const { error } = await adminClient.from("workout").delete().eq("id", workoutId);
  if (error) return NextResponse.json({ error: { code: "DELETE_FAILED", message: error.message } }, { status: 500 });

  revalidatePath("/records");
  revalidatePath("/penalty");
  revalidatePath("/stats");

  return NextResponse.json({ success: true });
}
