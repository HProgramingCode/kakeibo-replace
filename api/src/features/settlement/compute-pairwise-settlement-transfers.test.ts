import { describe, expect, it } from "vitest";
import { computePairwiseSettlementTransfers } from "./compute-pairwise-settlement-transfers.ts";

describe("computePairwiseSettlementTransfers", () => {
  it("同じ二人の逆方向の負担だけを相殺する", () => {
    const transfers = computePairwiseSettlementTransfers([
      { amount: 1000, payer_id: "user-c", debtor_ids: ["user-b"] },
      { amount: 400, payer_id: "user-b", debtor_ids: ["user-c"] },
    ]);

    expect(transfers).toEqual([
      { from_user_id: "user-b", to_user_id: "user-c", amount: 600 },
    ]);
  });
  it("三者間の連鎖を別の相手への送金に振り替えない", () => {
    const transfers = computePairwiseSettlementTransfers([
      { amount: 1000, payer_id: "user-c", debtor_ids: ["user-b"] },
      { amount: 1000, payer_id: "user-a", debtor_ids: ["user-c"] },
    ]);

    expect(transfers).toEqual([
      { from_user_id: "user-b", to_user_id: "user-c", amount: 1000 },
      { from_user_id: "user-c", to_user_id: "user-a", amount: 1000 },
    ]);
  });
  it("金額指定と、立替者を含まない均等割に対応する", () => {
    const transfers = computePairwiseSettlementTransfers([
      {
        amount: 1000,
        payer_id: "payer-a",
        debtor_ids: ["payer-a", "user-b"],
        split_mode: "exact",
        share_amounts: { "payer-a": 300, "user-b": 700 },
      },
      {
        amount: 101,
        payer_id: "payer-a",
        debtor_ids: ["user-c", "user-d"],
      },
    ]);

    expect(transfers).toEqual([
      { from_user_id: "user-b", to_user_id: "payer-a", amount: 700 },
      { from_user_id: "user-c", to_user_id: "payer-a", amount: 50 },
      { from_user_id: "user-d", to_user_id: "payer-a", amount: 50 },
    ]);
  });
});
