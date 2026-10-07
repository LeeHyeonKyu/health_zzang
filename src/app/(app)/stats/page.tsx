import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getActiveSeason, getCrewMembers } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

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
      <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
        <p className="text-gray-500">현재 진행 중인 시즌이 없습니다.</p>
        <Link href="/settings" prefetch={false} className="text-blue-600 hover:underline text-sm mt-3 inline-block font-medium">시즌 시작하기 →</Link>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: workouts }, { data: weeklyRules }] = await Promise.all([
    supabase.from("workout").select("user_id, date").eq("season_id", activeSeason.id),
    supabase.from("weekly_rule").select("*").eq("season_id", activeSeason.id),
  ]);

  const allWorkouts = workouts ?? [];
  const ruleMap = new Map((weeklyRules ?? []).map((r) => [r.week_start, r]));

  /* eslint-disable react-hooks/purity */
  const now = Date.now();
  /* eslint-enable react-hooks/purity */
  const daysElapsed = Math.max(1, Math.ceil((now - new Date(activeSeason.start_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)));
  const weeksElapsed = Math.max(1, Math.ceil(daysElapsed / 7));

  function getMonday(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    return d.toISOString().split("T")[0];
  }

  function getWeekEnd(ws: string): string {
    const d = new Date(ws + "T00:00:00");
    d.setDate(d.getDate() + 6);
    return d.toISOString().split("T")[0];
  }

  function getRuleForWeek(ws: string) {
    const ov = ruleMap.get(ws);
    return {
      target: ov?.target_count ?? activeSeason.default_target_count,
      penaltyPerMiss: ov?.penalty_per_miss ?? activeSeason.default_penalty_per_miss,
      rewardPerExtra: ov?.reward_per_extra ?? activeSeason.default_reward_per_extra,
    };
  }

  const allWeeks: string[] = [];
  const today = new Date(now);
  const endDate = activeSeason.end_date ?? today.toISOString().split("T")[0];
  const startMon = getMonday(new Date(activeSeason.start_date + "T00:00:00"));
  const d = new Date(startMon + "T00:00:00");
  while (d.toISOString().split("T")[0] <= endDate) {
    allWeeks.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 7);
  }

  const memberStats = members.map((m) => {
    const count = allWorkouts.filter((w) => w.user_id === m.id).length;
    let totalPenalty = 0;
    for (const ws of allWeeks) {
      const we = getWeekEnd(ws);
      const rule = getRuleForWeek(ws);
      const weekCount = allWorkouts.filter((w) => w.user_id === m.id && w.date >= ws && w.date <= we).length;
      const missed = Math.max(0, rule.target - weekCount);
      const extra = Math.max(0, weekCount - rule.target);
      totalPenalty += missed * rule.penaltyPerMiss - extra * rule.rewardPerExtra;
    }
    return { id: m.id, nickname: m.nickname, count, totalPenalty, avgPerWeek: Math.round((count / weeksElapsed) * 10) / 10 };
  });

  const myStats = memberStats.find((m) => m.id === user.id);
  const ranking = [...memberStats].sort((a, b) => b.count - a.count);

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
      const ds = checkDate.toISOString().split("T")[0];
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
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h2 className="text-base font-bold text-blue-800 mb-2">{activeSeason.name}</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-900">{daysElapsed}</p>
            <p className="text-xs text-blue-600">경과일</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900">{weeksElapsed}</p>
            <p className="text-xs text-blue-600">경과주</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-900">{members.length}</p>
            <p className="text-xs text-blue-600">참여 인원</p>
          </div>
        </div>
      </div>

      {myStats && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">내 통계</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{myStats.count}회</p>
              <p className="text-xs text-gray-500">총 운동</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{myStats.avgPerWeek}</p>
              <p className="text-xs text-gray-500">주당 평균</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">{streak}일</p>
              <p className="text-xs text-gray-500">연속 운동</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${myStats.totalPenalty > 0 ? "text-red-600" : myStats.totalPenalty < 0 ? "text-green-600" : "text-gray-400"}`}>
                {formatCurrency(myStats.totalPenalty)}
              </p>
              <p className="text-xs text-gray-500">벌금</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3">크루 랭킹</h3>
        <div className="space-y-2">
          {ranking.map((m, i) => (
            <div key={m.id} className={`flex items-center gap-3 py-2 px-3 rounded-lg ${m.id === user.id ? "bg-yellow-50" : ""}`}>
              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 text-white" : i === 2 ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-900">
                {m.nickname}
                {m.id === user.id && <span className="text-xs text-gray-400 ml-1">(나)</span>}
              </span>
              <span className="text-sm font-mono font-semibold text-gray-700">{m.count}회</span>
              <span className={`text-xs font-mono ${m.totalPenalty > 0 ? "text-red-500" : m.totalPenalty < 0 ? "text-green-500" : "text-gray-400"}`}>
                {formatCurrency(m.totalPenalty)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
