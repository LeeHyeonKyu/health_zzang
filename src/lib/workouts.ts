import { SupabaseClient } from "@supabase/supabase-js";
import { getReadUrl } from "@/lib/r2";

export interface WorkoutWithMedia {
  id: string;
  date: string;
  note: string | null;
  media: { r2_key: string; type: "photo" | "video"; url: string }[];
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
