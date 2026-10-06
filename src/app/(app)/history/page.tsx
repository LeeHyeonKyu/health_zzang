import { createClient } from "@/lib/supabase/server";
import { getWorkoutsWithMedia } from "@/lib/workouts";
import HistoryContent from "./history-content";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) return null;

  const { data: seasons } = await supabase
    .from("season")
    .select("id, name, is_active")
    .eq("crew_id", profile.crew_id)
    .order("start_date", { ascending: false });

  const activeSeason = seasons?.find((s) => s.is_active);
  const selectedSeasonId = activeSeason?.id;

  const workouts = selectedSeasonId
    ? await getWorkoutsWithMedia(supabase, user.id, selectedSeasonId)
    : [];

  return <HistoryContent workouts={workouts} />;
}
