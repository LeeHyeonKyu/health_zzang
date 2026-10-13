import { createClient } from "@/lib/supabase/server";
import { getReadUrl } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const member = searchParams.get("member");

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "NO_PROFILE" }, { status: 400 });

  const { data: season } = await supabase.from("season").select("id").eq("crew_id", profile.crew_id).eq("is_active", true).single();
  if (!season) return NextResponse.json({ items: [], nextCursor: null, hasMore: false });

  let query = supabase
    .from("workout")
    .select("id, date, note, user_id, tagged_with, created_at")
    .eq("season_id", season.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (member) {
    query = query.eq("user_id", member);
  }

  if (cursor) {
    const sepIdx = cursor.indexOf("|");
    if (sepIdx > 0) {
      const cursorDate = cursor.slice(0, sepIdx);
      const cursorCreatedAt = cursor.slice(sepIdx + 1);
      query = query.or(`date.lt.${cursorDate},and(date.eq.${cursorDate},created_at.lt.${cursorCreatedAt})`);
    }
  }

  const { data: workouts } = await query;
  if (!workouts || workouts.length === 0) {
    return NextResponse.json({ items: [], nextCursor: null, hasMore: false });
  }

  const hasMore = workouts.length > limit;
  const items = workouts.slice(0, limit);

  const allUserIds = new Set<string>();
  for (const w of items) {
    allUserIds.add(w.user_id);
    for (const t of (w.tagged_with ?? [])) allUserIds.add(t);
  }
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname, avatar_r2_key")
    .in("id", [...allUserIds]);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const workoutIds = items.map((w) => w.id);
  const [{ data: allMedia }, { data: allReactions }, { data: commentCounts }] = await Promise.all([
    supabase
      .from("media")
      .select("workout_id, r2_key, type")
      .in("workout_id", workoutIds),
    supabase
      .from("reaction")
      .select("workout_id, emoji, user_id")
      .in("workout_id", workoutIds),
    supabase
      .from("comment")
      .select("workout_id")
      .in("workout_id", workoutIds),
  ]);

  const mediaByWorkout = new Map<string, { workout_id: string; r2_key: string; type: string }[]>();
  for (const m of allMedia ?? []) {
    const existing = mediaByWorkout.get(m.workout_id) ?? [];
    existing.push(m);
    mediaByWorkout.set(m.workout_id, existing);
  }

  const reactionsByWorkout = new Map<string, { emoji: string; user_id: string }[]>();
  for (const r of allReactions ?? []) {
    const existing = reactionsByWorkout.get(r.workout_id) ?? [];
    existing.push({ emoji: r.emoji, user_id: r.user_id });
    reactionsByWorkout.set(r.workout_id, existing);
  }

  const commentCountByWorkout = new Map<string, number>();
  for (const c of commentCounts ?? []) {
    commentCountByWorkout.set(c.workout_id, (commentCountByWorkout.get(c.workout_id) ?? 0) + 1);
  }

  const responseItems = await Promise.all(items.map(async (w) => {
    const rawMedia = mediaByWorkout.get(w.id) ?? [];
    const media = await Promise.all(rawMedia.map(async (m) => ({
      r2_key: m.r2_key,
      type: m.type as "photo" | "video",
      url: await getReadUrl(m.r2_key),
    })));

    const prof = profileMap.get(w.user_id);
    const taggedNames = (w.tagged_with ?? [])
      .map((id: string) => profileMap.get(id)?.nickname)
      .filter(Boolean) as string[];

    const workoutReactions = reactionsByWorkout.get(w.id) ?? [];
    const emojiMap = new Map<string, { count: number; reacted: boolean }>();
    for (const r of workoutReactions) {
      const entry = emojiMap.get(r.emoji) ?? { count: 0, reacted: false };
      entry.count++;
      if (r.user_id === user!.id) entry.reacted = true;
      emojiMap.set(r.emoji, entry);
    }
    const reactionCounts = [...emojiMap.entries()].map(([emoji, { count, reacted }]) => ({ emoji, count, reacted }));

    return {
      id: w.id,
      date: w.date,
      note: w.note,
      nickname: prof?.nickname ?? "알 수 없음",
      userId: w.user_id,
      avatarUrl: prof?.avatar_r2_key ? await getReadUrl(prof.avatar_r2_key) : null,
      media,
      taggedNames,
      taggedIds: w.tagged_with ?? [],
      created_at: w.created_at,
      reactionCounts,
      commentCount: commentCountByWorkout.get(w.id) ?? 0,
    };
  }));

  const lastItem = items[items.length - 1];
  const nextCursor = hasMore ? `${lastItem.date}|${lastItem.created_at}` : null;

  return NextResponse.json({ items: responseItems, nextCursor, hasMore });
}
