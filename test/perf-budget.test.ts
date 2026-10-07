import { describe, it, expect } from "vitest";

const BUDGETS: Record<string, number> = {
  "/records": 800,
  "/penalty": 600,
  "/stats": 600,
  "/settings": 500,
  "/workout/new": 400,
};

describe("performance budgets", () => {
  it("all pages have defined budgets", () => {
    expect(Object.keys(BUDGETS).length).toBeGreaterThanOrEqual(5);
  });

  for (const [page, budget] of Object.entries(BUDGETS)) {
    it(`${page} budget is ${budget}ms`, () => {
      expect(budget).toBeGreaterThan(0);
      expect(budget).toBeLessThanOrEqual(1000);
    });
  }

  it("every budget is at most 1 second", () => {
    for (const [, budget] of Object.entries(BUDGETS)) {
      expect(budget).toBeLessThanOrEqual(1000);
    }
  });
});
