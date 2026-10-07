import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile, getActiveSeason, getCrewMembers } from "@/lib/data";
import { getWeekStart, formatWeekLabel, formatDateShort, getWeekEnd } from "@/lib/utils";
import WorkoutForm from "./workout-form";
import ExemptionForm from "./exemption-form";

export default async function NewWorkoutPage() {
  const user = await getUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  if (!profile) return null;

  const [activeSeason, members] = await Promise.all([
    getActiveSeason(profile.crew_id),
    getCrewMembers(profile.crew_id),
  ]);

  const otherMembers = members.filter((m) => m.id !== user.id);
  const weekStart = getWeekStart();
  const we = getWeekEnd(weekStart);
  const weekLabel = activeSeason
    ? `${formatWeekLabel(activeSeason.start_date, weekStart)} (${formatDateShort(weekStart)} ~ ${formatDateShort(we)})`
    : "";

  let existingExemption: { reason: string; media_r2_key: string | null } | null = null;
  if (activeSeason) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("week_exemption")
      .select("reason, media_r2_key")
      .eq("user_id", user.id)
      .eq("season_id", activeSeason.id)
      .eq("week_start", weekStart)
      .single();
    existingExemption = data;
  }

  return (
    <div>
      <ExemptionForm
        currentWeekStart={weekStart}
        weekLabel={weekLabel}
        existingExemption={existingExemption}
      />
      <WorkoutForm crewMembers={otherMembers} />
    </div>
  );
}
