import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getProfile, getActiveSeason, getCrewMembers, getExemptions } from "@/lib/data";
import { getCrewFeedWithMedia, type FeedItem } from "@/lib/workouts";
import { getReadUrl } from "@/lib/r2";
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
  const avatarMap: Record<string, string> = {};

  if (activeSeason) {
    const supabase = await createClient();
    const [{ data: workouts }, feed, exs, { data: avatarProfiles }] = await Promise.all([
      supabase.from("workout").select("id, user_id, date, tagged_with").eq("season_id", activeSeason.id).order("date", { ascending: false }),
      getCrewFeedWithMedia(supabase, profile.crew_id, activeSeason.id, 100),
      getExemptions(activeSeason.id),
      supabase.from("profiles").select("id, avatar_r2_key").eq("crew_id", profile.crew_id).not("avatar_r2_key", "is", null),
    ]);
    allWorkouts = workouts ?? [];
    feedItems = feed;
    exemptions = exs;
    for (const p of avatarProfiles ?? []) {
      if (p.avatar_r2_key) {
        avatarMap[p.id] = await getReadUrl(p.avatar_r2_key);
      }
    }
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
      avatarMap={avatarMap}
    />
  );
}
