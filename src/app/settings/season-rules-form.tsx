"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  seasonId: string;
  defaultValues: {
    default_target_count: number;
    default_penalty_per_miss: number;
    default_reward_per_extra: number;
  };
  weekStart: string;
  currentOverride: {
    target_count: number;
    penalty_per_miss: number;
    reward_per_extra: number;
  } | null;
}

export default function SeasonRulesForm({ seasonId, defaultValues, weekStart, currentOverride }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [defaultLoading, setDefaultLoading] = useState(false);
  const [defaultMessage, setDefaultMessage] = useState("");

  async function handleDefaultSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDefaultLoading(true);
    setDefaultMessage("");

    const form = new FormData(e.currentTarget);
    const body = {
      season_id: seasonId,
      action: "update_defaults",
      default_target_count: Number(form.get("default_target_count")),
      default_penalty_per_miss: Number(form.get("default_penalty_per_miss")),
      default_reward_per_extra: Number(form.get("default_reward_per_extra")) || 0,
    };

    const res = await fetch("/api/season", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setDefaultMessage("기본 규칙이 변경되었습니다.");
      router.refresh();
    } else {
      setDefaultMessage("변경에 실패했습니다.");
    }
    setDefaultLoading(false);
  }

  async function handleOverrideSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      setMessage("변경에 실패했습니다.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">시즌 기본 규칙</h3>
        <p className="text-xs text-gray-500 mb-3">모든 주에 적용되는 기본 규칙입니다.</p>
        <form onSubmit={handleDefaultSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">주간 목표</label>
              <div className="relative mt-1">
                <input name="default_target_count" type="number" min="1" defaultValue={defaultValues.default_target_count} required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">회</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">미달 벌금</label>
              <div className="relative mt-1">
                <input name="default_penalty_per_miss" type="number" min="0" step="100" defaultValue={defaultValues.default_penalty_per_miss} required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">초과 차감</label>
              <div className="relative mt-1">
                <input name="default_reward_per_extra" type="number" min="0" step="100" defaultValue={defaultValues.default_reward_per_extra} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
            </div>
          </div>
          {defaultMessage && <p className="text-sm text-green-600">{defaultMessage}</p>}
          <button type="submit" disabled={defaultLoading} className="w-full py-2.5 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 transition-colors">
            {defaultLoading ? "저장 중..." : "기본 규칙 저장"}
          </button>
        </form>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-900 mb-1">이번 주 규칙 변경</h3>
        <p className="text-xs text-gray-500 mb-3">
          {currentOverride
            ? `현재 이번 주만 별도 규칙 적용 중 (주 ${currentOverride.target_count}회)`
            : "시즌 기본 규칙이 적용 중입니다. 이번 주만 다르게 설정하려면 아래에서 변경하세요."}
        </p>
        <form onSubmit={handleOverrideSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">주간 목표</label>
              <div className="relative mt-1">
                <input name="target_count" type="number" min="1" defaultValue={currentOverride?.target_count ?? defaultValues.default_target_count} required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">회</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">미달 벌금</label>
              <div className="relative mt-1">
                <input name="penalty_per_miss" type="number" min="0" step="100" defaultValue={currentOverride?.penalty_per_miss ?? defaultValues.default_penalty_per_miss} required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">초과 차감</label>
              <div className="relative mt-1">
                <input name="reward_per_extra" type="number" min="0" step="100" defaultValue={currentOverride?.reward_per_extra ?? defaultValues.default_reward_per_extra} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
            </div>
          </div>
          {message && <p className="text-sm text-green-600">{message}</p>}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? "변경 중..." : "이번 주만 규칙 변경"}
          </button>
        </form>
      </div>
    </div>
  );
}
