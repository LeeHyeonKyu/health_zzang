"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  seasonName: string;
  daysElapsed: number;
  weeksElapsed: number;
  memberCount: number;
  grandTotal: number;
  myCount: number;
  myAvgPerWeek: number;
  myPenalty: number;
  myAchievementRate: number;
}

export default function StatsHeader({
  seasonName, daysElapsed, weeksElapsed, memberCount, grandTotal,
  myCount, myAvgPerWeek, myPenalty, myAchievementRate,
}: Props) {
  const [view, setView] = useState<"season" | "me">("me");

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-blue-800 dark:text-blue-200">{seasonName}</h2>
        <div className="flex rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden text-[10px]">
          <button
            onClick={() => setView("me")}
            className={`px-2.5 py-1 font-semibold transition-colors ${
              view === "me" ? "bg-blue-600 text-white" : "text-blue-600 dark:text-blue-400"
            }`}
          >
            내 통계
          </button>
          <button
            onClick={() => setView("season")}
            className={`px-2.5 py-1 font-semibold transition-colors ${
              view === "season" ? "bg-blue-600 text-white" : "text-blue-600 dark:text-blue-400"
            }`}
          >
            시즌
          </button>
        </div>
      </div>

      {view === "season" ? (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{daysElapsed}</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">경과일</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{weeksElapsed}</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">경과주</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{memberCount}</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">참여</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${grandTotal > 0 ? "text-red-600 dark:text-red-400" : grandTotal < 0 ? "text-green-600 dark:text-green-400" : "text-blue-900 dark:text-blue-100"}`}>
              {formatCurrency(grandTotal)}
            </p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">총 벌금</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{myCount}회</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">총 운동</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{myAvgPerWeek}</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">주당 평균</p>
          </div>
          <div>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{myAchievementRate}%</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">달성률</p>
          </div>
          <div>
            <p className={`text-xl font-bold ${myPenalty > 0 ? "text-red-600 dark:text-red-400" : myPenalty < 0 ? "text-green-600 dark:text-green-400" : "text-blue-900 dark:text-blue-100"}`}>
              {formatCurrency(myPenalty)}
            </p>
            <p className="text-[10px] text-blue-600 dark:text-blue-400">벌금</p>
          </div>
        </div>
      )}
    </div>
  );
}
