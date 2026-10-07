"use client";

interface Member {
  id: string;
  nickname: string;
}

interface Props {
  members: Member[];
  currentUserId: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function MemberBadges({ members, currentUserId, selected, onSelect }: Props) {
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
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(selected === m.id ? null : m.id)}
          className={`flex-none flex flex-col items-center gap-1 transition-opacity ${selected !== null && selected !== m.id ? "opacity-40" : ""}`}
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${
            selected === m.id
              ? "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-500"
              : m.id === currentUserId
              ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300"
              : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
          }`}>
            {m.nickname.charAt(0)}
          </div>
          <span className={`text-[10px] whitespace-nowrap ${selected === m.id ? "text-blue-600 dark:text-blue-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
            {m.nickname}
          </span>
        </button>
      ))}
    </div>
  );
}
