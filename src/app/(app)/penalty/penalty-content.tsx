"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

type PenaltyView = "cumulative" | "weekly";

interface Member { id: string; nickname: string }
interface Workout { user_id: string; date: string }
interface WeeklyRule { week_start: string; target_count: number; penalty_per_miss: number; reward_per_extra: number }

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
  currentUserId,
  seasonName,
  seasonStartDate,
  seasonEndDate,
  defaultTargetCount,
  defaultPenaltyPerMiss,
  defaultRewardPerExtra,
  members,
  workouts,
  weeklyRules,
}: Props) {
  const [view, setView] = useState<PenaltyView>("cumulative");
  const [weekOffset, setWeekOffset] = useState(0);

  const ruleMap = useMemo(() => new Map(weeklyRules.map((r) => [r.week_start, r])), [weeklyRules]);

  function getRuleForWeek(ws: string) {
    const override = ruleMap.get(ws);
    return {
      target: override?.target_count ?? defaultTargetCount,
      penaltyPerMiss: override?.penalty_per_miss ?? defaultPenaltyPerMiss,
      rewardPerExtra: override?.reward_per_extra ?? defaultRewardPerExtra,
    };
  }

  const allWeeks = useMemo(() => {
    const weeks: string[] = [];
    const endDate = seasonEndDate ?? toDateStr(new Date());
    const start = getMonday(new Date(seasonStartDate + "T00:00:00"));
    const end = new Date(endDate + "T00:00:00");
    const d = new Date(start);
    while (d <= end) {
      weeks.push(toDateStr(d));
      d.setDate(d.getDate() + 7);
    }
    return weeks;
  }, [seasonStartDate, seasonEndDate]);

  const currentWeekIdx = useMemo(() => {
    const now = getMonday(new Date());
    const idx = allWeeks.findIndex((w) => w === toDateStr(now));
    return idx >= 0 ? idx : allWeeks.length - 1;
  }, [allWeeks]);

  const selectedWeekIdx = currentWeekIdx + weekOffset;
  const selectedWeek = allWeeks[selectedWeekIdx] ?? allWeeks[allWeeks.length - 1];
  const selectedWeekEnd = selectedWeek ? getWeekEnd(selectedWeek) : "";
  const selectedRule = selectedWeek ? getRuleForWeek(selectedWeek) : { target: 0, penaltyPerMiss: 0, rewardPerExtra: 0 };

  function calcPenalty(workoutCount: number, rule: { target: number; penaltyPerMiss: number; rewardPerExtra: number }) {
    const missed = Math.max(0, rule.target - workoutCount);
    const extra = Math.max(0, workoutCount - rule.target);
    return missed * rule.penaltyPerMiss - extra * rule.rewardPerExtra;
  }

  const cumulativeData = useMemo(() => {
    return members.map((m) => {
      let totalPenalty = 0;
      let totalWorkouts = 0;
      for (const ws of allWeeks) {
        const we = getWeekEnd(ws);
        const rule = getRuleForWeek(ws);
        const count = workouts.filter((w) => w.user_id === m.id && w.date >= ws && w.date <= we).length;
        totalWorkouts += count;
        totalPenalty += calcPenalty(count, rule);
      }
      return { ...m, totalWorkouts, totalPenalty };
    }).sort((a, b) => b.totalPenalty - a.totalPenalty);
  }, [members, allWeeks, workouts]);

  const weeklyData = useMemo(() => {
    if (!selectedWeek) return [];
    return members.map((m) => {
      const count = workouts.filter((w) => w.user_id === m.id && w.date >= selectedWeek && w.date <= selectedWeekEnd).length;
      const penalty = calcPenalty(count, selectedRule);
      return { ...m, count, penalty };
    }).sort((a, b) => b.penalty - a.penalty);
  }, [members, workouts, selectedWeek, selectedWeekEnd, selectedRule]);

  const grandTotal = cumulativeData.reduce((sum, m) => sum + m.totalPenalty, 0);
  const weekTotal = weeklyData.reduce((sum, m) => sum + m.penalty, 0);

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-4">
        {(["cumulative", "weekly"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v === "cumulative" ? "시즌 누적" : "주간 상세"}
          </button>
        ))}
      </div>

      {view === "cumulative" && (
        <div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-bold text-blue-800">{seasonName}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">크루원</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">운동</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">벌금</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cumulativeData.map((m) => (
                  <tr key={m.id} className={m.id === currentUserId ? "bg-yellow-50" : "hover:bg-gray-50"}>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {m.nickname}{m.id === currentUserId && <span className="text-xs text-gray-400 ml-1">(나)</span>}
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-mono font-semibold text-gray-700">{m.totalWorkouts}회</td>
                    <td className={`py-3 px-4 text-right text-sm font-mono font-semibold ${m.totalPenalty > 0 ? "text-red-600" : m.totalPenalty < 0 ? "text-green-600" : "text-gray-400"}`}>
                      {formatCurrency(m.totalPenalty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-3 px-4 text-sm font-bold text-gray-900">합계</td>
                  <td />
                  <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${grandTotal > 0 ? "text-red-600" : grandTotal < 0 ? "text-green-600" : "text-gray-500"}`}>
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
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              disabled={selectedWeekIdx <= 0}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30"
            >◀</button>
            <div className="text-center">
              <span className="text-sm font-semibold text-gray-900">
                {selectedWeek ? `${formatDate(selectedWeek)} ~ ${formatDate(selectedWeekEnd)}` : ""}
              </span>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="ml-2 text-xs text-blue-600 hover:underline">이번 주</button>
              )}
            </div>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={selectedWeekIdx >= allWeeks.length - 1}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 disabled:opacity-30"
            >▶</button>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 mb-4 text-sm text-blue-800">
            목표 <span className="font-bold">{selectedRule.target}회</span> · 미달 <span className="font-bold">{selectedRule.penaltyPerMiss.toLocaleString()}원</span>/회
            {selectedRule.rewardPerExtra > 0 && <> · 초과 <span className="font-bold text-green-700">-{selectedRule.rewardPerExtra.toLocaleString()}원</span>/회</>}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">크루원</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">인증</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">벌금</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {weeklyData.map((m) => (
                  <tr key={m.id} className={m.id === currentUserId ? "bg-yellow-50" : "hover:bg-gray-50"}>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {m.nickname}{m.id === currentUserId && <span className="text-xs text-gray-400 ml-1">(나)</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-mono font-semibold ${m.count >= selectedRule.target ? "text-green-600" : "text-gray-900"}`}>
                        {m.count}<span className="text-gray-400">/{selectedRule.target}</span>
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right text-sm font-mono font-semibold ${m.penalty > 0 ? "text-red-600" : m.penalty < 0 ? "text-green-600" : "text-gray-400"}`}>
                      {formatCurrency(m.penalty)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-3 px-4 text-sm font-bold text-gray-900">합계</td>
                  <td />
                  <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${weekTotal > 0 ? "text-red-600" : weekTotal < 0 ? "text-green-600" : "text-gray-500"}`}>
                    {formatCurrency(weekTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
