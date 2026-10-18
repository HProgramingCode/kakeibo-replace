import { describe, expect, it } from "vitest";
import { computeParticipantShares } from "./compute-participant-shares.ts";
describe("均等割のとき 各メンバーが負担する円 を求める", () => {
  it("101円を2人で均等割し、端数1円を立替者が負担する", () => {
    // Arrange：テストデータの準備
    const amount = 101;
    const payerId = "payer-a";
    const participantIds = ["payer-a", "user-b"];

    // Act：テスト対象の関数を実行
    const result = computeParticipantShares(amount, payerId, participantIds);

    // Assert：期待する結果か検証
    expect(result.get("payer-a")).toBe(51);
    expect(result.get("user-b")).toBe(50);
  });

  it("立替者以外の二人で101円を均等割し、端数1円を立替者が負担する", () => {
    // Arrange：テストデータの準備
    const amount = 101;
    const payerId = "payer-a";
    const participantIds = ["user-b", "user-c"];

    // Act：テスト対象の関数を実行
    const result = computeParticipantShares(amount, payerId, participantIds);

    // Assert：期待する結果か検証
    expect(result.get("payer-a")).toBe(1);
    expect(result.get("user-b")).toBe(50);
    expect(result.get("user-c")).toBe(50);
  });
});
