import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

interface WeekPenalty {
  weekStart: string;
  userId: string;
  nickname: string;
  workoutCount: number;
  targetCount: number;
  penaltyPerMiss: number;
  rewardPerExtra: number;
  penalty: number;
}

export default async function SeasonPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: seasons } = await supabase
    .from("season")
    .select("*")
    .eq("crew_id", profile.crew_id)
    .order("start_date", { ascending: false });

  if (!seasons || seasons.length === 0) {
    return (
      <div className="min-h-dvh px-4 py-6 max-w-lg mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">📊 시즌</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">← 대시보드</Link>
        </header>
        <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500">
          <p>아직 시즌이 없습니다.</p>
          <Link href="/settings" className="text-blue-600 hover:underline text-sm mt-2 inline-block">새 시즌 시작하기</Link>
        </div>
      </div>
    );
  }

  const activeSeason = seasons.find((s) => s.is_active) ?? seasons[0];

  const { data: members } = await supabase
    .from("profiles")
    .select("id, nickname")
    .eq("crew_id", profile.crew_id);

  const { data: workouts } = await supabase
    .from("workout")
    .select("user_id, date")
    .eq("season_id", activeSeason.id);

  const { data: weeklyRules } = await supabase
    .from("weekly_rule")
    .select("*")
    .eq("season_id", activeSeason.id);

  const weeks = getSeasonWeeks(activeSeason.start_date, activeSeason.end_date ?? new Date().toISOString().split("T")[0]);

  const weekPenalties: WeekPenalty[] = [];
  for (const week of weeks) {
    const override = weeklyRules?.find((r) => r.week_start === week);
    const targetCount = override?.target_count ?? activeSeason.default_target_count;
    const penaltyPerMiss = override?.penalty_per_miss ?? activeSeason.default_penalty_per_miss;
    const rewardPerExtra = override?.reward_per_extra ?? activeSeason.default_reward_per_extra;
    const weekEnd = getWeekEnd(week);

    for (const member of members ?? []) {
      const count = workouts?.filter(
        (w) => w.user_id === member.id && w.date >= week && w.date <= weekEnd
      ).length ?? 0;

      const missed = Math.max(0, targetCount - count);
      const extra = Math.max(0, count - targetCount);
      const penalty = missed * penaltyPerMiss - extra * rewardPerExtra;

      weekPenalties.push({
        weekStart: week,
        userId: member.id,
        nickname: member.nickname,
        workoutCount: count,
        targetCount,
        penaltyPerMiss,
        rewardPerExtra,
        penalty,
      });
    }
  }

  const memberTotals = (members ?? []).map((m) => ({
    nickname: m.nickname,
    total: weekPenalties.filter((wp) => wp.userId === m.id).reduce((sum, wp) => sum + wp.penalty, 0),
  })).sort((a, b) => b.total - a.total);

  const grandTotal = memberTotals.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="min-h-dvh px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">📊 시즌</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">← 대시보드</Link>
      </header>

      <div className="mb-4">
        <select
          className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900"
          defaultValue={activeSeason.id}
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.is_active ? "(진행 중)" : `(${s.start_date} ~ ${s.end_date})`}
            </option>
          ))}
        </select>
      </div>

      <section className="bg-white border rounded-lg p-4 mb-4">
        <h2 className="font-semibold mb-3">시즌 누적 벌금</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">크루원</th>
              <th className="text-right py-2">누적 벌금</th>
            </tr>
          </thead>
          <tbody>
            {memberTotals.map((m) => (
              <tr key={m.nickname} className="border-b last:border-0">
                <td className="py-2">{m.nickname}</td>
                <td className={`py-2 text-right font-mono ${m.total > 0 ? "text-red-600" : m.total < 0 ? "text-green-600" : "text-gray-500"}`}>
                  {formatCurrency(m.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="py-2">합계</td>
              <td className="py-2 text-right font-mono">{formatCurrency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-3">주별 기록</h2>
        <div className="space-y-3">
          {weeks.slice().reverse().map((week) => {
            const weekData = weekPenalties.filter((wp) => wp.weekStart === week);
            const weekTotal = weekData.reduce((sum, wp) => sum + wp.penalty, 0);
            const rule = weekData[0];
            return (
              <details key={week} className="border rounded p-3">
                <summary className="flex justify-between cursor-pointer text-sm">
                  <span>{formatDate(week)} 주</span>
                  <span className={`font-mono ${weekTotal > 0 ? "text-red-600" : weekTotal < 0 ? "text-green-600" : "text-gray-500"}`}>
                    {formatCurrency(weekTotal)}
                  </span>
                </summary>
                <div className="mt-2 text-xs text-gray-500 mb-2">
                  목표 {rule?.targetCount}회 / 미달 {rule?.penaltyPerMiss.toLocaleString()}원 / 초과 -{rule?.rewardPerExtra.toLocaleString()}원
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {weekData.map((wp) => (
                      <tr key={wp.userId} className="border-b last:border-0">
                        <td className="py-1">{wp.nickname}</td>
                        <td className="py-1 text-center">{wp.workoutCount}/{wp.targetCount}회</td>
                        <td className={`py-1 text-right font-mono ${wp.penalty > 0 ? "text-red-600" : wp.penalty < 0 ? "text-green-600" : "text-gray-500"}`}>
                          {formatCurrency(wp.penalty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function getSeasonWeeks(startDate: string, endDate: string): string[] {
  const weeks: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const current = new Date(start);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);

  while (current <= end) {
    weeks.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}
