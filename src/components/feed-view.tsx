"use client";

import FeedCard from "@/components/feed-card";
import { formatWeekLabel, formatDateShort, getWeekStartDate, getWeekEnd, toDateStr } from "@/lib/utils";
import type { FeedItem } from "@/lib/workouts";

interface Props {
  items: FeedItem[];
  seasonStartDate: string;
  onCardClick: (item: FeedItem) => void;
  avatarMap?: Record<string, string>;
}

export default function FeedView({ items, seasonStartDate, onCardClick, avatarMap }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-800">
        <p className="text-gray-500 dark:text-gray-400">아직 인증이 없습니다.</p>
      </div>
    );
  }

  let lastWeekLabel = "";

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const weekStart = getWeekStartDate(new Date(item.date + "T00:00:00"));
        const ws = toDateStr(weekStart);
        const label = `${formatWeekLabel(seasonStartDate, ws)} (${formatDateShort(ws)} ~ ${formatDateShort(getWeekEnd(ws))})`;
        const showDivider = label !== lastWeekLabel;
        lastWeekLabel = label;

        return (
          <div key={item.id}>
            {showDivider && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap">{label}</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
            )}
            <FeedCard
              nickname={item.nickname}
              userId={item.userId}
              date={item.date}
              note={item.note}
              media={item.media}
              taggedNames={item.taggedNames}
              avatarUrl={avatarMap?.[item.userId]}
              onCardClick={() => onCardClick(item)}
            />
          </div>
        );
      })}
    </div>
  );
}
