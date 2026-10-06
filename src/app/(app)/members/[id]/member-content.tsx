"use client";

import { useState } from "react";
import CalendarView from "@/components/calendar-view";
import WorkoutCard from "@/components/workout-card";

interface MediaItem {
  r2_key: string;
  type: "photo" | "video";
  url: string;
}

interface Workout {
  id: string;
  date: string;
  note: string | null;
  media: MediaItem[];
}

interface Props {
  nickname: string;
  isMe: boolean;
  workouts: Workout[];
}

export default function MemberContent({ nickname, isMe, workouts }: Props) {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const workoutDates = workouts.map((w) => w.date);
  const selectedWorkout = selectedDate ? workouts.find((w) => w.date === selectedDate) : null;

  return (
    <>
      <h2 className="text-lg font-bold mb-4">
        {nickname}{isMe ? " (나)" : ""}의 기록
      </h2>

      {workouts.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500">아직 인증 기록이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setView("list")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${view === "list" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              리스트
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${view === "calendar" ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              달력
            </button>
          </div>

          {view === "list" ? (
            <div className="space-y-3">
              {workouts.map((w) => (
                <WorkoutCard key={w.id} date={w.date} note={w.note} media={w.media} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <CalendarView
                workoutDates={workoutDates}
                onDateSelect={setSelectedDate}
                selectedDate={selectedDate}
              />
              {selectedDate && (
                selectedWorkout ? (
                  <WorkoutCard date={selectedWorkout.date} note={selectedWorkout.note} media={selectedWorkout.media} />
                ) : (
                  <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-400">이 날은 인증 기록이 없습니다.</p>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
