import { createClient } from "@/lib/supabase/server";
import { getCrewFeedWithMedia } from "@/lib/workouts";
import FeedCard from "@/components/feed-card";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) return null;

  const { data: activeSeason } = await supabase
    .from("season")
    .select("id")
    .eq("crew_id", profile.crew_id)
    .eq("is_active", true)
    .single();

  const feed = activeSeason
    ? await getCrewFeedWithMedia(supabase, profile.crew_id, activeSeason.id)
    : [];

  return (
    <>
      <h2 className="text-lg font-bold mb-4">📷 크루 피드</h2>

      {feed.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500">아직 인증이 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">크루원들의 운동 인증이 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((item) => (
            <FeedCard
              key={item.id}
              nickname={item.nickname}
              userId={item.userId}
              date={item.date}
              note={item.note}
              media={item.media}
            />
          ))}
        </div>
      )}
    </>
  );
}
