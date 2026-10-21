import { computeExpenseShares } from "./compute-expense-shares.ts";

export type PayInfoEntry = {
  amount: number;
  payer_id: string;
  debtor_ids: string[];
  split_mode?: "equal" | "exact";
  share_amounts?: Record<string, number>;
};

export type PayInfoResult = {
  from_user_id: string;
  to_user_id: string;
  amount: number;
};

/**
 * 支出ごとの「負担者 → 立替者」を二人組ごとにだけ相殺する。
 * 三者間の債務を別の相手へ振り替えない。
 */
export function computePairwiseSettlementTransfers(
  payinfoList: PayInfoEntry[],
): PayInfoResult[] {
  const pairBalances = new Map<
    string,
    { lowId: string; highId: string; lowToHigh: number }
  >();

  for (const payinfo of payinfoList) {
    const shares = computeExpenseShares({
      amount: payinfo.amount,
      payerId: payinfo.payer_id,
      debtorIds: payinfo.debtor_ids,
      splitMode: payinfo.split_mode ?? "equal",
      ...(payinfo.share_amounts !== undefined
        ? { shareAmounts: payinfo.share_amounts }
        : {}),
    });

    for (const [debtorId, amount] of shares) {
      if (debtorId === payinfo.payer_id || amount <= 0) continue;

      const [lowId, highId] =
        debtorId <= payinfo.payer_id
          ? [debtorId, payinfo.payer_id]
          : [payinfo.payer_id, debtorId];
      const key = `${lowId} + ${highId}`;
      const pair = pairBalances.get(key) ?? { lowId, highId, lowToHigh: 0 };
      pair.lowToHigh += debtorId === lowId ? amount : -amount;
      pairBalances.set(key, pair);
    }
  }

  return [...pairBalances.values()]
    .filter((pair) => pair.lowToHigh !== 0)
    .map((pair) =>
      pair.lowToHigh > 0
        ? {
            from_user_id: pair.lowId,
            to_user_id: pair.highId,
            amount: pair.lowToHigh,
          }
        : {
            from_user_id: pair.highId,
            to_user_id: pair.lowId,
            amount: -pair.lowToHigh,
          },
    )
    .sort(
      (a, b) =>
        a.from_user_id.localeCompare(b.from_user_id) ||
        a.to_user_id.localeCompare(b.to_user_id),
    );
}
