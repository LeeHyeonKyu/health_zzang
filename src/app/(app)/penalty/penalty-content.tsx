"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatWeekLabel, formatDateShort } from "@/lib/utils";
import { calcMemberPenalties } from "@/lib/penalty";

type PenaltyView = "cumulative" | "weekly";

interface Member { id: string; nickname: string }
interface Workout { user_id: string; date: string }
interface WeeklyRule { week_start: string; target_count: number; penalty_per_miss: number; reward_per_extra: number }
interface Exemption { user_id: string; week_start: string; reason: string }

interface Props {
  currentUserId: string;
  seasonName: string;
  seasonStartDate: string;
  seasonEndDate: string | null;
  defaultTargetCount: number;
  defaultPenaltyPerMiss: number;
  defaultRewardPerExtra: number;
  members: Member[];
  workouts: Workout[];
  weeklyRules: WeeklyRule[];
  exemptions: Exemption[];
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return toDateStr(d);
}

export default function PenaltyContent({
  currentUserId, seasonName, seasonStartDate, seasonEndDate,
  defaultTargetCount, defaultPenaltyPerMiss, defaultRewardPerExtra,
  members, workouts, weeklyRules, exemptions,
}: Props) {
  const [view, setView] = useState<PenaltyView>("cumulative");
  const [weekOffset, setWeekOffset] = useState(0);

  const ruleMap = useMemo(() => new Map(weeklyRules.map((r) => [r.week_start, r])), [weeklyRules]);
  const exemptionSet = useMemo(() => {
    const s = new Set<string>();
    for (const e of exemptions) s.add(`${e.user_id}:${e.week_start}`);
    return s;
  }, [exemptions]);
  const exemptionReasonMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of exemptions) m.set(`${e.user_id}:${e.week_start}`, e.reason);
    return m;
  }, [exemptions]);

  function isExempted(userId: string, weekStart: string): boolean {
    return exemptionSet.has(`${userId}:${weekStart}`);
  }

  function getExemptionReason(userId: string, weekStart: string): string | undefined {
    return exemptionReasonMap.get(`${userId}:${weekStart}`);
  }

  function getRuleForWeek(ws: string) {
    const override = ruleMap.get(ws);
    return {
      target: override?.target_count ?? defaultTargetCount,
      penaltyPerMiss: override?.penalty_per_miss ?? defaultPenaltyPerMiss,
      rewardPerExtra: override?.reward_per_extra ?? defaultRewardPerExtra,
    };
  }

  const currentWeekStart = useMemo(() => toDateStr(getMonday(new Date())), []);

  const allWeeks = useMemo(() => {
    const weeks: string[] = [];
    const endDate = seasonEndDate ?? toDateStr(new Date());
    const start = getMonday(new Date(seasonStartDate + "T00:00:00"));
    const d = new Date(start);
    while (d <= new Date(endDate + "T00:00:00")) {
      weeks.push(toDateStr(d));
      d.setDate(d.getDate() + 7);
    }
    return weeks;
  }, [seasonStartDate, seasonEndDate]);

  const currentWeekIdx = useMemo(() => {
    const idx = allWeeks.findIndex((w) => w === currentWeekStart);
    return idx >= 0 ? idx : allWeeks.length - 1;
  }, [allWeeks, currentWeekStart]);

  const selectedWeekIdx = currentWeekIdx + weekOffset;
  const selectedWeek = allWeeks[selectedWeekIdx] ?? allWeeks[allWeeks.length - 1];
  const selectedWeekEnd = selectedWeek ? getWeekEnd(selectedWeek) : "";
  const selectedRule = selectedWeek ? getRuleForWeek(selectedWeek) : { target: 0, penaltyPerMiss: 0, rewardPerExtra: 0 };
  const isSelectedWeekCurrent = selectedWeek === currentWeekStart;

  function calcPenalty(workoutCount: number, rule: { target: number; penaltyPerMiss: number; rewardPerExtra: number }) {
    const missed = Math.max(0, rule.target - workoutCount);
    const extra = Math.max(0, workoutCount - rule.target);
    return missed * rule.penaltyPerMiss - extra * rule.rewardPerExtra;
  }

  const cumulativeData = useMemo(() => {
    return calcMemberPenalties({
      seasonStartDate,
      seasonEndDate,
      defaultTargetCount,
      defaultPenaltyPerMiss,
      defaultRewardPerExtra,
      members,
      workouts,
      weeklyRules,
      exemptions: exemptions.map((e) => ({ user_id: e.user_id, week_start: e.week_start })),
    }).sort((a, b) => b.totalPenalty - a.totalPenalty);
  }, [seasonStartDate, seasonEndDate, defaultTargetCount, defaultPenaltyPerMiss, defaultRewardPerExtra, members, workouts, weeklyRules, exemptions]);

  const weeklyData = useMemo(() => {
    if (!selectedWeek) return [];
    return members.map((m) => {
      const exempt = isExempted(m.id, selectedWeek);
      const reason = getExemptionReason(m.id, selectedWeek);
      const count = workouts.filter((w) => w.user_id === m.id && w.date >= selectedWeek && w.date <= selectedWeekEnd).length;
      const penalty = (isSelectedWeekCurrent || exempt) ? 0 : calcPenalty(count, selectedRule);
      return { ...m, count, penalty, exempt, exemptReason: reason };
    }).sort((a, b) => {
      if (a.exempt !== b.exempt) return a.exempt ? 1 : -1;
      return b.count - a.count;
    });
  }, [members, workouts, selectedWeek, selectedWeekEnd, selectedRule, isSelectedWeekCurrent, exemptions]);

  const grandTotal = cumulativeData.reduce((sum, m) => sum + m.totalPenalty, 0);
  const weekTotal = weeklyData.filter((m) => !m.exempt).reduce((sum, m) => sum + m.penalty, 0);

  function weekLabel(ws: string): string {
    const num = formatWeekLabel(seasonStartDate, ws);
    return `${num} (${formatDateShort(ws)} ~ ${formatDateShort(getWeekEnd(ws))})`;
  }

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 dark:bg-[#1f1f1f] rounded-lg p-0.5 mb-4">
        {(["cumulative", "weekly"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              view === v ? "bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {v === "cumulative" ? "시즌 누적" : "주간 상세"}
          </button>
        ))}
      </div>

      {view === "cumulative" && (
        <div>
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{seasonName}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">완료된 주까지의 누적 (진행 중인 주 제외, 면제 주 제외)</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#111] border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">크루원</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">운동</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">벌금</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {cumulativeData.map((m) => (
                  <tr key={m.id} className={m.id === currentUserId ? "bg-yellow-50 dark:bg-yellow-950" : ""}>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {m.nickname}{m.id === currentUserId && <span className="text-xs text-gray-400 ml-1">(나)</span>}
                      {m.exemptedWeeks > 0 && <span className="text-[10px] text-teal-600 dark:text-teal-400 ml-1">🏥{m.exemptedWeeks}주</span>}
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-mono font-semibold text-gray-700 dark:text-gray-300">{m.totalWorkouts}회</td>
                    <td className={`py-3 px-4 text-right text-sm font-mono font-semibold ${m.totalPenalty > 0 ? "text-red-600 dark:text-red-400" : m.totalPenalty < 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                      {formatCurrency(m.totalPenalty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111]">
                  <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">합계</td>
                  <td />
                  <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${grandTotal > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
                    {formatCurrency(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {view === "weekly" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setWeekOffset(weekOffset - 1)} disabled={selectedWeekIdx <= 0} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-gray-500 disabled:opacity-30">◀</button>
            <div className="text-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedWeek ? weekLabel(selectedWeek) : ""}</span>
              {isSelectedWeekCurrent && (
                <span className="ml-2 text-[10px] font-medium text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400 px-1.5 py-0.5 rounded-full">진행 중</span>
              )}
              {weekOffset !== 0 && !isSelectedWeekCurrent && (
                <button onClick={() => setWeekOffset(0)} className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">이번 주</button>
              )}
            </div>
            <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={selectedWeekIdx >= allWeeks.length - 1} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-gray-500 disabled:opacity-30">▶</button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-2 mb-4 text-sm text-blue-800 dark:text-blue-200">
            목표 <span className="font-bold">{selectedRule.target}회</span> · 미달 <span className="font-bold">{selectedRule.penaltyPerMiss.toLocaleString()}원</span>/회
            {selectedRule.rewardPerExtra > 0 && <> · 초과 <span className="font-bold text-green-700 dark:text-green-300">-{selectedRule.rewardPerExtra.toLocaleString()}원</span>/회</>}
          </div>

          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#111] border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">크루원</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">인증</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    {isSelectedWeekCurrent ? "벌금 (집계 전)" : "벌금"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {weeklyData.map((m) => (
                  <tr key={m.id} className={`${m.exempt ? "opacity-60" : ""} ${m.id === currentUserId ? "bg-yellow-50 dark:bg-yellow-950" : ""}`}>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {m.nickname}{m.id === currentUserId && <span className="text-xs text-gray-400 ml-1">(나)</span>}
                      {m.exempt && <span className="ml-1 text-[10px] text-teal-600 dark:text-teal-400">🏥</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.exempt ? (
                        <span className="text-xs text-teal-600 dark:text-teal-400">면제</span>
                      ) : (
                        <span className={`text-sm font-mono font-semibold ${m.count >= selectedRule.target ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-gray-100"}`}>
                          {m.count}<span className="text-gray-400">/{selectedRule.target}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-mono font-semibold">
                      {m.exempt ? (
                        <span className="text-teal-600 dark:text-teal-400 text-xs font-normal">{m.exemptReason}</span>
                      ) : isSelectedWeekCurrent ? (
                        <span className="text-gray-300 dark:text-gray-600">-</span>
                      ) : (
                        <span className={m.penalty > 0 ? "text-red-600 dark:text-red-400" : m.penalty < 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
                          {formatCurrency(m.penalty)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {!isSelectedWeekCurrent && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111]">
                    <td className="py-3 px-4 text-sm font-bold text-gray-900 dark:text-gray-100">합계</td>
                    <td />
                    <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${weekTotal > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500"}`}>
                      {formatCurrency(weekTotal)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
