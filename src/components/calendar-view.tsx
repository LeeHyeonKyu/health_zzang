"use client";

import { useState } from "react";
import { todayStr } from "@/lib/utils";

interface Props {
  workoutDates: string[];
  onDateSelect: (date: string | null) => void;
  selectedDate: string | null;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const DAY_COLORS = ["", "", "", "", "", "text-blue-600 dark:text-blue-400", "text-red-500 dark:text-red-400"];

export default function CalendarView({ workoutDates, onDateSelect, selectedDate }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentMonth.year, currentMonth.month, 1).getDay();
  const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const workoutSet = new Set(workoutDates);

  function prevMonth() {
    setCurrentMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setCurrentMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  }

  function formatDateStr(day: number): string {
    const m = String(currentMonth.month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${currentMonth.year}-${m}-${d}`;
  }

  function getDayOfWeek(day: number): number {
    const d = new Date(currentMonth.year, currentMonth.month, day).getDay();
    return d === 0 ? 6 : d - 1;
  }

  const monthLabel = `${currentMonth.year}년 ${currentMonth.month + 1}월`;

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-500 dark:text-gray-400">
          ◀
        </button>
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{monthLabel}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg transition-colors text-gray-500 dark:text-gray-400">
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div key={label} className={`text-center text-[10px] font-semibold uppercase py-1 ${DAY_COLORS[i] || "text-gray-400 dark:text-gray-500"}`}>
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = formatDateStr(day);
          const hasWorkout = workoutSet.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === todayStr();
          const dow = getDayOfWeek(day);
          const dowColor = !isSelected ? DAY_COLORS[dow] : "";

          return (
            <button
              key={day}
              onClick={() => onDateSelect(isSelected ? null : dateStr)}
              className={`relative flex flex-col items-center justify-center py-2 rounded-lg text-sm transition-colors
                ${isSelected ? "bg-blue-600 text-white" : isToday ? "bg-blue-50 dark:bg-blue-950 font-bold ring-1 ring-blue-300 dark:ring-blue-700" : "hover:bg-gray-50 dark:hover:bg-[#222]"}
                ${!isSelected && !isToday && dowColor ? dowColor : !isSelected && !isToday ? "text-gray-700 dark:text-gray-300" : ""}
                ${isToday && !isSelected ? (dowColor || "text-blue-700 dark:text-blue-300") : ""}
              `}
            >
              {day}
              {hasWorkout && (
                <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-green-500"}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
