import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getActiveSeason, getCrewMembers, getExemptions } from "@/lib/data";
import { formatCurrency, toDateStr } from "@/lib/utils";
import { calcMemberPenalties } from "@/lib/penalty";
import Ranking from "./ranking";

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
  const [{ data: workouts }, { data: weeklyRules }, exemptions] = await Promise.all([
    supabase.from("workout").select("user_id, date").eq("season_id", activeSeason.id),
    supabase.from("weekly_rule").select("*").eq("season_id", activeSeason.id),
    getExemptions(activeSeason.id),
  ]);

  const allWorkouts = workouts ?? [];

  /* eslint-disable react-hooks/purity */
  const now = Date.now();
  /* eslint-enable react-hooks/purity */
  const daysElapsed = Math.max(1, Math.ceil((now - new Date(activeSeason.start_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)));
  const weeksElapsed = Math.max(1, Math.ceil(daysElapsed / 7));

  const penaltyResults = calcMemberPenalties({
    seasonStartDate: activeSeason.start_date,
    seasonEndDate: activeSeason.end_date,
    defaultTargetCount: activeSeason.default_target_count,
    defaultPenaltyPerMiss: activeSeason.default_penalty_per_miss,
    defaultRewardPerExtra: activeSeason.default_reward_per_extra,
    members: members.map((m) => ({ id: m.id, nickname: m.nickname })),
    workouts: allWorkouts.map((w) => ({ user_id: w.user_id, date: w.date })),
    weeklyRules: (weeklyRules ?? []).map((r) => ({
      week_start: r.week_start,
      target_count: r.target_count,
      penalty_per_miss: r.penalty_per_miss,
      reward_per_extra: r.reward_per_extra,
    })),
    exemptions: exemptions.map((e) => ({ user_id: e.user_id, week_start: e.week_start })),
  });

  const memberStats = penaltyResults.map((p) => {
    const count = allWorkouts.filter((w) => w.user_id === p.id).length;
    return {
      id: p.id,
      nickname: p.nickname,
      count,
      totalPenalty: p.totalPenalty,
      avgPerWeek: Math.round((count / weeksElapsed) * 10) / 10,
    };
  });

  const myStats = memberStats.find((m) => m.id === user.id);
  const myDates = allWorkouts
    .filter((w) => w.user_id === user.id)
    .map((w) => w.date)
    .sort()
    .reverse();

  let streak = 0;
  if (myDates.length > 0) {
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const ds = toDateStr(checkDate);
      if (myDates.includes(ds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-xl p-4">
        <h2 className="text-base font-bold text-blue-800 dark:text-blue-200 mb-2">{activeSeason.name}</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{daysElapsed}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">경과일</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{weeksElapsed}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">경과주</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{members.length}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">참여 인원</p>
          </div>
        </div>
      </div>

      {myStats && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">내 통계</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-[#111] rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{myStats.count}회</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">총 운동</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#111] rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{myStats.avgPerWeek}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">주당 평균</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#111] rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{streak}일</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">연속 운동</p>
            </div>
            <div className="bg-gray-50 dark:bg-[#111] rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${myStats.totalPenalty > 0 ? "text-red-600 dark:text-red-400" : myStats.totalPenalty < 0 ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}>
                {formatCurrency(myStats.totalPenalty)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">벌금</p>
            </div>
          </div>
        </div>
      )}

      <Ranking members={memberStats} currentUserId={user.id} />
    </div>
  );
}
