import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWeekStart } from "@/lib/utils";
import PenaltyContent from "./penalty-content";

export default async function PenaltyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const [{ data: activeSeason }, { data: members }] = await Promise.all([
    supabase.from("season").select("*").eq("crew_id", profile.crew_id).eq("is_active", true).single(),
    supabase.from("profiles").select("id, nickname").eq("crew_id", profile.crew_id),
  ]);

  if (!activeSeason) {
    return (
      <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
        <p className="text-gray-500">현재 진행 중인 시즌이 없습니다.</p>
      </div>
    );
  }

  const [{ data: workouts }, { data: weeklyRules }] = await Promise.all([
    supabase.from("workout").select("user_id, date").eq("season_id", activeSeason.id),
    supabase.from("weekly_rule").select("*").eq("season_id", activeSeason.id),
  ]);

  return (
    <PenaltyContent
      currentUserId={user.id}
      seasonName={activeSeason.name}
      seasonStartDate={activeSeason.start_date}
      seasonEndDate={activeSeason.end_date}
      defaultTargetCount={activeSeason.default_target_count}
      defaultPenaltyPerMiss={activeSeason.default_penalty_per_miss}
      defaultRewardPerExtra={activeSeason.default_reward_per_extra}
      members={(members ?? []).map((m) => ({ id: m.id, nickname: m.nickname }))}
      workouts={(workouts ?? []).map((w) => ({ user_id: w.user_id, date: w.date }))}
      weeklyRules={(weeklyRules ?? []).map((r) => ({
        week_start: r.week_start,
        target_count: r.target_count,
        penalty_per_miss: r.penalty_per_miss,
        reward_per_extra: r.reward_per_extra,
      }))}
    />
  );
}
