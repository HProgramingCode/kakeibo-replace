# 守る振る舞い — 現行 kakeibo-share からの棚卸し

**目的**: 再構築で失ってはいけない仕様を、画面・テスト・DB/RPC から抜き出した一覧。  
**注意**: 実装のコピー元ではない。新スタックでは API + アプリ層で同等を満たす。

---

## 画面・ルート（参照）

| パス | 内容 |
|------|------|
| `/login` | メール・パスワードログイン、Google OAuth |
| `/signup` | サインアップ |
| `/groups` | 所属グループ一覧、作成導線、owner の削除 |
| `/groups/new` | グループ作成 |
| `/groups/join?token=…` | 招待参加 |
| `/groups/[id]` | 詳細（ダッシュボード・支出登録・履歴タブ、メニュー: チャート・メンバー・招待・表示名・ログアウト） |
| `/groups/[id]/charts` | 支出グラフ |

現行の PWA（`/~offline`）は再構築スコープ外。

---

## 認証・プロフィール（AUTH / PROF）

- 未ログインで保護ルートにアクセス → ログインへ。
- サインアップ成功後、プロフィール行が存在する（現行: `auth.users` トリガーで `profiles` 作成）。
- ログアウトでセッション終了。
- Google OAuth 利用時は Dashboard 側の Provider 設定が前提（再構築では API/IdP 設計で代替）。
- 表示名を更新できる（グループ詳細メニュー等）。

---

## グループ（GRP / GRP-DEL）

- グループ作成: 名前必須。作成者は `owner` としてメンバーに自動追加（現行: DB トリガー `add_creator_as_group_owner`）。
- 一覧: 自分がメンバーのグループのみ。
- 詳細: メンバーでないユーザー → 404（情報漏えい防止）。
- 削除: **owner のみ**。非 owner はエラーメッセージ（「削除できるのはオーナーのみです」相当）。

---

## 招待（INV）

- owner が招待を発行。平文トークンは URL に載せ、DB には **SHA-256 ハッシュ**（UTF-8 → hex）のみ保存。
- `expires_at` 以降は `invalid_or_expired_invite` 相当で拒否。
- 無効トークンは拒否。
- 既にメンバー → 再 INSERT せず **group_id を返す**（冪等）。
- 未認証 → 拒否。

---

## 支出（EXP）

### データ

- `amount`: 正の整数（円）。
- `expense_date`: 日付（現行デフォルトは Asia/Tokyo 基準の「今日」）。
- `category`: 食費 / 日用品 / 交通 / 娯楽 / その他（サーバーでも同集合を検証）。
- `payer_id`: グループメンバー。
- `status`: `unpaid` | `settled`（精算確定で `settled`）。
- `client_request_id`: 作成時に付与可能。**同一 group + client_request_id は一意**（二重送信防止）。

### 操作

- 作成・更新・削除（未精算のみ編集可能であること — 現行 UI/Action の前提を維持）。
- 参加者は 1 人以上。

### 割り勘モード（SPL）

| モード | ルール |
|--------|--------|
| `equal` | 参加者に均等割。**端数は立替者に加算**。 |
| `equal` + 立替者が参加者に含まれない | 参加者にのみ均等割。**端数のみ立替者負担**（立替のみ登録）。 |
| `exact` | 各参加者の `share_amount` は正整数。合計 = `amount` でなければ拒否。0 以下・空文字は拒否。 |

**テストで固定されている計算**（`dashboard-balances.test.ts` 等）:

- 101 円・2 人（立替者含む）→ 51 / 50。
- 101 円・立替者除外・2 参加者 → 立替 1、各 50。
- `exact` 3000 → 指定 share をそのまま使用。
- ネット残高: 全ユーザーの合計は **常に 0**（立替のみ・exact 両方）。

### DB 整合（現行 RPC/トリガー → 再構築では API + D1 で再現）

- `exact` 時: 参加者 0、share 欠損、合計不一致はエラー（現行: `exact_split_*` 例外）。

---

## 精算・残高（SET）

### ダッシュボード（未精算のみ）

- 未精算支出から **ユーザーごとのネット残高** を計算。
- **二者間相殺**: 同じ二人間の逆方向の負担だけ相殺（三者連鎖を勝手に 1 本にまとめない）。

**テスト例**（`computePairwiseSettlementTransfers`）:

- C が 1000 立替（B 負担）+ B が 400 立替（C 負担）→ B→C 600 の 1 本。
- C→B 1000 と A→C 1000 は **2 本のまま**（連鎖相殺しない）。
- exact + 立替者非参加の均等割が混在しても正しい送金リスト。

### 確定

- 現行は **月次** から **期間精算** に拡張: `settlement_batches` に `period_started_at` / `period_ended_at`。前回確定〜今回までの未精算を対象。
- 確定時: バッチ作成、`settlement_transfers` 行、対象支出を `settled` + `settlement_batch_id` 紐付け。
- 同一グループで **重複確定** の扱いは現行 RPC（`confirm_group_settlement` / 旧 `confirm_monthly_settlement`）に合わせて API で定義する（未精算 0 のときの挙動含む）。

---

## 履歴（HIS）

- 月選択肢: 精算済み支出・未精算・精算バッチの月をマージし **降順**。データがなくても **当月** は選択肢に含む。
- 支出フィルタ: `expense_date` の YYYY-MM。
- バッチフィルタ: `target_month` または `period_ended_at` の月（期間精算で target_month が null の行）。

---

## グラフ（CHT）

- 月次合計（`expense_date` の YYYY-MM 集計）。
- 累計・累進平均（表示期間先頭月からの cumulative / 月数）。
- 立替者別・参加者 share を考慮した内訳（`buildMonthlySpendSeries` / payer breakdown 系）。

---

## エンティティ（現行 Postgres → D1 設計のたたき台）

| テーブル | 要点 |
|----------|------|
| `profiles` | `id` = ユーザー ID、`display_name` |
| `groups` | `name`, `created_by` |
| `group_members` | `role`: owner / member、一意 (group, user) |
| `group_invites` | `token_hash`, `expires_at` |
| `expenses` | 上記 + `split_mode`, `client_request_id` |
| `expense_participants` | `share_amount`（exact 時） |
| `settlement_batches` | 期間・作成者 |
| `settlement_transfers` | from / to / amount、from ≠ to |

現行の **RLS** は「メンバーのみ読書き」「owner のみ招待閲覧・グループ削除」等。再構築では **API の認可 middleware + クエリ条件** で同等を実装する。

---

## 現行 RPC / 関数（API エンドポイント設計の参考）

| 名前 | 役割 |
|------|------|
| `accept_group_invite(token)` | 招待参加 |
| `create_expense_with_participants` | 支出 + 参加者を一括 |
| `update_expense_with_participants` | 同上・更新 |
| `confirm_group_settlement(group_id)` | 期間精算確定 |
| `is_group_member` / `is_group_owner` | 認可ヘルパ（アプリ層へ） |

---

## テストからの受け入れ条件チェックリスト

再構築のドメイン層では、最低限以下を Vitest で再現する。

- [ ] `computeParticipantShares`（均等・立替除外・端数）
- [ ] `computeExpenseShares`（equal / exact）
- [ ] `computeNetBalancesByUser`（合計ゼロ）
- [ ] `validateParticipantShares` / `isExactShareSumValid`
- [ ] `computePairwiseSettlementTransfers`（3 ケース以上）
- [ ] 履歴月オプション・月フィルタ（history-filter 相当）

---

## 意図的に再構築で変えてよいもの

- Server Actions → HTTP API
- Supabase Auth → 自前または Workers 向け IdP（方式は未決）
- Postgres UUID / timestamptz → SQLite 方言（型・関数の置き換え）
- RSC / middleware → クライアントルーティング + API 401/403

---

## 参照した現行パス（調査用）

- `src/features/settlement/balance/model/dashboard-balances.test.ts`
- `src/features/expenses/form/model/validate-participant-shares.test.ts`
- `src/app/groups/[id]/_lib/history-filter.test.ts`
- `supabase/migrations/*.sql`
- `src/shared/navigation/routes.ts`
