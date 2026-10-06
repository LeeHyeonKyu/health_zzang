"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EndSeasonButton({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleEnd() {
    setLoading(true);
    await fetch("/api/season", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ season_id: seasonId, action: "end" }),
    });
    router.refresh();
  }

  if (!confirming) {
    return (
      <button onClick={() => setConfirming(true)} className="mt-3 text-sm text-red-500 hover:underline">
        시즌 종료
      </button>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-sm text-red-500">정말 종료하시겠습니까?</span>
      <button onClick={handleEnd} disabled={loading} className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
        {loading ? "..." : "확인"}
      </button>
      <button onClick={() => setConfirming(false)} className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-50">
        취소
      </button>
    </div>
  );
}
