"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Member {
  id: string;
  nickname: string;
  count: number;
  totalPenalty: number;
}

export default function Ranking({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const [sortBy, setSortBy] = useState<"count" | "penalty">("count");

  const sorted = [...members].sort((a, b) => {
    if (sortBy === "count") return b.count - a.count;
    return a.totalPenalty - b.totalPenalty;
  });

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">크루 랭킹</h3>
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
          <button
            onClick={() => setSortBy("count")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              sortBy === "count"
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            운동 횟수
          </button>
          <button
            onClick={() => setSortBy("penalty")}
            className={`px-3 py-1.5 font-medium transition-colors ${
              sortBy === "penalty"
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            벌금
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-3 py-1.5 px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          <span className="w-6" />
          <span className="flex-1">크루원</span>
          <span className="w-14 text-right">운동</span>
          <span className="w-20 text-right">벌금</span>
        </div>
        {sorted.map((m, i) => (
          <div key={m.id} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${m.id === currentUserId ? "bg-yellow-50 dark:bg-yellow-950" : ""}`}>
            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
              i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 text-white" : i === 2 ? "bg-amber-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            }`}>
              {i + 1}
            </span>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {m.nickname}
              {m.id === currentUserId && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(나)</span>}
            </span>
            <span className="w-14 text-right text-sm font-mono font-semibold text-gray-700 dark:text-gray-300">{m.count}회</span>
            <span className={`w-20 text-right text-xs font-mono font-semibold ${
              m.totalPenalty > 0 ? "text-red-500 dark:text-red-400" : m.totalPenalty < 0 ? "text-green-500 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
            }`}>
              {formatCurrency(m.totalPenalty)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
