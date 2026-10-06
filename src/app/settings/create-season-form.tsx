"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <input name="name" placeholder="시즌 이름 (예: 시즌 1)" required className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900" />
      <input name="start_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900" />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500">목표 횟수</label>
          <input name="default_target_count" type="number" min="1" defaultValue="3" required className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900" />
        </div>
        <div>
          <label className="text-xs text-gray-500">미달 벌금(원)</label>
          <input name="default_penalty_per_miss" type="number" min="0" step="100" defaultValue="1000" required className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900" />
        </div>
        <div>
          <label className="text-xs text-gray-500">초과 차감(원)</label>
          <input name="default_reward_per_extra" type="number" min="0" step="100" defaultValue="0" className="w-full px-3 py-2 rounded border border-gray-300 text-sm bg-white text-gray-900" />
        </div>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {loading ? "생성 중..." : "시즌 시작"}
      </button>
    </form>
  );
}
