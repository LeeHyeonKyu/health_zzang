import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getProfile, getActiveSeason, getCrewMembers } from "@/lib/data";
import { getCrewFeedWithMedia } from "@/lib/workouts";
import FeedContent from "./feed-content";
import Link from "next/link";

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
  const feedItems = await getCrewFeedWithMedia(supabase, profile.crew_id, activeSeason.id, 100);

  return (
    <FeedContent
      currentUserId={user.id}
      members={members.map((m) => ({ id: m.id, nickname: m.nickname }))}
      feedItems={feedItems}
      seasonStartDate={activeSeason.start_date}
    />
  );
}
