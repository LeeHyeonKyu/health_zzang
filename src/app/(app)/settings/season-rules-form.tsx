"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WeekRule {
  weekStart: string;
  weekLabel: string;
  target_count: number;
  penalty_per_miss: number;
  reward_per_extra: number;
  isOverride: boolean;
}

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
  pastWeeks: WeekRule[];
}

export default function SeasonRulesForm({ seasonId, defaultValues, weekStart, currentOverride, pastWeeks }: Props) {
  const router = useRouter();
  const [defaultLoading, setDefaultLoading] = useState(false);
  const [defaultMessage, setDefaultMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [weekMessage, setWeekMessage] = useState("");

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
    setDefaultMessage(res.ok ? "기본 규칙이 변경되었습니다. (지난 주 기록은 보존됩니다)" : "변경에 실패했습니다.");
    setDefaultLoading(false);
    if (res.ok) router.refresh();
  }

  async function handleOverrideSubmit(e: React.FormEvent<HTMLFormElement>, targetWeek: string) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setWeekMessage("");

    const form = new FormData(e.currentTarget);
    const body = {
      season_id: seasonId,
      week_start: targetWeek,
      target_count: Number(form.get("target_count")),
      penalty_per_miss: Number(form.get("penalty_per_miss")),
      reward_per_extra: Number(form.get("reward_per_extra")) || 0,
    };

    const res = await fetch("/api/weekly-rule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const isCurrentWeek = targetWeek === weekStart;
    if (isCurrentWeek) {
      setMessage(res.ok ? "이번 주 규칙이 변경되었습니다." : "변경에 실패했습니다.");
    } else {
      setWeekMessage(res.ok ? "규칙이 변경되었습니다." : "변경에 실패했습니다.");
    }
    setLoading(false);
    if (res.ok) {
      setEditingWeek(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">시즌 기본 규칙</h3>
        <p className="text-xs text-gray-500 mb-3">앞으로 적용될 기본 규칙입니다. 변경해도 지난 주 기록은 보존됩니다.</p>
        <form onSubmit={handleDefaultSubmit} className="space-y-3">
          <RuleInputs
            prefix="default_"
            defaults={{ target_count: defaultValues.default_target_count, penalty_per_miss: defaultValues.default_penalty_per_miss, reward_per_extra: defaultValues.default_reward_per_extra }}
          />
          {defaultMessage && <p className={`text-sm ${defaultMessage.includes("실패") ? "text-red-500" : "text-green-600"}`}>{defaultMessage}</p>}
          <button type="submit" disabled={defaultLoading} className="w-full py-2.5 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 transition-colors">
            {defaultLoading ? "저장 중..." : "기본 규칙 저장"}
          </button>
        </form>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-bold text-gray-900 mb-1">이번 주 규칙</h3>
        <p className="text-xs text-gray-500 mb-3">
          {currentOverride
            ? `별도 규칙 적용 중 (주 ${currentOverride.target_count}회)`
            : "시즌 기본 규칙 적용 중"}
        </p>
        <form onSubmit={(e) => handleOverrideSubmit(e, weekStart)} className="space-y-3">
          <RuleInputs
            prefix=""
            defaults={{ target_count: currentOverride?.target_count ?? defaultValues.default_target_count, penalty_per_miss: currentOverride?.penalty_per_miss ?? defaultValues.default_penalty_per_miss, reward_per_extra: currentOverride?.reward_per_extra ?? defaultValues.default_reward_per_extra }}
          />
          {message && <p className={`text-sm ${message.includes("실패") ? "text-red-500" : "text-green-600"}`}>{message}</p>}
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? "변경 중..." : "이번 주 규칙 변경"}
          </button>
        </form>
      </div>

      {pastWeeks.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">지난 주별 규칙</h3>
          <div className="space-y-2">
            {pastWeeks.map((week) => (
              <div key={week.weekStart} className="border border-gray-100 rounded-lg p-3">
                {editingWeek === week.weekStart ? (
                  <form onSubmit={(e) => handleOverrideSubmit(e, week.weekStart)} className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{week.weekLabel}</span>
                      <button type="button" onClick={() => setEditingWeek(null)} className="text-xs text-gray-400 hover:text-gray-600">취소</button>
                    </div>
                    <RuleInputs prefix="" defaults={{ target_count: week.target_count, penalty_per_miss: week.penalty_per_miss, reward_per_extra: week.reward_per_extra }} />
                    {weekMessage && <p className={`text-sm ${weekMessage.includes("실패") ? "text-red-500" : "text-green-600"}`}>{weekMessage}</p>}
                    <button type="submit" disabled={loading} className="w-full py-2 rounded-lg bg-gray-700 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
                      {loading ? "저장 중..." : "저장"}
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{week.weekLabel}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {week.target_count}회 / {week.penalty_per_miss.toLocaleString()}원
                        {week.reward_per_extra > 0 && ` / -${week.reward_per_extra.toLocaleString()}원`}
                      </span>
                      {week.isOverride && <span className="text-[10px] text-blue-600 ml-1">수정됨</span>}
                    </div>
                    <button onClick={() => { setEditingWeek(week.weekStart); setWeekMessage(""); }} className="text-xs text-blue-600 hover:underline">수정</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RuleInputs({ prefix, defaults }: { prefix: string; defaults: { target_count: number; penalty_per_miss: number; reward_per_extra: number } }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className="text-xs text-gray-500">주간 목표</label>
        <div className="relative mt-1">
          <input name={`${prefix}target_count`} type="number" min="1" defaultValue={defaults.target_count} required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">회</span>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">미달 벌금</label>
        <div className="relative mt-1">
          <input name={`${prefix}penalty_per_miss`} type="number" min="0" step="1000" defaultValue={defaults.penalty_per_miss} required className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">초과 차감</label>
        <div className="relative mt-1">
          <input name={`${prefix}reward_per_extra`} type="number" min="0" step="1000" defaultValue={defaults.reward_per_extra} className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
        </div>
      </div>
    </div>
  );
}
