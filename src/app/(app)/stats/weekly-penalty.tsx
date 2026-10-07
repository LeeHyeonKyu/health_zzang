"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatWeekLabel, formatDateShort, getWeekStart, getWeekEnd, getAllWeeks } from "@/lib/utils";

interface Member { id: string; nickname: string }
interface Workout { user_id: string; date: string; tagged_with?: string[] }
interface WeeklyRule { week_start: string; target_count: number; penalty_per_miss: number; reward_per_extra: number }
interface Exemption { user_id: string; week_start: string; reason: string }

interface Props {
  currentUserId: string;
  seasonStartDate: string;
  seasonEndDate: string | null;
  defaultTargetCount: number;
  defaultPenaltyPerMiss: number;
  defaultRewardPerExtra: number;
  progressivePenalty: boolean;
  progressiveStep: number;
  members: Member[];
  workouts: Workout[];
  weeklyRules: WeeklyRule[];
  exemptions: Exemption[];
}

export default function WeeklyPenalty({
  currentUserId, seasonStartDate, seasonEndDate,
  defaultTargetCount, defaultPenaltyPerMiss, defaultRewardPerExtra, progressivePenalty, progressiveStep,
  members, workouts, weeklyRules, exemptions,
}: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  const ruleMap = useMemo(() => new Map(weeklyRules.map((r) => [r.week_start, r])), [weeklyRules]);
  const exemptionSet = useMemo(() => new Set(exemptions.map((e) => `${e.user_id}:${e.week_start}`)), [exemptions]);
  const exemptionReasonMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of exemptions) m.set(`${e.user_id}:${e.week_start}`, e.reason);
    return m;
  }, [exemptions]);

  const currentWeekStart = useMemo(() => getWeekStart(), []);
  const allWeeks = useMemo(() => getAllWeeks(seasonStartDate, seasonEndDate), [seasonStartDate, seasonEndDate]);
  const currentWeekIdx = useMemo(() => {
    const idx = allWeeks.findIndex((w) => w === currentWeekStart);
    return idx >= 0 ? idx : allWeeks.length - 1;
  }, [allWeeks, currentWeekStart]);

  const selectedWeekIdx = currentWeekIdx + weekOffset;
  const selectedWeek = allWeeks[selectedWeekIdx] ?? allWeeks[allWeeks.length - 1];
  const selectedWeekEnd = selectedWeek ? getWeekEnd(selectedWeek) : "";
  const isCurrentWeek = selectedWeek === currentWeekStart;

  const override = selectedWeek ? ruleMap.get(selectedWeek) : undefined;
  const rule = {
    target: override?.target_count ?? defaultTargetCount,
    penaltyPerMiss: override?.penalty_per_miss ?? defaultPenaltyPerMiss,
    rewardPerExtra: override?.reward_per_extra ?? defaultRewardPerExtra,
  };

  const weeklyData = useMemo(() => {
    if (!selectedWeek) return [];
    return members.map((m) => {
      const exempt = exemptionSet.has(`${m.id}:${selectedWeek}`);
      const reason = exemptionReasonMap.get(`${m.id}:${selectedWeek}`);
      const dates = new Set(
        workouts
          .filter((w) => w.date >= selectedWeek && w.date <= selectedWeekEnd && (w.user_id === m.id || (w.tagged_with ?? []).includes(m.id)))
          .map((w) => w.date)
      );
      const count = dates.size;
      const missed = Math.max(0, rule.target - count);
      const extra = Math.max(0, count - rule.target);
      const missPenalty = progressivePenalty && missed > 0
        ? missed * rule.penaltyPerMiss + progressiveStep * missed * (missed - 1) / 2
        : missed * rule.penaltyPerMiss;
      const penalty = (isCurrentWeek || exempt) ? 0 : missPenalty - extra * rule.rewardPerExtra;
      return { ...m, count, missed, penalty, exempt, exemptReason: reason };
    }).sort((a, b) => {
      if (a.exempt !== b.exempt) return a.exempt ? 1 : -1;
      return b.count - a.count;
    });
  }, [members, workouts, selectedWeek, selectedWeekEnd, rule, isCurrentWeek, exemptionSet, exemptionReasonMap]);

  const weekTotal = weeklyData.filter((m) => !m.exempt).reduce((sum, m) => sum + m.penalty, 0);

  function weekLabel(ws: string): string {
    return `${formatWeekLabel(seasonStartDate, ws)} (${formatDateShort(ws)} ~ ${formatDateShort(getWeekEnd(ws))})`;
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">주별 벌금 상세</h3>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setWeekOffset(weekOffset - 1)} disabled={selectedWeekIdx <= 0} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-gray-500 disabled:opacity-30 text-sm">◀</button>
        <div className="text-center">
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{selectedWeek ? weekLabel(selectedWeek) : ""}</span>
          {isCurrentWeek && (
            <span className="ml-1.5 text-[10px] font-medium text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400 px-1.5 py-0.5 rounded-full">진행 중</span>
          )}
          {weekOffset !== 0 && !isCurrentWeek && (
            <button onClick={() => setWeekOffset(0)} className="ml-1.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline">이번 주</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={selectedWeekIdx >= allWeeks.length - 1} className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-gray-500 disabled:opacity-30 text-sm">▶</button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-lg px-3 py-1.5 mb-3 text-xs text-blue-800 dark:text-blue-200">
        목표 <span className="font-bold">{rule.target}회</span> · 미달 <span className="font-bold">{rule.penaltyPerMiss.toLocaleString()}원</span>/회{progressivePenalty && " (누적)"}
        {rule.rewardPerExtra > 0 && <> · 초과 <span className="font-bold text-green-700 dark:text-green-300">-{rule.rewardPerExtra.toLocaleString()}원</span>/회</>}
      </div>

      <div className="space-y-1">
        {weeklyData.map((m) => (
          <div key={m.id} className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-sm ${m.exempt ? "opacity-50" : ""} ${m.id === currentUserId ? "bg-yellow-50 dark:bg-yellow-950" : ""}`}>
            <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">
              {m.nickname}{m.id === currentUserId && <span className="text-gray-400 ml-0.5">(나)</span>}
              {m.exempt && <span className="ml-0.5 text-teal-600 dark:text-teal-400">🏥</span>}
            </span>
            <div className="flex items-center gap-3">
              {m.exempt ? (
                <span className="text-[10px] text-teal-600 dark:text-teal-400">{m.exemptReason}</span>
              ) : (
                <>
                  <span className={`text-xs font-mono ${m.count >= rule.target ? "text-green-600 dark:text-green-400" : "text-gray-700 dark:text-gray-300"}`}>
                    {m.count}<span className="text-gray-400">/{rule.target}</span>
                  </span>
                  <span className={`text-xs font-mono ${isCurrentWeek ? "text-gray-300 dark:text-gray-600" : m.penalty > 0 ? "text-red-500 dark:text-red-400" : m.penalty < 0 ? "text-green-500 dark:text-green-400" : "text-gray-400"}`}>
                    {isCurrentWeek ? "-" : formatCurrency(m.penalty)}
                    {!isCurrentWeek && progressivePenalty && m.missed > 1 && (
                      <span className="text-[8px] text-gray-400 dark:text-gray-500 ml-0.5">
                        ({Array.from({ length: m.missed }, (_, i) => i + 1).join("+")})
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
        {!isCurrentWeek && (
          <div className="flex items-center justify-between py-1.5 px-2 border-t border-gray-100 dark:border-gray-800 mt-1">
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">합계</span>
            <span className={`text-xs font-mono font-bold ${weekTotal > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400"}`}>{formatCurrency(weekTotal)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
