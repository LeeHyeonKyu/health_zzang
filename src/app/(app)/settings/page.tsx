import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile, getActiveSeason } from "@/lib/data";
import CreateSeasonForm from "./create-season-form";
import EndSeasonButton from "./end-season-button";
import SeasonRulesForm from "./season-rules-form";
import ChangePasswordForm from "./change-password-form";
import SettingsTabs from "./settings-tabs";
import LogoutButton from "@/components/logout-button";
import { getWeekStart, formatDate } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const activeSeason = await getActiveSeason(profile.crew_id);

  const weekStart = getWeekStart();
  let currentOverride = null;
  const pastWeeks: { weekStart: string; weekLabel: string; target_count: number; penalty_per_miss: number; reward_per_extra: number; isOverride: boolean }[] = [];

  if (activeSeason) {
    const supabase = await createClient();
    const [{ data: override }, { data: allOverrides }] = await Promise.all([
      supabase.from("weekly_rule").select("*").eq("season_id", activeSeason.id).eq("week_start", weekStart).single(),
      supabase.from("weekly_rule").select("*").eq("season_id", activeSeason.id).order("week_start", { ascending: false }),
    ]);
    currentOverride = override;

    const overrideMap = new Map((allOverrides ?? []).map((r) => [r.week_start, r]));
    const seasonStart = new Date(activeSeason.start_date + "T00:00:00");
    const currentWeekDate = new Date(weekStart + "T00:00:00");

    const d = new Date(seasonStart);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));

    while (d < currentWeekDate) {
      const ws = d.toISOString().split("T")[0];
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const label = `${formatDate(ws)} ~ ${formatDate(weekEnd.toISOString().split("T")[0])}`;

      const ov = overrideMap.get(ws);
      pastWeeks.push({
        weekStart: ws,
        weekLabel: label,
        target_count: ov?.target_count ?? activeSeason.default_target_count,
        penalty_per_miss: ov?.penalty_per_miss ?? activeSeason.default_penalty_per_miss,
        reward_per_extra: ov?.reward_per_extra ?? activeSeason.default_reward_per_extra,
        isOverride: !!ov,
      });
      d.setDate(d.getDate() + 7);
    }
    pastWeeks.reverse();
  }

  /* eslint-disable react-hooks/purity */
  const daysElapsed = activeSeason
    ? Math.ceil((Date.now() - new Date(activeSeason.start_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  /* eslint-enable react-hooks/purity */

  const seasonTab = activeSeason ? (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{activeSeason.name}</h3>
          <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">진행 중</span>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">시작일</span>
            <span className="font-medium text-gray-900">{activeSeason.start_date}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">종료일</span>
            <span className="font-medium text-gray-900">{activeSeason.end_date ?? "미정"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">경과</span>
            <span className="font-medium text-gray-900">{daysElapsed}일</span>
          </div>
        </div>
        <EndSeasonButton seasonId={activeSeason.id} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
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
          pastWeeks={pastWeeks}
        />
      </div>
    </div>
  ) : (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-lg font-bold text-gray-900 mb-2">새 시즌 시작</h3>
      <p className="text-sm text-gray-500 mb-4">시즌을 시작하면 운동 인증과 벌금 집계가 시작됩니다.</p>
      <CreateSeasonForm />
    </div>
  );

  const accountTab = (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">비밀번호 변경</h3>
        <ChangePasswordForm />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-900 mb-4">로그아웃</h3>
        <LogoutButton />
      </div>
    </div>
  );

  const tabs = [
    { id: "season", label: "시즌 설정", content: seasonTab },
    { id: "account", label: "개인 설정", content: accountTab },
  ];

  return <SettingsTabs tabs={tabs} />;
}
