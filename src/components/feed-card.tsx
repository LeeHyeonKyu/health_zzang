"use client";

import { useState, useRef } from "react";
import { formatDate } from "@/lib/utils";
import Avatar from "@/components/avatar";

interface MediaItem {
  r2_key: string;
  type: "photo" | "video";
  url: string;
}

interface Props {
  nickname: string;
  userId: string;
  date: string;
  note: string | null;
  media: MediaItem[];
  taggedNames?: string[];
  avatarUrl?: string;
  onMemberClick?: () => void;
  onCardClick?: () => void;
}

export default function FeedCard({ nickname, date, note, media, taggedNames, avatarUrl, onMemberClick, onCardClick }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIndex(index);
  }

  function goTo(index: number) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: index * scrollRef.current.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {media.length > 0 && <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          {media.map((m, i) => (
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

        {media.length > 1 && (
          <>
            <span className="absolute top-3 right-3 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {currentIndex + 1}/{media.length}
            </span>

            {currentIndex > 0 && (
              <button onClick={() => goTo(currentIndex - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white text-sm flex items-center justify-center">
                ‹
              </button>
            )}
            {currentIndex < media.length - 1 && (
              <button onClick={() => goTo(currentIndex + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white text-sm flex items-center justify-center">
                ›
              </button>
            )}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? "bg-white" : "bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>}

      <div className={`p-4 ${onCardClick ? "cursor-pointer" : ""}`} onClick={onCardClick}>
        <div className="flex items-center gap-2 mb-1">
          <Avatar nickname={nickname} avatarUrl={avatarUrl} size="sm" />
          <div className="flex-1 flex items-center justify-between">
            {onMemberClick ? (
              <button onClick={(e) => { e.stopPropagation(); onMemberClick(); }} className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400">
                {nickname}
              </button>
            ) : (
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{nickname}</span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(date)}</span>
          </div>
        </div>
        {taggedNames && taggedNames.length > 0 && (
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">with {taggedNames.join(", ")}</p>
        )}
        {note && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{note}</p>}
        {onCardClick && <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2">탭하여 상세 보기</p>}
      </div>
    </div>
  );
}
