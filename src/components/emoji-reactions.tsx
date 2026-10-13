"use client";

import { useState, useRef, useEffect } from "react";

interface ReactionCount {
  emoji: string;
  count: number;
  reacted: boolean;
}

const EMOJI_SET = ["\u{1F4AA}", "\u{1F525}", "❤️", "\u{1F44F}", "\u{1F602}", "\u{1F44D}", "\u{1F389}", "\u{1F4AF}"];

interface Props {
  workoutId: string;
  reactions: ReactionCount[];
  compact?: boolean;
  onReactionsChange?: (workoutId: string, reactions: ReactionCount[]) => void;
}

export default function EmojiReactions({ workoutId, reactions: initialReactions, compact, onReactionsChange }: Props) {
  const [reactions, setReactions] = useState<ReactionCount[]>(initialReactions);
  const [prevInitial, setPrevInitial] = useState(initialReactions);
  if (prevInitial !== initialReactions) {
    setPrevInitial(initialReactions);
    setReactions(initialReactions);
  }
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [pickerOpen]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 2000);
    return () => clearTimeout(t);
  }, [error]);

  async function toggleReaction(emoji: string) {
    const existing = reactions.find((r) => r.emoji === emoji);
    const wasReacted = existing?.reacted ?? false;

    const updated = (() => {
      const next = reactions.map((r) => {
        if (r.emoji !== emoji) return r;
        return { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted };
      });
      if (!existing) next.push({ emoji, count: 1, reacted: true });
      return next.filter((r) => r.count > 0);
    })();

    setReactions(updated);
    onReactionsChange?.(workoutId, updated);
    setPickerOpen(false);

    try {
      const res = await fetch("/api/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_id: workoutId, emoji }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      const rolledBack = (() => {
        if (!existing) return reactions.filter((r) => r.emoji !== emoji);
        return reactions.map((r) => {
          if (r.emoji !== emoji) return r;
          return { ...r, count: wasReacted ? r.count + 1 : r.count - 1, reacted: wasReacted };
        }).filter((r) => r.count > 0);
      })();
      setReactions(rolledBack);
      onReactionsChange?.(workoutId, rolledBack);
      setError("반응 처리에 실패했습니다");
    }
  }

  const pillSize = compact ? "px-2 py-0.5 text-xs gap-1" : "px-3 py-1 text-sm gap-1.5";
  const btnSize = compact ? "w-7 h-7 text-sm" : "w-8 h-8 text-base";

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {reactions.map((r) => (
          <button
            key={r.emoji}
            onClick={() => toggleReaction(r.emoji)}
            className={`inline-flex items-center rounded-full border transition-colors min-h-[28px] ${pillSize} ${
              r.reacted
                ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            }`}
          >
            <span>{r.emoji}</span>
            <span className="font-medium">{r.count}</span>
          </button>
        ))}
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className={`rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 flex items-center justify-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${btnSize}`}
            aria-label="이모지 추가"
          >
            {"\u{1F600}"}
          </button>
          {pickerOpen && (
            <div className="absolute bottom-full mb-2 left-0 z-50 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-2 flex gap-1 flex-wrap w-[200px]">
              {EMOJI_SET.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => toggleReaction(emoji)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="absolute top-full mt-1 left-0 text-xs text-red-500 dark:text-red-400 bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-800 rounded-lg px-2 py-1 shadow-sm z-50">
          {error}
        </div>
      )}
    </div>
  );
}
