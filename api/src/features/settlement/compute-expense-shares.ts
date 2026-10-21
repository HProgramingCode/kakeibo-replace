import { computeDebtorShares } from "./compute-debtor-shares.ts";

export type ExpenseShareInput = {
  amount: number;
  payerId: string;
  debtorIds: string[];
  splitMode: "exact" | "equal";
  shareAmounts?: Record<string, number>;
};

export function computeExpenseShares(
  input: ExpenseShareInput,
): Map<string, number> {
  const { amount, payerId, debtorIds, splitMode, shareAmounts } = input;

  if (splitMode === "exact") {
    const shares = shareAmounts ?? {};
    const result = new Map<string, number>();
    for (const id of debtorIds) {
      if (id in shares) {
        result.set(id, shares[id]!);
      }
    }
    return result;
  }

  return computeDebtorShares(amount, payerId, debtorIds);
}
