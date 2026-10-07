import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getActiveSeason, getCrewMembers, getExemptions } from "@/lib/data";
import { formatCurrency, toDateStr } from "@/lib/utils";
import { calcMemberPenalties, getCompletedWeeks, getAllWeeks, getCurrentWeekStart } from "@/lib/penalty";
import { getReadUrl } from "@/lib/r2";
import Ranking from "./ranking";
import StatsHeader from "./stats-header";
import WeeklyPenalty from "./weekly-penalty";

export default async function StatsPage() {
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
  const [{ data: workouts }, { data: weeklyRules }, exemptions, { data: avatarProfiles }] = await Promise.all([
    supabase.from("workout").select("user_id, date, tagged_with").eq("season_id", activeSeason.id),
    supabase.from("weekly_rule").select("*").eq("season_id", activeSeason.id),
    getExemptions(activeSeason.id),
    supabase.from("profiles").select("id, avatar_r2_key").eq("crew_id", profile.crew_id).not("avatar_r2_key", "is", null),
  ]);

  const avatarMap: Record<string, string> = {};
  for (const p of avatarProfiles ?? []) {
    if (p.avatar_r2_key) {
      avatarMap[p.id] = await getReadUrl(p.avatar_r2_key);
    }
  }

  const allWorkouts = workouts ?? [];

  /* eslint-disable react-hooks/purity */
  const now = Date.now();
  /* eslint-enable react-hooks/purity */
  const daysElapsed = Math.max(1, Math.ceil((now - new Date(activeSeason.start_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)));
  const weeksElapsed = Math.max(1, Math.ceil(daysElapsed / 7));

  const penaltyInput = {
    seasonStartDate: activeSeason.start_date,
    seasonEndDate: activeSeason.end_date,
    defaultTargetCount: activeSeason.default_target_count,
    defaultPenaltyPerMiss: activeSeason.default_penalty_per_miss,
    defaultRewardPerExtra: activeSeason.default_reward_per_extra,
    progressivePenalty: activeSeason.progressive_penalty ?? false,
    members: members.map((m) => ({ id: m.id, nickname: m.nickname })),
    workouts: allWorkouts.map((w) => ({ user_id: w.user_id, date: w.date, tagged_with: w.tagged_with ?? [] })),
    weeklyRules: (weeklyRules ?? []).map((r) => ({
      week_start: r.week_start,
      target_count: r.target_count,
      penalty_per_miss: r.penalty_per_miss,
      reward_per_extra: r.reward_per_extra,
    })),
    exemptions: exemptions.map((e) => ({ user_id: e.user_id, week_start: e.week_start })),
  };

  const penaltyResults = calcMemberPenalties(penaltyInput);

  const completedWeeks = getCompletedWeeks(
    getAllWeeks(activeSeason.start_date, activeSeason.end_date),
    getCurrentWeekStart()
  );
  const ruleMap = new Map((weeklyRules ?? []).map((r) => [r.week_start, r]));

  const memberStats = penaltyResults.map((p) => {
    const dates = new Set(
      allWorkouts
        .filter((w) => w.user_id === p.id || (w.tagged_with ?? []).includes(p.id))
        .map((w) => w.date)
    );
    const count = dates.size;
    const memberExempted = new Set(exemptions.filter((e) => e.user_id === p.id).map((e) => e.week_start));
    const activeWeeks = completedWeeks.filter((w) => !memberExempted.has(w)).length;
    return {
      id: p.id,
      nickname: p.nickname,
      count,
      totalPenalty: p.totalPenalty,
      totalWorkouts: p.totalWorkouts,
      exemptedWeeks: p.exemptedWeeks,
      avgPerWeek: activeWeeks > 0 ? Math.round((count / activeWeeks) * 10) / 10 : 0,
      activeWeeks,
    };
  });

  const myStats = memberStats.find((m) => m.id === user.id);
  const grandTotal = penaltyResults.reduce((sum, p) => sum + p.totalPenalty, 0);

  const myExemptedWeeks = new Set(exemptions.filter((e) => e.user_id === user.id).map((e) => e.week_start));
  const totalTarget = completedWeeks
    .filter((w) => !myExemptedWeeks.has(w))
    .reduce((sum, w) => sum + (ruleMap.get(w)?.target_count ?? activeSeason.default_target_count), 0);
  const myAchievementRate = totalTarget > 0 ? Math.round(((myStats?.count ?? 0) / totalTarget) * 100) : 0;

  return (
    <div className="space-y-4">
      <StatsHeader
        seasonName={activeSeason.name}
        daysElapsed={daysElapsed}
        weeksElapsed={weeksElapsed}
        memberCount={members.length}
        grandTotal={grandTotal}
        myCount={myStats?.count ?? 0}
        myAvgPerWeek={myStats?.avgPerWeek ?? 0}
        myPenalty={myStats?.totalPenalty ?? 0}
        myAchievementRate={myAchievementRate}
      />

      {/* 크루 랭킹 */}
      <Ranking members={memberStats} currentUserId={user.id} avatarMap={avatarMap} />

      {/* 주별 벌금 상세 */}
      <WeeklyPenalty
        currentUserId={user.id}
        seasonStartDate={activeSeason.start_date}
        seasonEndDate={activeSeason.end_date}
        defaultTargetCount={activeSeason.default_target_count}
        defaultPenaltyPerMiss={activeSeason.default_penalty_per_miss}
        defaultRewardPerExtra={activeSeason.default_reward_per_extra}
        progressivePenalty={activeSeason.progressive_penalty ?? false}
        members={members.map((m) => ({ id: m.id, nickname: m.nickname }))}
        workouts={allWorkouts.map((w) => ({ user_id: w.user_id, date: w.date, tagged_with: w.tagged_with ?? [] }))}
        weeklyRules={(weeklyRules ?? []).map((r) => ({
          week_start: r.week_start,
          target_count: r.target_count,
          penalty_per_miss: r.penalty_per_miss,
          reward_per_extra: r.reward_per_extra,
        }))}
        exemptions={exemptions.map((e) => ({ user_id: e.user_id, week_start: e.week_start, reason: e.reason }))}
      />
    </div>
  );
}
