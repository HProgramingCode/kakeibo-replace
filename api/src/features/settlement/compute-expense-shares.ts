import { computeParticipantShares } from "./compute-participant-shares.ts";

export type ExpenseShareInput = {
  amount: number;
  payerId: string;
  participantIds: string[];
  splitMode: "exact" | "equal";
  shareAmounts?: Record<string, number>;
};

export function computeExpenseShares(
  input: ExpenseShareInput,
): Map<string, number> {
  const { amount, payerId, participantIds, splitMode, shareAmounts } = input;

  if (splitMode === "exact") {
    const shares = shareAmounts ?? {};
    const result = new Map<string, number>();
    for (const id of participantIds) {
      if (id in shares) {
        result.set(id, shares[id]!);
      }
    }
    return result;
  }

  return computeParticipantShares(amount, payerId, participantIds);
}
