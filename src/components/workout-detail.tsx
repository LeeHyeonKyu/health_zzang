"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import type { FeedItem } from "@/lib/workouts";

interface Props {
  item: FeedItem;
  isOwner: boolean;
  members: { id: string; nickname: string }[];
  onBack: () => void;
}

export default function WorkoutDetail({ item, isOwner, members, onBack }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState(item.note ?? "");
  const [editDate, setEditDate] = useState(item.date);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
    setCurrentIndex(idx);
  }

  function goTo(index: number) {
    scrollRef.current?.scrollTo({ left: index * (scrollRef.current?.clientWidth ?? 0), behavior: "smooth" });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/workout", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workout_id: item.id, date: editDate, note: editNote }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "수정에 실패했습니다");
      setSaving(false);
      return;
    }
    setEditing(false);
    setSaving(false);
    router.refresh();
    onBack();
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/workout?id=${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "삭제에 실패했습니다");
      setDeleting(false);
      return;
    }
    router.refresh();
    onBack();
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <button onClick={onBack} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">
        ← 목록으로
      </button>

      {item.media.length > 0 && (
        <div className="relative rounded-xl overflow-hidden mb-4">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
          >
            {item.media.map((m, i) => (
              <div key={m.r2_key} className={`flex-none w-full snap-center bg-gray-100 dark:bg-[#111] ${m.type === "photo" ? "aspect-[4/3]" : "aspect-video"}`}>
                {m.type === "photo" ? (
                  <a href={m.url} target="_blank" rel="noopener noreferrer">
                    <img src={m.url} alt="" className="w-full h-full object-cover" loading={i === 0 ? "eager" : "lazy"} />
                  </a>
                ) : (
                  <video src={m.url} className="w-full h-full object-contain bg-black" controls preload="metadata" />
                )}
              </div>
            ))}
          </div>

          {item.media.length > 1 && (
            <>
              <span className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {currentIndex + 1}/{item.media.length}
              </span>
              {currentIndex > 0 && (
                <button onClick={() => goTo(currentIndex - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white text-sm flex items-center justify-center">‹</button>
              )}
              {currentIndex < item.media.length - 1 && (
                <button onClick={() => goTo(currentIndex + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white text-sm flex items-center justify-center">›</button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {item.media.map((_, i) => (
                  <button key={i} onClick={() => goTo(i)} className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">{item.nickname}</span>
          <span className="text-sm text-gray-400 dark:text-gray-500">{formatDate(item.date)}</span>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">날짜</label>
              <input
                type="date"
                value={editDate}
                max={today}
                onChange={(e) => setEditDate(e.target.value)}
                className="input-base mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">메모</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={3}
                className="input-base mt-1 resize-none"
              />
            </div>
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => { setEditing(false); setError(""); }} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">
                취소
              </button>
            </div>
          </div>
        ) : (
          <>
            {item.note && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{item.note}</p>
            )}
            {!item.note && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-3 italic">메모 없음</p>
            )}
          </>
        )}

        {!editing && isOwner && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button onClick={() => setEditing(true)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              수정
            </button>
            {confirmDelete ? (
              <div className="flex-1 flex gap-1">
                <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
                  {deleting ? "..." : "확인"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500">
                  취소
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                삭제
              </button>
            )}
          </div>
        )}

        {error && !editing && <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>}
      </div>
    </div>
  );
}
