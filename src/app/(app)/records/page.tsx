import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCrewFeedWithMedia, type FeedItem } from "@/lib/workouts";
import RecordsContent from "./records-content";

export default async function RecordsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("crew_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const [{ data: activeSeason }, { data: members }] = await Promise.all([
    supabase.from("season").select("*").eq("crew_id", profile.crew_id).eq("is_active", true).single(),
    supabase.from("profiles").select("id, nickname").eq("crew_id", profile.crew_id),
  ]);

  let allWorkouts: { user_id: string; date: string; id: string }[] = [];
  let feedItems: FeedItem[] = [];

  if (activeSeason) {
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
      members={(members ?? []).map((m) => ({ id: m.id, nickname: m.nickname }))}
      seasonName={activeSeason?.name ?? null}
      seasonStartDate={activeSeason?.start_date ?? null}
      allWorkouts={allWorkouts}
      feedItems={feedItems}
    />
  );
}
