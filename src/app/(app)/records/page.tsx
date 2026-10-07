import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getProfile, getActiveSeason, getCrewMembers } from "@/lib/data";
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

  let allWorkouts: { user_id: string; date: string; id: string }[] = [];
  let feedItems: FeedItem[] = [];

  if (activeSeason) {
    const supabase = await createClient();
    const [{ data: workouts }, feed] = await Promise.all([
      supabase.from("workout").select("id, user_id, date").eq("season_id", activeSeason.id).order("date", { ascending: false }),
      getCrewFeedWithMedia(supabase, profile.crew_id, activeSeason.id, 100),
    ]);
    allWorkouts = workouts ?? [];
    feedItems = feed;
  }

  return (
    <RecordsContent
      currentUserId={user.id}
      members={members.map((m) => ({ id: m.id, nickname: m.nickname }))}
      seasonName={activeSeason?.name ?? null}
      seasonStartDate={activeSeason?.start_date ?? null}
      allWorkouts={allWorkouts}
      feedItems={feedItems}
    />
  );
}
