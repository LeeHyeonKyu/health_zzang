import { getWeekStart, getWeekEnd, getAllWeeks, toDateStr } from "./utils";

export { getAllWeeks };

export interface PenaltyInput {
  seasonStartDate: string;
  seasonEndDate: string | null;
  defaultTargetCount: number;
  defaultPenaltyPerMiss: number;
  defaultRewardPerExtra: number;
  members: { id: string; nickname: string }[];
  workouts: { user_id: string; date: string }[];
  weeklyRules: { week_start: string; target_count: number; penalty_per_miss: number; reward_per_extra: number }[];
  exemptions: { user_id: string; week_start: string }[];
}

export interface MemberPenalty {
  id: string;
  nickname: string;
  totalWorkouts: number;
  totalPenalty: number;
  exemptedWeeks: number;
}

export function getCurrentWeekStart(): string {
  return getWeekStart();
}

export function getCompletedWeeks(allWeeks: string[], currentWeekStart: string): string[] {
  return allWeeks.filter((w) => w < currentWeekStart);
}

export function calcMemberPenalties(input: PenaltyInput): MemberPenalty[] {
  const {
    seasonStartDate, seasonEndDate,
    defaultTargetCount, defaultPenaltyPerMiss, defaultRewardPerExtra,
    members, workouts, weeklyRules, exemptions,
  } = input;

  const ruleMap = new Map(weeklyRules.map((r) => [r.week_start, r]));
  const exemptionSet = new Set(exemptions.map((e) => `${e.user_id}:${e.week_start}`));

  const allW = getAllWeeks(seasonStartDate, seasonEndDate);
  const currentWeekStart = getCurrentWeekStart();
  const completedWeeks = getCompletedWeeks(allW, currentWeekStart);

  return members.map((m) => {
    let totalPenalty = 0;
    let totalWorkouts = 0;
    let exemptedWeeks = 0;

    for (const ws of completedWeeks) {
      if (exemptionSet.has(`${m.id}:${ws}`)) {
        exemptedWeeks++;
        continue;
      }
      const we = getWeekEnd(ws);
      const override = ruleMap.get(ws);
      const target = override?.target_count ?? defaultTargetCount;
      const penaltyPerMiss = override?.penalty_per_miss ?? defaultPenaltyPerMiss;
      const rewardPerExtra = override?.reward_per_extra ?? defaultRewardPerExtra;

      const count = workouts.filter(
        (w) => w.user_id === m.id && w.date >= ws && w.date <= we
      ).length;

      totalWorkouts += count;
      const missed = Math.max(0, target - count);
      const extra = Math.max(0, count - target);
      totalPenalty += missed * penaltyPerMiss - extra * rewardPerExtra;
    }

    return { id: m.id, nickname: m.nickname, totalWorkouts, totalPenalty, exemptedWeeks };
  });
}
