import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CreateSeasonForm from "./create-season-form";
import EndSeasonButton from "./end-season-button";
import WeeklyRuleForm from "./weekly-rule-form";
import { getWeekStart } from "@/lib/utils";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("crew_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: activeSeason } = await supabase
    .from("season")
    .select("*")
    .eq("crew_id", profile.crew_id)
    .eq("is_active", true)
    .single();

  const weekStart = getWeekStart();
  let currentRule = null;
  if (activeSeason) {
    const { data: override } = await supabase
      .from("weekly_rule")
      .select("*")
      .eq("season_id", activeSeason.id)
      .eq("week_start", weekStart)
      .single();
    currentRule = override;
  }

  return (
    <div className="min-h-dvh px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold">⚙️ 설정</h1>
        <a href="/" className="text-sm text-blue-600 hover:underline">← 대시보드</a>
      </header>

      {activeSeason ? (
        <div className="space-y-6">
          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-3">현재 시즌: {activeSeason.name}</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>시작일: {activeSeason.start_date}</p>
              <p>기본 규칙: 주 {activeSeason.default_target_count}회 / 미달 {activeSeason.default_penalty_per_miss.toLocaleString()}원 / 초과 -{activeSeason.default_reward_per_extra.toLocaleString()}원</p>
            </div>
            <EndSeasonButton seasonId={activeSeason.id} />
          </section>

          <section className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold mb-3">이번 주 규칙 변경</h2>
            <p className="text-sm text-gray-500 mb-3">
              {currentRule
                ? `현재 override 적용 중: 주 ${currentRule.target_count}회`
                : "시즌 기본 규칙 사용 중"}
            </p>
            <WeeklyRuleForm
              seasonId={activeSeason.id}
              weekStart={weekStart}
              defaultValues={{
                target_count: currentRule?.target_count ?? activeSeason.default_target_count,
                penalty_per_miss: currentRule?.penalty_per_miss ?? activeSeason.default_penalty_per_miss,
                reward_per_extra: currentRule?.reward_per_extra ?? activeSeason.default_reward_per_extra,
              }}
            />
          </section>
        </div>
      ) : (
        <section className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-3">새 시즌 시작</h2>
          <p className="text-sm text-gray-500 mb-4">시즌을 시작하면 운동 인증과 벌금 집계가 시작됩니다.</p>
          <CreateSeasonForm />
        </section>
      )}
    </div>
  );
}
