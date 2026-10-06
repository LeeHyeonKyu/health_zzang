import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateSeasonForm from "./create-season-form";
import EndSeasonButton from "./end-season-button";
import SeasonRulesForm from "./season-rules-form";
import ChangePasswordForm from "./change-password-form";
import SettingsTabs from "./settings-tabs";
import { getWeekStart, formatDate } from "@/lib/utils";

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
  let currentOverride = null;
  if (activeSeason) {
    const { data: override } = await supabase
      .from("weekly_rule")
      .select("*")
      .eq("season_id", activeSeason.id)
      .eq("week_start", weekStart)
      .single();
    currentOverride = override;
  }

  const seasonTab = activeSeason ? (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">{activeSeason.name}</h3>
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">진행 중</span>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>시작일</span>
            <span className="font-medium text-gray-900">{activeSeason.start_date}</span>
          </div>
          <div className="flex justify-between">
            <span>종료일</span>
            <span className="font-medium text-gray-900">{activeSeason.end_date ?? "미정"}</span>
          </div>
          <div className="flex justify-between">
            <span>경과</span>
            <span className="font-medium text-gray-900">
              {Math.ceil((Date.now() - new Date(activeSeason.start_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))}일
            </span>
          </div>
        </div>
        <EndSeasonButton seasonId={activeSeason.id} />
      </div>
    </div>
  ) : (
    <div>
      <p className="text-sm text-gray-500 mb-4">시즌을 시작하면 운동 인증과 벌금 집계가 시작됩니다.</p>
      <CreateSeasonForm />
    </div>
  );

  const rulesTab = activeSeason ? (
    <SeasonRulesForm
      seasonId={activeSeason.id}
      defaultValues={{
        default_target_count: activeSeason.default_target_count,
        default_penalty_per_miss: activeSeason.default_penalty_per_miss,
        default_reward_per_extra: activeSeason.default_reward_per_extra,
      }}
      weekStart={weekStart}
      currentOverride={currentOverride ? {
        target_count: currentOverride.target_count,
        penalty_per_miss: currentOverride.penalty_per_miss,
        reward_per_extra: currentOverride.reward_per_extra,
      } : null}
    />
  ) : (
    <div className="text-center py-8 text-gray-500">
      <p>시즌을 먼저 시작해주세요.</p>
    </div>
  );

  const accountTab = (
    <div>
      <h3 className="text-sm font-bold text-gray-900 mb-3">비밀번호 변경</h3>
      <ChangePasswordForm />
    </div>
  );

  const tabs = [
    { id: "season", label: "시즌 관리", content: seasonTab },
    { id: "rules", label: "벌금 규칙", content: rulesTab },
    { id: "account", label: "내 계정", content: accountTab },
  ];

  return (
    <div className="min-h-dvh px-4 py-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold tracking-tight">⚙️ 설정</h1>
        <Link href="/" prefetch={false} className="text-sm font-medium text-blue-600 hover:underline">← 대시보드</Link>
      </header>

      <SettingsTabs tabs={tabs} />
    </div>
  );
}
