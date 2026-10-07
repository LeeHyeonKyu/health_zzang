import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile, getActiveSeason } from "@/lib/data";
import { getReadUrl } from "@/lib/r2";
import CreateSeasonForm from "./create-season-form";
import SeasonInfoForm from "./season-info-form";
import SeasonRulesForm from "./season-rules-form";
import ChangePasswordForm from "./change-password-form";
import AvatarUpload from "./avatar-upload";
import SettingsTabs from "./settings-tabs";
import LogoutButton from "@/components/logout-button";
import { getWeekStart, getWeekEnd, getAllWeeks, formatWeekLabel, formatDateShort } from "@/lib/utils";

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

    const allSeasonWeeks = getAllWeeks(activeSeason.start_date, activeSeason.end_date);
    for (const ws of allSeasonWeeks) {
      if (ws >= weekStart) continue;
      const we = getWeekEnd(ws);
      const label = `${formatWeekLabel(activeSeason.start_date, ws)} (${formatDateShort(ws)} ~ ${formatDateShort(we)})`;

      const ov = overrideMap.get(ws);
      pastWeeks.push({
        weekStart: ws,
        weekLabel: label,
        target_count: ov?.target_count ?? activeSeason.default_target_count,
        penalty_per_miss: ov?.penalty_per_miss ?? activeSeason.default_penalty_per_miss,
        reward_per_extra: ov?.reward_per_extra ?? activeSeason.default_reward_per_extra,
        isOverride: !!ov,
      });
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
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <SeasonInfoForm
          seasonId={activeSeason.id}
          name={activeSeason.name}
          startDate={activeSeason.start_date}
          endDate={activeSeason.end_date}
          daysElapsed={daysElapsed}
        />
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
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
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">새 시즌 시작</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">시즌을 시작하면 운동 인증과 벌금 집계가 시작됩니다.</p>
      <CreateSeasonForm />
    </div>
  );

  const loginId = user.email?.replace("@health.zzang", "") ?? "";
  const avatarUrl = profile.avatar_r2_key ? await getReadUrl(profile.avatar_r2_key) : null;

  const accountTab = (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">프로필</h3>
        <AvatarUpload currentAvatarUrl={avatarUrl} nickname={profile.nickname} />
        <div className="space-y-3 text-sm mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">ID</span>
            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{loginId}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50 dark:border-gray-800">
            <span className="text-gray-500 dark:text-gray-400">이름</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{profile.nickname}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500 dark:text-gray-400">User ID</span>
            <span className="font-mono text-xs text-gray-400 dark:text-gray-500 break-all">{user.id}</span>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">비밀번호 변경</h3>
        <ChangePasswordForm />
      </div>
      <LogoutButton />
    </div>
  );

  const tabs = [
    { id: "season", label: "시즌 설정", content: seasonTab },
    { id: "account", label: "개인 설정", content: accountTab },
  ];

  return <SettingsTabs tabs={tabs} />;
}
