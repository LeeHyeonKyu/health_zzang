"use client";

import { useState, useMemo } from "react";
import CalendarView from "@/components/calendar-view";
import FeedCard from "@/components/feed-card";
import WorkoutDetail from "@/components/workout-detail";
import { formatDate, formatWeekLabel, formatDateShort, getWeekStartDate, getWeekEnd, toDateStr, todayStr } from "@/lib/utils";
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
  tagged_with?: string[];
}

interface Exemption {
  user_id: string;
  week_start: string;
  reason: string;
}

interface Props {
  currentUserId: string;
  members: Member[];
  seasonName: string | null;
  seasonStartDate: string | null;
  allWorkouts: Workout[];
  feedItems: FeedItem[];
  exemptions: Exemption[];
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export default function RecordsContent({
  currentUserId,
  members,
  seasonName,
  seasonStartDate,
  allWorkouts,
  feedItems,
  exemptions,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [selectedFeedMember, setSelectedFeedMember] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<FeedItem | null>(null);

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

  const filteredFeed = useMemo(() => {
    if (selectedFeedMember) return feedItems.filter((f) => f.userId === selectedFeedMember);
    return feedItems;
  }, [feedItems, selectedFeedMember]);

  if (!seasonName) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-gray-800">
        <p className="text-gray-500 dark:text-gray-400">현재 진행 중인 시즌이 없습니다.</p>
      </div>
    );
  }

  if (detailItem) {
    return (
      <WorkoutDetail
        item={detailItem}
        isOwner={detailItem.userId === currentUserId}
        members={members}
        onBack={() => setDetailItem(null)}
      />
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
      </div>

      {viewMode === "weekly" && (
        <WeeklyView
          weekDates={weekDates}
          weekLabel={weekLabel}
          weekOffset={weekOffset}
          setWeekOffset={setWeekOffset}
          members={members}
          workouts={allWorkouts}
          currentUserId={currentUserId}
          exemptions={exemptions}
          weekStartStr={toDateStr(currentWeekStart)}
        />
      )}

      {viewMode === "monthly" && (
        <MonthlyView
          workouts={allWorkouts}
          feedItems={feedItems}
          selectedDate={selectedCalDate}
          onDateSelect={setSelectedCalDate}
          onCardClick={setDetailItem}
        />
      )}

      {viewMode === "feed" && (
        <div>
          <MemberBadges
            members={members}
            currentUserId={currentUserId}
            selected={selectedFeedMember}
            onSelect={setSelectedFeedMember}
          />
          <FeedView
            items={filteredFeed}
            seasonStartDate={seasonStartDate ?? ""}
            onCardClick={setDetailItem}
          />
        </div>
      )}
    </div>
  );
}

function MemberBadges({
  members,
  currentUserId,
  selected,
  onSelect,
}: {
  members: Member[];
  currentUserId: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
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

function WeeklyView({
  weekDates,
  weekLabel,
  weekOffset,
  setWeekOffset,
  members,
  workouts,
  currentUserId,
  exemptions,
  weekStartStr,
}: {
  weekDates: string[];
  weekLabel: string;
  weekOffset: number;
  setWeekOffset: (n: number) => void;
  members: Member[];
  workouts: Workout[];
  currentUserId: string;
  exemptions: Exemption[];
  weekStartStr: string;
}) {
  const exemptedUserIds = new Set(
    exemptions.filter((e) => e.week_start === weekStartStr).map((e) => e.user_id)
  );
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
        <div className="grid grid-cols-[4rem_repeat(7,_1fr)] text-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111]">
          <div className="py-2 px-1 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">크루원</div>
          {DAY_LABELS.map((d, i) => {
            const isToday = weekDates[i] === todayStr();
            const isSat = i === 5;
            const isSun = i === 6;
            return (
              <div key={d} className={`py-2 text-[10px] font-semibold ${isToday ? "bg-blue-100 dark:bg-blue-900 rounded" : ""} ${isSat ? "text-blue-500 dark:text-blue-400" : isSun ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-gray-500"}`}>
                <div>{d}</div>
                <div className={`text-[9px] ${isToday ? "font-bold" : isSat ? "text-blue-400 dark:text-blue-500" : isSun ? "text-red-400 dark:text-red-500" : "text-gray-300 dark:text-gray-600"}`}>{weekDates[i]?.slice(5)}</div>
              </div>
            );
          })}
        </div>

        {members.map((member) => {
          const memberWorkouts = workouts.filter((w) => w.user_id === member.id || (w.tagged_with ?? []).includes(member.id));
          const workoutDateSet = new Set(memberWorkouts.map((w) => w.date));
          const isMe = member.id === currentUserId;
          const isExempted = exemptedUserIds.has(member.id);

          return (
            <div
              key={member.id}
              className={`grid grid-cols-[4rem_repeat(7,_1fr)] text-center border-b border-gray-50 dark:border-gray-800 last:border-0 ${isExempted ? "opacity-50" : ""} ${isMe ? "bg-yellow-50 dark:bg-yellow-950" : ""}`}
            >
              <div
                className="py-2.5 px-1 text-left text-[11px] font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-visible"
              >
                {member.nickname}
                {isMe && <span className="text-gray-400 dark:text-gray-500 ml-0.5">(나)</span>}
                {isExempted && <span className="ml-0.5">🏥</span>}
              </div>
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
  onCardClick,
}: {
  workouts: Workout[];
  feedItems: FeedItem[];
  selectedDate: string | null;
  onDateSelect: (date: string | null) => void;
  onCardClick: (item: FeedItem) => void;
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
                  taggedNames={item.taggedNames}
                  onMemberClick={() => {}}
                  onCardClick={() => onCardClick(item)}
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
  seasonStartDate,
  onCardClick,
}: {
  items: FeedItem[];
  seasonStartDate: string;
  onCardClick: (item: FeedItem) => void;
}) {
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
              onMemberClick={() => {}}
              onCardClick={() => onCardClick(item)}
            />
          </div>
        );
      })}
    </div>
  );
}
