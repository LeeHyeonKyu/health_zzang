"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  seasonId: string;
  weekStart: string;
  defaultValues: {
    target_count: number;
    penalty_per_miss: number;
    reward_per_extra: number;
  };
}

export default function WeeklyRuleForm({ seasonId, weekStart, defaultValues }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(e.currentTarget);
    const body = {
      season_id: seasonId,
      week_start: weekStart,
      target_count: Number(form.get("target_count")),
      penalty_per_miss: Number(form.get("penalty_per_miss")),
      reward_per_extra: Number(form.get("reward_per_extra")) || 0,
    };

    const res = await fetch("/api/weekly-rule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setMessage("이번 주 규칙이 변경되었습니다.");
      router.refresh();
    } else {
      setMessage("규칙 변경에 실패했습니다.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500">목표 횟수</label>
          <input name="target_count" type="number" min="1" defaultValue={defaultValues.target_count} required className="input-base" />
        </div>
        <div>
          <label className="text-xs text-gray-500">미달 벌금(원)</label>
          <input name="penalty_per_miss" type="number" min="0" step="1000" defaultValue={defaultValues.penalty_per_miss} required className="input-base" />
        </div>
        <div>
          <label className="text-xs text-gray-500">초과 차감(원)</label>
          <input name="reward_per_extra" type="number" min="0" step="1000" defaultValue={defaultValues.reward_per_extra} className="input-base" />
        </div>
      </div>
      {message && <p className="text-sm text-green-600">{message}</p>}
      <button type="submit" disabled={loading} className="w-full py-2 rounded bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 transition-colors">
        {loading ? "변경 중..." : "이번 주 규칙 변경"}
      </button>
    </form>
  );
}
