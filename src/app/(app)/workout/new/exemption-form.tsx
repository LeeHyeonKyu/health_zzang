"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  currentWeekStart: string;
  weekLabel: string;
  existingExemption: { reason: string; media_r2_key: string | null } | null;
}

export default function ExemptionForm({ currentWeekStart, weekLabel, existingExemption }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(!!existingExemption);
  const [reason, setReason] = useState(existingExemption?.reason ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setMessage("사유를 입력해주세요."); return; }
    setLoading(true);
    setMessage("");

    let mediaKey: string | undefined;
    if (file) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const urlRes = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, fileExtension: ext }),
      });
      if (urlRes.ok) {
        const { uploadUrl, key } = await urlRes.json();
        await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        mediaKey = key;
      }
    }

    const res = await fetch("/api/exemption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: currentWeekStart, reason: reason.trim(), media_r2_key: mediaKey }),
    });

    if (res.ok) {
      setMessage("면제가 등록되었습니다.");
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(data.error?.message ?? "면제 등록에 실패했습니다.");
    }
    setLoading(false);
  }

  async function handleCancel() {
    setLoading(true);
    const res = await fetch(`/api/exemption?week_start=${currentWeekStart}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("면제가 취소되었습니다.");
      router.refresh();
    } else {
      setMessage("면제 취소에 실패했습니다.");
    }
    setLoading(false);
  }

  if (existingExemption) {
    return (
      <div className="bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🏥</span>
          <span className="text-sm font-bold text-teal-800 dark:text-teal-200">{weekLabel} 면제 중</span>
        </div>
        <p className="text-sm text-teal-700 dark:text-teal-300 mb-3">사유: {existingExemption.reason}</p>
        {message && <p className="text-sm text-teal-600 mb-2">{message}</p>}
        <button
          onClick={handleCancel}
          disabled={loading}
          className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
        >
          {loading ? "취소 중..." : "면제 취소"}
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full text-left bg-gray-50 dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-4 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
      >
        🏥 이번 주 쉬어야 하나요? <span className="text-xs text-gray-400">면제 신청 →</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏥</span>
          <span className="text-sm font-bold text-teal-800 dark:text-teal-200">{weekLabel} 면제 신청</span>
        </div>
        <button type="button" onClick={() => setExpanded(false)} className="text-xs text-gray-400 hover:text-gray-600">닫기</button>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="사유를 입력하세요 (예: 감기, 출장)"
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-teal-200 dark:border-teal-700 text-sm bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 resize-none"
      />

      <div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
        >
          {file ? `📎 ${file.name}` : "📎 증빙 첨부 (선택)"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
      </div>

      {message && <p className="text-sm text-red-500">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "등록 중..." : "면제 신청"}
      </button>
    </form>
  );
}
