import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getWorkoutsWithMedia } from "@/lib/workouts";
import WorkoutCard from "@/components/workout-card";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: memberId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberProfile } = await supabase
    .from("profiles")
    .select("id, nickname, crew_id")
    .eq("id", memberId)
    .single();

  if (!memberProfile) notFound();

  const { data: myProfile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!myProfile || myProfile.crew_id !== memberProfile.crew_id) notFound();

  const { data: seasons } = await supabase
    .from("season")
    .select("id, name, is_active")
    .eq("crew_id", memberProfile.crew_id)
    .order("start_date", { ascending: false });

  const activeSeason = seasons?.find((s) => s.is_active);
  const selectedSeasonId = activeSeason?.id;

  const workouts = selectedSeasonId
    ? await getWorkoutsWithMedia(supabase, memberId, selectedSeasonId)
    : [];

  const isMe = memberId === user.id;

  return (
    <>
      <h2 className="text-lg font-bold mb-4">
        {memberProfile.nickname}{isMe ? " (나)" : ""}의 기록
      </h2>

      {seasons && seasons.length > 1 && (
        <div className="mb-4">
          <select className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900" defaultValue={selectedSeasonId}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.is_active ? " (진행 중)" : ""}</option>
            ))}
          </select>
        </div>
      )}

      {workouts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500">아직 인증 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} date={w.date} note={w.note} media={w.media} />
          ))}
        </div>
      )}
    </>
  );
}
