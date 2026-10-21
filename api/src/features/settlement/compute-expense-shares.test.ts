import { describe, expect, it } from "vitest";
import { computeExpenseShares } from "./compute-expense-shares.ts";

describe("computeExpenseShares", () => {
  it("exact では指定した share をそのまま返す", () => {
    const result = computeExpenseShares({
      amount: 3000,
      payerId: "payer-a",
      debtorIds: ["payer-a", "user-b"],
      splitMode: "exact",
      shareAmounts: { "payer-a": 1200, "user-b": 1800 },
    });

    expect(result.get("payer-a")).toBe(1200);
    expect(result.get("user-b")).toBe(1800);
  });
});
