import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getProfile, getActiveSeason, getCrewMembers } from "@/lib/data";
import { getCrewFeedWithMedia } from "@/lib/workouts";
import { getReadUrl } from "@/lib/r2";
import FeedContent from "./feed-content";
import Link from "next/link";

const INITIAL_LIMIT = 20;

export default async function FeedPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/login");

  const [activeSeason, members] = await Promise.all([
    getActiveSeason(profile.crew_id),
    getCrewMembers(profile.crew_id),
  ]);

  if (!activeSeason) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-800">
        <p className="text-gray-500 dark:text-gray-400">현재 진행 중인 시즌이 없습니다.</p>
        <Link href="/settings" prefetch={false} className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-3 inline-block font-medium">시즌 시작하기 →</Link>
      </div>
    );
  }

  const supabase = await createClient();

  const [feedItems, { data: avatarProfiles }] = await Promise.all([
    getCrewFeedWithMedia(supabase, profile.crew_id, activeSeason.id, INITIAL_LIMIT + 1),
    supabase.from("profiles").select("id, avatar_r2_key").eq("crew_id", profile.crew_id).not("avatar_r2_key", "is", null),
  ]);

  const avatarMap: Record<string, string> = {};
  for (const p of avatarProfiles ?? []) {
    if (p.avatar_r2_key) {
      avatarMap[p.id] = await getReadUrl(p.avatar_r2_key);
    }
  }

  const initialHasMore = feedItems.length > INITIAL_LIMIT;
  const initialItems = feedItems.slice(0, INITIAL_LIMIT);
  const lastItem = initialItems[initialItems.length - 1];
  const initialNextCursor = initialHasMore && lastItem ? `${lastItem.date}_${lastItem.id}` : null;

  // Compute lastFeedDates from all workouts (need a broader query for badge ordering)
  const { data: allWorkoutDates } = await supabase
    .from("workout")
    .select("user_id, date")
    .eq("season_id", activeSeason.id)
    .order("date", { ascending: false });

  const lastFeedDates: Record<string, string> = {};
  for (const w of allWorkoutDates ?? []) {
    if (!lastFeedDates[w.user_id]) {
      lastFeedDates[w.user_id] = w.date;
    }
  }

  return (
    <FeedContent
      currentUserId={user.id}
      members={members.map((m) => ({ id: m.id, nickname: m.nickname }))}
      initialItems={initialItems}
      initialNextCursor={initialNextCursor}
      initialHasMore={initialHasMore}
      seasonStartDate={activeSeason.start_date}
      avatarMap={avatarMap}
      lastFeedDates={lastFeedDates}
    />
  );
}
