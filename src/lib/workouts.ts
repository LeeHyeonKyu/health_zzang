import { SupabaseClient } from "@supabase/supabase-js";
import { getReadUrl } from "@/lib/r2";

export interface WorkoutWithMedia {
  id: string;
  date: string;
  note: string | null;
  media: { r2_key: string; type: "photo" | "video"; url: string }[];
}

export interface FeedItem extends WorkoutWithMedia {
  nickname: string;
  userId: string;
  taggedNames: string[];
  taggedIds: string[];
  created_at: string;
  reactionCounts?: { emoji: string; count: number; reacted: boolean }[];
  commentCount?: number;
}

export async function getWorkoutsWithMedia(
  supabase: SupabaseClient,
  userId: string,
  seasonId?: string
): Promise<WorkoutWithMedia[]> {
  let query = supabase
    .from("workout")
    .select("id, date, note")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data: workouts } = await query;
  if (!workouts || workouts.length === 0) return [];

  const result: WorkoutWithMedia[] = [];

  for (const workout of workouts) {
    const { data: mediaItems } = await supabase
      .from("media")
      .select("r2_key, type")
      .eq("workout_id", workout.id);

    const media = await Promise.all(
      (mediaItems ?? []).map(async (m) => ({
        r2_key: m.r2_key,
        type: m.type as "photo" | "video",
        url: await getReadUrl(m.r2_key),
      }))
    );

    result.push({ id: workout.id, date: workout.date, note: workout.note, media });
  }

  return result;
}

export async function getCrewFeedWithMedia(
  supabase: SupabaseClient,
  crewId: string,
  seasonId?: string,
  limit = 500
): Promise<FeedItem[]> {
  let query = supabase
    .from("workout")
    .select("id, date, note, user_id, tagged_with, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data: workouts } = await query;
  if (!workouts || workouts.length === 0) return [];

  // Collect all user IDs (creators + tagged)
  const allUserIds = new Set<string>();
  for (const w of workouts) {
    allUserIds.add(w.user_id);
    for (const t of (w.tagged_with ?? [])) {
      allUserIds.add(t);
    }
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", [...allUserIds]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.nickname]));

  const workoutIds = workouts.map((w) => w.id);
  const { data: allMedia } = await supabase
    .from("media")
    .select("workout_id, r2_key, type")
    .in("workout_id", workoutIds);

  const mediaByWorkout = new Map<string, typeof allMedia>();
  for (const m of allMedia ?? []) {
    const existing = mediaByWorkout.get(m.workout_id) ?? [];
    existing.push(m);
    mediaByWorkout.set(m.workout_id, existing);
  }

  const result: FeedItem[] = [];
  for (const workout of workouts) {
    const rawMedia = mediaByWorkout.get(workout.id) ?? [];
    const media = await Promise.all(
      rawMedia.map(async (m) => ({
        r2_key: m.r2_key,
        type: m.type as "photo" | "video",
        url: await getReadUrl(m.r2_key),
      }))
    );

    const taggedNames = (workout.tagged_with ?? [])
      .map((id: string) => profileMap.get(id))
      .filter(Boolean) as string[];

    result.push({
      id: workout.id,
      date: workout.date,
      note: workout.note,
      nickname: profileMap.get(workout.user_id) ?? "알 수 없음",
      userId: workout.user_id,
      media,
      taggedNames,
      taggedIds: workout.tagged_with ?? [],
      created_at: workout.created_at,
    });
  }

  return result;
}

export async function enrichFeedItemsWithSocial(
  supabase: SupabaseClient,
  items: FeedItem[],
  currentUserId: string
): Promise<FeedItem[]> {
  if (items.length === 0) return items;

  const workoutIds = items.map((w) => w.id);
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabase.from("reaction").select("workout_id, emoji, user_id").in("workout_id", workoutIds),
    supabase.from("comment").select("workout_id").in("workout_id", workoutIds),
  ]);

  const reactionsByWorkout = new Map<string, { emoji: string; user_id: string }[]>();
  for (const r of reactions ?? []) {
    const existing = reactionsByWorkout.get(r.workout_id) ?? [];
    existing.push({ emoji: r.emoji, user_id: r.user_id });
    reactionsByWorkout.set(r.workout_id, existing);
  }

  const commentCountByWorkout = new Map<string, number>();
  for (const c of comments ?? []) {
    commentCountByWorkout.set(c.workout_id, (commentCountByWorkout.get(c.workout_id) ?? 0) + 1);
  }

  return items.map((item) => {
    const workoutReactions = reactionsByWorkout.get(item.id) ?? [];
    const emojiMap = new Map<string, { count: number; reacted: boolean }>();
    for (const r of workoutReactions) {
      const entry = emojiMap.get(r.emoji) ?? { count: 0, reacted: false };
      entry.count++;
      if (r.user_id === currentUserId) entry.reacted = true;
      emojiMap.set(r.emoji, entry);
    }

    return {
      ...item,
      reactionCounts: [...emojiMap.entries()].map(([emoji, { count, reacted }]) => ({ emoji, count, reacted })),
      commentCount: commentCountByWorkout.get(item.id) ?? 0,
    };
  });
}
