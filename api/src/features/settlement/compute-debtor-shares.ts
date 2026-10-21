export function computeDebtorShares(
  amount: number,
  payerId: string,
  debtorIds: string[],
): Map<string, number> {
  const shares = new Map<string, number>();

  const base = Math.floor(amount / debtorIds.length);
  const remainder = amount % debtorIds.length;

  for (const id of debtorIds) {
    shares.set(id, base);
  }

  shares.set(payerId, (shares.get(payerId) ?? 0) + remainder);

  return shares;
}
