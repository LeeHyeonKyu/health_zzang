"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  seasonId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  daysElapsed: number;
}

export default function SeasonInfoForm({ seasonId, name, startDate, endDate, daysElapsed }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(e.currentTarget);
    const body = {
      season_id: seasonId,
      action: "update_info",
      name: form.get("name"),
      start_date: form.get("start_date"),
      end_date: form.get("end_date") || null,
    };

    const res = await fetch("/api/season", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setMessage("시즌 정보가 수정되었습니다.");
      setEditing(false);
      router.refresh();
    } else {
      setMessage("수정에 실패했습니다.");
    }
    setLoading(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">시즌 정보 수정</h3>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">취소</button>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">시즌 이름</label>
          <input name="name" defaultValue={name} required className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">시작일</label>
            <input name="start_date" type="date" defaultValue={startDate} required className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">종료일 (선택)</label>
            <input name="end_date" type="date" defaultValue={endDate ?? ""} className="w-full mt-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>
        {message && <p className={`text-sm ${message.includes("실패") ? "text-red-500" : "text-green-600"}`}>{message}</p>}
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {loading ? "저장 중..." : "저장"}
        </button>
      </form>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 px-2.5 py-1 rounded-full">진행 중</span>
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">수정</button>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">시작일</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{startDate}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">종료일</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{endDate ?? "미정"}</span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-500 dark:text-gray-400">경과</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{daysElapsed}일</span>
        </div>
      </div>
    </>
  );
}
