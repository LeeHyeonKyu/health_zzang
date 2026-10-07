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

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekEndStr(ws: string): string {
  const parts = ws.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getAllWeeks(seasonStartDate: string, seasonEndDate: string | null): string[] {
  const weeks: string[] = [];
  const endDate = seasonEndDate ?? todayStr();
  const parts = seasonStartDate.split("-").map(Number);
  const startDate = new Date(parts[0], parts[1] - 1, parts[2]);
  const startMon = getMonday(startDate);
  const startParts = startMon.split("-").map(Number);
  const d = new Date(startParts[0], startParts[1] - 1, startParts[2]);

  while (true) {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (ds > endDate) break;
    weeks.push(ds);
    d.setDate(d.getDate() + 7);
  }
  return weeks;
}

export function getCurrentWeekStart(): string {
  return getMonday(new Date());
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

  const allWeeks = getAllWeeks(seasonStartDate, seasonEndDate);
  const currentWeekStart = getCurrentWeekStart();
  const completedWeeks = getCompletedWeeks(allWeeks, currentWeekStart);

  return members.map((m) => {
    let totalPenalty = 0;
    let totalWorkouts = 0;
    let exemptedWeeks = 0;

    for (const ws of completedWeeks) {
      if (exemptionSet.has(`${m.id}:${ws}`)) {
        exemptedWeeks++;
        continue;
      }
      const we = getWeekEndStr(ws);
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
