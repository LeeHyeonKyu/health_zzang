"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { todayStr } from "@/lib/utils";

export default function CreateSeasonForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get("name"),
      start_date: form.get("start_date"),
      default_target_count: Number(form.get("default_target_count")),
      default_penalty_per_miss: Number(form.get("default_penalty_per_miss")),
      default_reward_per_extra: Number(form.get("default_reward_per_extra")) || 0,
    };

    const res = await fetch("/api/season", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message ?? "시즌 생성에 실패했습니다");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">시즌 이름</label>
        <input name="name" placeholder="예: 시즌 1" required className="input-base mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">시작일</label>
          <input name="start_date" type="date" defaultValue={todayStr()} required className="input-base mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">종료일 (선택)</label>
          <input name="end_date" type="date" className="input-base mt-1" />
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">기본 벌금 규칙</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">주간 목표</label>
            <div className="relative mt-1">
              <input name="default_target_count" type="number" min="1" defaultValue="3" required className="input-base" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">회</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">미달 벌금</label>
            <div className="relative mt-1">
              <input name="default_penalty_per_miss" type="number" min="0" step="1000" defaultValue="1000" required className="input-base" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">원</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">초과 차감</label>
            <div className="relative mt-1">
              <input name="default_reward_per_extra" type="number" min="0" step="1000" defaultValue="0" className="input-base" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">원</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? "생성 중..." : "시즌 시작"}
      </button>
    </form>
  );
}
