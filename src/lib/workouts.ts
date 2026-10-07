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
  limit = 50
): Promise<FeedItem[]> {
  let query = supabase
    .from("workout")
    .select("id, date, note, user_id")
    .order("date", { ascending: false })
    .limit(limit);

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data: workouts } = await query;
  if (!workouts || workouts.length === 0) return [];

  const userIds = [...new Set(workouts.map((w) => w.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", userIds);

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

    result.push({
      id: workout.id,
      date: workout.date,
      note: workout.note,
      nickname: profileMap.get(workout.user_id) ?? "알 수 없음",
      userId: workout.user_id,
      media,
    });
  }

  return result;
}
