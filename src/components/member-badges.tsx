"use client";

import Avatar from "@/components/avatar";

interface Member {
  id: string;
  nickname: string;
}

interface Props {
  members: Member[];
  currentUserId: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  avatarMap?: Record<string, string>;
  lastFeedDates?: Record<string, string>;
}

export default function MemberBadges({ members, currentUserId, selected, onSelect, avatarMap, lastFeedDates }: Props) {
  const sorted = [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    const dateA = lastFeedDates?.[a.id] ?? "";
    const dateB = lastFeedDates?.[b.id] ?? "";
    return dateB.localeCompare(dateA);
  });

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 mb-3" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
      <button
        onClick={() => onSelect(null)}
        className={`flex-none flex flex-col items-center gap-1 transition-opacity ${selected === null ? "" : "opacity-40"}`}
      >
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[10px] font-bold ${
          selected === null ? "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
        }`}>전체</div>
        <span className={`text-[10px] ${selected === null ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>전체</span>
      </button>
      {sorted.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(selected === m.id ? null : m.id)}
          className={`flex-none flex flex-col items-center gap-1 transition-opacity ${selected !== null && selected !== m.id ? "opacity-40" : ""}`}
        >
          <div className={`rounded-full ${selected === m.id ? "ring-2 ring-blue-300 dark:ring-blue-500" : m.id === currentUserId ? "ring-2 ring-yellow-300 dark:ring-yellow-600" : ""}`}>
            <Avatar
              nickname={m.nickname}
              avatarUrl={avatarMap?.[m.id]}
              size="md"
              className="w-11 h-11 text-sm"
            />
          </div>
          <span className={`text-[10px] whitespace-nowrap ${selected === m.id ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
            {m.nickname}
          </span>
        </button>
      ))}
    </div>
  );
}
