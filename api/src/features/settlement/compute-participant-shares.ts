export function computeParticipantShares(
  amount: number,
  payerId: string,
  participantIds: string[],
): Map<string, number> {
  const shares = new Map<string, number>();

  const base = Math.floor(amount / participantIds.length);
  const remainder = amount % participantIds.length;

  for (const id of participantIds) {
    shares.set(id, base);
  }

  shares.set(payerId, (shares.get(payerId) ?? 0) + remainder);

  return shares;
}
