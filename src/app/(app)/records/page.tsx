import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getProfile, getActiveSeason, getCrewMembers, getExemptions } from "@/lib/data";
import { getCrewFeedWithMedia, type FeedItem } from "@/lib/workouts";
import RecordsContent from "./records-content";

export default async function RecordsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  const [activeSeason, members] = await Promise.all([
    getActiveSeason(profile.crew_id),
    getCrewMembers(profile.crew_id),
  ]);

  let allWorkouts: { user_id: string; date: string; id: string; tagged_with?: string[] }[] = [];
  let feedItems: FeedItem[] = [];
  let exemptions: { user_id: string; week_start: string; reason: string }[] = [];

  if (activeSeason) {
    const supabase = await createClient();
    const [{ data: workouts }, feed, exs] = await Promise.all([
      supabase.from("workout").select("id, user_id, date, tagged_with").eq("season_id", activeSeason.id).order("date", { ascending: false }),
      getCrewFeedWithMedia(supabase, profile.crew_id, activeSeason.id, 100),
      getExemptions(activeSeason.id),
    ]);
    allWorkouts = workouts ?? [];
    feedItems = feed;
    exemptions = exs;
  }

  return (
    <RecordsContent
      currentUserId={user.id}
      members={members.map((m) => ({ id: m.id, nickname: m.nickname }))}
      seasonName={activeSeason?.name ?? null}
      seasonStartDate={activeSeason?.start_date ?? null}
      allWorkouts={allWorkouts}
      feedItems={feedItems}
      exemptions={exemptions}
    />
  );
}
