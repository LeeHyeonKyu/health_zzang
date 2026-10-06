import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getWorkoutsWithMedia } from "@/lib/workouts";
import WorkoutCard from "@/components/workout-card";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

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

  return (
    <div className="min-h-dvh px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">📝 내 기록</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">← 대시보드</Link>
      </header>

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
        <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500">
          <p>아직 인증 기록이 없습니다.</p>
          <Link href="/workout/new" className="text-blue-600 hover:underline text-sm mt-2 inline-block">운동 인증하기</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} date={w.date} note={w.note} media={w.media} />
          ))}
        </div>
      )}
    </div>
  );
}
