import { describe, it, expect } from "vitest";
import { calcMemberPenalties } from "../src/lib/penalty";

const BASE_INPUT = {
  seasonStartDate: "2026-09-01",
  seasonEndDate: "2026-09-06",
  defaultTargetCount: 3,
  defaultPenaltyPerMiss: 1000,
  defaultRewardPerExtra: 0,
  members: [{ id: "u1", nickname: "테스트" }],
  weeklyRules: [],
  exemptions: [],
};

describe("penalty - linear mode", () => {
  it("no miss = 0 penalty", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      workouts: [
        { user_id: "u1", date: "2026-09-01" },
        { user_id: "u1", date: "2026-09-02" },
        { user_id: "u1", date: "2026-09-03" },
      ],
    });
    expect(result[0].totalPenalty).toBe(0);
  });

  it("miss 1 = 1000", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      workouts: [
        { user_id: "u1", date: "2026-09-01" },
        { user_id: "u1", date: "2026-09-02" },
      ],
    });
    expect(result[0].totalPenalty).toBe(1000);
  });

  it("miss 3 = 3000", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      workouts: [],
    });
    expect(result[0].totalPenalty).toBe(3000);
  });
});

describe("penalty - progressive mode", () => {
  it("miss 1: base=1000 step=1000 → 1000", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      progressivePenalty: true,
      progressiveStep: 1000,
      workouts: [
        { user_id: "u1", date: "2026-09-01" },
        { user_id: "u1", date: "2026-09-02" },
      ],
    });
    expect(result[0].totalPenalty).toBe(1000);
  });

  it("miss 2: base=1000 step=1000 → 1000+2000=3000", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      progressivePenalty: true,
      progressiveStep: 1000,
      workouts: [
        { user_id: "u1", date: "2026-09-01" },
      ],
    });
    expect(result[0].totalPenalty).toBe(3000);
  });

  it("miss 3: base=1000 step=1000 → 1000+2000+3000=6000", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      progressivePenalty: true,
      progressiveStep: 1000,
      workouts: [],
    });
    expect(result[0].totalPenalty).toBe(6000);
  });

  it("miss 3: base=1000 step=500 → 1000+1500+2000=4500", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      progressivePenalty: true,
      progressiveStep: 500,
      workouts: [],
    });
    expect(result[0].totalPenalty).toBe(4500);
  });

  it("miss 3: base=1000 step=2000 → 1000+3000+5000=9000", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      progressivePenalty: true,
      progressiveStep: 2000,
      workouts: [],
    });
    expect(result[0].totalPenalty).toBe(9000);
  });

  it("progressive off → linear even with step set", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      progressivePenalty: false,
      progressiveStep: 1000,
      workouts: [],
    });
    expect(result[0].totalPenalty).toBe(3000);
  });
});

describe("penalty - reward per extra", () => {
  it("extra 2 with reward=500 → -1000", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      defaultRewardPerExtra: 500,
      workouts: [
        { user_id: "u1", date: "2026-09-01" },
        { user_id: "u1", date: "2026-09-02" },
        { user_id: "u1", date: "2026-09-03" },
        { user_id: "u1", date: "2026-09-04" },
        { user_id: "u1", date: "2026-09-05" },
      ],
    });
    expect(result[0].totalPenalty).toBe(-1000);
  });
});

describe("penalty - exemptions", () => {
  it("exempted week → 0 penalty", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      exemptions: [{ user_id: "u1", week_start: "2026-08-31" }],
      workouts: [],
    });
    expect(result[0].totalPenalty).toBe(0);
    expect(result[0].exemptedWeeks).toBe(1);
  });
});

describe("penalty - tagged workouts", () => {
  it("tagged user gets credit", () => {
    const result = calcMemberPenalties({
      ...BASE_INPUT,
      members: [
        { id: "u1", nickname: "A" },
        { id: "u2", nickname: "B" },
      ],
      workouts: [
        { user_id: "u1", date: "2026-09-01", tagged_with: ["u2"] },
        { user_id: "u1", date: "2026-09-02", tagged_with: ["u2"] },
        { user_id: "u1", date: "2026-09-03", tagged_with: ["u2"] },
      ],
    });
    expect(result[0].totalPenalty).toBe(0);
    expect(result[1].totalPenalty).toBe(0);
  });
});
