"use client";

import { useState, useMemo } from "react";
import CalendarView from "@/components/calendar-view";
import FeedCard from "@/components/feed-card";
import { formatDate, formatWeekLabel, formatDateShort } from "@/lib/utils";
import type { FeedItem } from "@/lib/workouts";

type ViewMode = "weekly" | "monthly" | "feed";

interface Member {
  id: string;
  nickname: string;
}

interface Workout {
  user_id: string;
  date: string;
  id: string;
}

interface Props {
  currentUserId: string;
  members: Member[];
  seasonName: string | null;
  seasonStartDate: string | null;
  allWorkouts: Workout[];
  feedItems: FeedItem[];
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function getWeekStartDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function RecordsContent({
  currentUserId,
  members,
  seasonName,
  seasonStartDate,
  allWorkouts,
  feedItems,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [myOnly, setMyOnly] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  const currentWeekStart = useMemo(() => {
    const base = getWeekStartDate();
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return toDateStr(d);
    });
  }, [currentWeekStart]);

  const weekLabel = useMemo(() => {
    const ws = toDateStr(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const we = toDateStr(end);
    if (seasonStartDate) {
      return `${formatWeekLabel(seasonStartDate, ws)} (${formatDateShort(ws)} ~ ${formatDateShort(we)})`;
    }
    return `${formatDate(ws)} ~ ${formatDate(we)}`;
  }, [currentWeekStart, seasonStartDate]);

  const filteredWorkouts = useMemo(() => {
    if (selectedMember) return allWorkouts.filter((w) => w.user_id === selectedMember);
    if (myOnly) return allWorkouts.filter((w) => w.user_id === currentUserId);
    return allWorkouts;
  }, [allWorkouts, myOnly, selectedMember, currentUserId]);

  const filteredFeed = useMemo(() => {
    if (selectedMember) return feedItems.filter((f) => f.userId === selectedMember);
    if (myOnly) return feedItems.filter((f) => f.userId === currentUserId);
    return feedItems;
  }, [feedItems, myOnly, selectedMember, currentUserId]);

  const selectedMemberInfo = selectedMember
    ? members.find((m) => m.id === selectedMember)
    : null;

  const memberWorkoutCount = selectedMember
    ? allWorkouts.filter((w) => w.user_id === selectedMember).length
    : 0;

  if (!seasonName) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-800">
        <p className="text-gray-500 dark:text-gray-400">현재 진행 중인 시즌이 없습니다.</p>
      </div>
    );
  }

  if (selectedMember && selectedMemberInfo) {
    return (
      <div>
        <button
          onClick={() => setSelectedMember(null)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
        >
          ← 전체 기록
        </button>
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedMemberInfo.nickname}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            시즌 운동 {memberWorkoutCount}회
          </p>
        </div>
        <div className="space-y-4">
          {filteredFeed.length === 0 ? (
            <p className="text-center text-gray-400 py-8">인증 기록이 없습니다.</p>
          ) : (
            filteredFeed.map((item) => (
              <FeedCard
                key={item.id}
                nickname={item.nickname}
                userId={item.userId}
                date={item.date}
                note={item.note}
                media={item.media}
                onMemberClick={() => {}}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-[#1f1f1f] rounded-lg p-0.5">
          {(["weekly", "monthly", "feed"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === mode
                  ? "bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {mode === "weekly" ? "주간" : mode === "monthly" ? "월간" : "피드"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMyOnly(!myOnly)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            myOnly
              ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              : "bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
          }`}
        >
          {myOnly ? "내 기록" : "전체"}
        </button>
      </div>

      {viewMode === "weekly" && (
        <WeeklyView
          weekDates={weekDates}
          weekLabel={weekLabel}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          members={myOnly ? members.filter((m) => m.id === currentUserId) : members}
          workouts={filteredWorkouts}
          currentUserId={currentUserId}
          onMemberClick={setSelectedMember}
        />
      )}

      {viewMode === "monthly" && (
        <MonthlyView
          workouts={filteredWorkouts}
          feedItems={filteredFeed}
          selectedDate={selectedCalDate}
          onDateSelect={setSelectedCalDate}
        />
      )}

      {viewMode === "feed" && (
        <FeedView
          items={filteredFeed}
          onMemberClick={setSelectedMember}
        />
      )}
    </div>
  );
}

function WeeklyView({
  weekDates,
  weekLabel,
  weekOffset,
  setWeekOffset,
  members,
  workouts,
  currentUserId,
  onMemberClick,
}: {
  weekDates: string[];
  weekLabel: string;
  weekOffset: number;
  setWeekOffset: (n: number) => void;
  members: Member[];
  workouts: Workout[];
  currentUserId: string;
  onMemberClick: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-gray-500 dark:text-gray-400">◀</button>
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{weekLabel}</span>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">이번 주</button>
          )}
        </div>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-lg text-gray-500 dark:text-gray-400" disabled={weekOffset >= 0}>
          {weekOffset < 0 ? "▶" : ""}
        </button>
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_1fr))] text-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111]">
          <div className="py-2 px-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">크루원</div>
          {DAY_LABELS.map((d, i) => (
            <div key={d} className="py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500">
              <div>{d}</div>
              <div className="text-[9px] text-gray-300 dark:text-gray-600">{weekDates[i]?.slice(5)}</div>
            </div>
          ))}
        </div>

        {members.map((member) => {
          const memberWorkouts = workouts.filter((w) => w.user_id === member.id);
          const workoutDateSet = new Set(memberWorkouts.map((w) => w.date));
          const isMe = member.id === currentUserId;

          return (
            <div
              key={member.id}
              className={`grid grid-cols-[1fr_repeat(7,_minmax(0,_1fr))] text-center border-b border-gray-50 dark:border-gray-800 last:border-0 ${isMe ? "bg-yellow-50 dark:bg-yellow-950" : ""}`}
            >
              <button
                onClick={() => onMemberClick(member.id)}
                className="py-2.5 px-2 text-left text-xs font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate"
              >
                {member.nickname}
                {isMe && <span className="text-gray-400 dark:text-gray-500 ml-0.5">(나)</span>}
              </button>
              {weekDates.map((date) => (
                <div key={date} className="py-2.5 flex items-center justify-center">
                  {workoutDateSet.has(date) ? (
                    <span className="w-5 h-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold">✓</span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700" />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyView({
  workouts,
  feedItems,
  selectedDate,
  onDateSelect,
}: {
  workouts: Workout[];
  feedItems: FeedItem[];
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
}) {
  const workoutDates = [...new Set(workouts.map((w) => w.date))];
  const selectedItems = selectedDate
    ? feedItems.filter((f) => f.date === selectedDate)
    : [];

  return (
    <div className="space-y-4">
      <CalendarView
        workoutDates={workoutDates}
        onDateSelect={onDateSelect}
        selectedDate={selectedDate}
      />
      {selectedDate && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{formatDate(selectedDate)}</h3>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-gray-400">해당 날짜에 인증 기록이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <FeedCard
                  key={item.id}
                  nickname={item.nickname}
                  userId={item.userId}
                  date={item.date}
                  note={item.note}
                  media={item.media}
                  onMemberClick={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedView({
  items,
  onMemberClick,
}: {
  items: FeedItem[];
  onMemberClick: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-800">
        <p className="text-gray-500 dark:text-gray-400">아직 인증이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <FeedCard
          key={item.id}
          nickname={item.nickname}
          userId={item.userId}
          date={item.date}
          note={item.note}
          media={item.media}
          onMemberClick={() => onMemberClick(item.userId)}
        />
      ))}
    </div>
  );
}
