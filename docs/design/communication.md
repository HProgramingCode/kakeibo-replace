# 通信・API 境界

アーキテクチャ: **Vite + React** は **Hono（Cloudflare Workers）** のみと HTTP で通信。**D1 にはブラウザから直接接続しない**。

```mermaid
flowchart LR
  browser[ViteReact]
  worker[WorkersSameOrigin]
  db[D1]
  browser -->|"/api JSON + Cookie"| worker -->|"SQL batch"| db
  browser -->|"GET assets"| worker
```

- **本番**: 静的ファイルと Hono は **同一 Workers オリジン**。ブラウザは `/api/*` のみ API 呼び出し。**CORS 不要**。
- **認証**: Cookie 名 `session`（HttpOnly）。詳細は [requirements-and-tech.md](../requirements-and-tech.md) §6.1.1。
- 認可（member / owner）は **API 層**（現行 RLS の置き換え）。

---

## レイヤ責務

| 層 | 責務 |
|----|------|
| React | 表示・入力・ルーティング・fetch・エラー表示 |
| Hono | 認証検証、認可、Zod 検証、ドメイン計算、D1 アクセス |
| D1 | 永続化、制約、マイグレーション |

---

## 認証の付与（概念）

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Hono
  participant D as D1

  B->>A: POST /auth/login
  A->>D: 資格情報検証
  A-->>B: Set-Cookie session=...
  Note over B,A: 以降 Cookie 付き /api リクエスト

  B->>A: GET /api/groups + Cookie
  A->>A: Session 検証
  alt 無効
    A-->>B: 401
  else 有効
    A->>D: クエリ
    A-->>B: 200 JSON
  end
```

Google OAuth も **`/api/auth/oauth/callback` が同じ `session` Cookie を発行**。

---

## 認可パターン

```mermaid
flowchart TD
  req[API リクエスト]
  auth{Session OK?}
  mem{group member?}
  own{group owner?}
  ok[ハンドラ実行]
  r401[401]
  r403[403]
  r404[404]

  req --> auth
  auth -->|否| r401
  auth -->|是| mem
  mem -->|否 かつ グループスコープ| r404
  mem -->|是| own
  own -->|owner 必須操作で否| r403
  own -->|可| ok
```

| 操作例 | 認可 |
|--------|------|
| GET `/groups/:id` | member |
| DELETE `/groups/:id` | owner |
| POST `/groups/:id/invites` | owner |
| POST `/groups/join` | ログイン済 + valid token |
| POST `/groups/:id/expenses` | member |
| POST `/groups/:id/settlement/confirm` | member |
| GET `/groups/:id/charts-data` | member |

非メンバーが `:id` を推測 → **404**（403 より情報を出さない方針）。

---

## エンドポイント草案（画面ドキュメントとの対応）

実装時のたたき台。メソッド・パスは変更可。

| 画面 / 業務 | メソッド | パス（案） | D1 触る |
|-------------|----------|------------|---------|
| Login | POST | `/api/auth/login` | users / sessions |
| Signup | POST | `/api/auth/signup` | users, profiles |
| Logout | POST | `/api/auth/logout` | sessions |
| OAuth callback | GET | `/api/auth/oauth/callback` | users, profiles |
| プロフィール更新 | PATCH | `/api/me/profile` | profiles |
| GroupList | GET | `/api/groups` | groups, members |
| GroupNew | POST | `/api/groups` | groups, members |
| GroupDetail 初期 | GET | `/api/groups/:id` | groups, members, unpaid expenses |
| GroupDetail Dashboard | GET | `/api/groups/:id/balance-preview` | expenses（未精算）→ **ドメイン計算は API 内** |
| 支出作成 | POST | `/api/groups/:id/expenses` | expenses, participants |
| 支出更新 | PATCH | `/api/groups/:id/expenses/:eid` | 同上 |
| 支出削除 | DELETE | `/api/groups/:id/expenses/:eid` | 同上 |
| 精算確定 | POST | `/api/groups/:id/settlement/confirm` | batch, transfers, expenses **batch** |
| History | GET | `/api/groups/:id/history?month=` | expenses, batches |
| 招待発行 | POST | `/api/groups/:id/invites` | invites |
| GroupJoin | POST | `/api/invites/accept` | members, invites |
| GroupCharts | GET | `/api/groups/:id/charts` | expenses 集計 |
| グループ削除 | DELETE | `/api/groups/:id` | groups cascade |

精算ルール（割り勘・二者間相殺）は **共有ドメインモジュール**（Vitest 対象）と API の両方から呼ぶ。React にはビジネスロジックを置かない（プレビュー表示用の整形のみ可）。

---

## 代表シーケンス

### 支出登録

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Hono
  participant Dom as Domain
  participant D as D1

  B->>A: POST /groups/:id/expenses + body
  A->>A: Session + member チェック
  A->>A: Zod 検証
  A->>Dom: validateParticipantShares / compute shares
  alt 検証 NG
    A-->>B: 400
  else OK
    A->>D: INSERT expense + participants
    A-->>B: 201 + expense
  end
```

### 精算確定

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Hono
  participant Dom as Domain
  participant D as D1

  B->>A: POST /groups/:id/settlement/confirm
  A->>A: member チェック
  A->>D: SELECT unpaid expenses
  A->>Dom: computePairwiseSettlementTransfers
  A->>D: batch INSERT batch transfers UPDATE expenses
  Note over A,D: D1 batch で一括
  A-->>B: 200 + batch summary
```

### グループ詳細（初回ロード）

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as Hono

  par 並列 fetch 可
    B->>A: GET /groups/:id
    B->>A: GET /groups/:id/balance-preview
  end
  A-->>B: JSON 各種
  Note over B: タブ UI はクライアント状態
```

---

## URL（本番・ローカル）

| 環境 | 配信 | API |
|------|------|-----|
| 本番 | Workers 同一オリジン（静的 + `/api`） | 相対パス `/api/...`（CORS なし） |
| ローカル | Vite dev | Wrangler dev。Vite **proxy** で `/api` → Wrangler |

本番でフロントに API 原点の env は不要（相対 `/api`）。ローカルのみ proxy 設定。

---

## 関連

- [screen-flow.md](./screen-flow.md)
- [business-flows.md](./business-flows.md)
- [mock-brief.md](./mock-brief.md)
