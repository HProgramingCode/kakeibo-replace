# 業務フロー

画面遷移は [screen-flow.md](./screen-flow.md)。ここでは **ユーザーが達成すること** と **守る判定** を固定する。

---

## 1. 認証（AUTH / PROF）

```mermaid
flowchart TD
  start([開始])
  signup[サインアップ]
  login[ログイン]
  oauth[Google OAuth]
  profile[プロフィール作成]
  ok([GroupList])

  start --> signup
  start --> login
  login --> oauth
  signup --> profile
  oauth --> profile
  profile --> ok
  login -->|成功| ok
```

| 守る判定 |
|----------|
| 未認証は保護 API / 画面不可（401 → Login） |
| サインアップ成功時に `profiles` 相当行が存在 |
| 表示名更新は本人のみ |

---

## 2. グループ作成・削除（GRP / GRP-DEL）

### 作成

```mermaid
flowchart LR
  A[GroupNewで名前入力] --> B[API create group]
  B --> C[作成者を owner で member 追加]
  C --> D[GroupDetailへ]
```

| 守る判定 |
|----------|
| 名前必須 |
| 作成者 = owner（自動） |

### 削除

```mermaid
flowchart TD
  A[削除要求] --> B{role = owner?}
  B -->|否| E[エラー: オーナーのみ]
  B -->|是| C[確認UI]
  C --> D[API delete group]
  D --> F[GroupList]
```

| 守る判定 |
|----------|
| owner のみ削除可 |
| 一覧・詳細メニューの両方から到達可 |

---

## 3. 招待（INV）

### 発行（owner）

```mermaid
flowchart LR
  A[招待メニュー] --> B[API create invite]
  B --> C[平文 token を URL に表示]
  C --> D[DB は token_hash のみ]
```

### 参加

```mermaid
flowchart TD
  T[token 付き URL] --> L{ログイン済?}
  L -->|否| Login[Login]
  Login --> J[GroupJoin]
  L -->|是| J
  J --> V{token 有効?}
  V -->|否| Err[エラー]
  V -->|是| M{既メンバー?}
  M -->|是| G[GroupDetail へ group_id]
  M -->|否| Add[member 追加]
  Add --> G
```

| 守る判定 |
|----------|
| 発行は owner のみ |
| 期限切れ・無効 token は拒否 |
| 既メンバーは冪等（再参加しない） |
| 未認証は参加不可 |

---

## 4. 支出登録（EXP / SPL）

```mermaid
flowchart TD
  F[RegisterExpense タブ] --> I[入力: 金額・日付・カテゴリ・立替者・参加者]
  I --> M{split_mode}
  M -->|equal| E1[均等割計算]
  M -->|exact| E2[各 share 入力]
  E1 --> V[検証]
  E2 --> V
  V -->|NG| Err[エラー表示]
  V -->|OK| API[API create expense + participants]
  API --> D[Dashboard 更新]
```

### 割り勘ルール（業務上の正）

| ケース | ルール |
|--------|--------|
| equal・立替者が参加者に含まれる | 参加者で均等割、**端数は立替者** |
| equal・立替者が参加者に含まれない | 参加者のみ均等割、**端数のみ立替者** |
| exact | share は正整数、**合計 = amount** |

| 守る判定 |
|----------|
| amount は正の整数 |
| カテゴリは定義集合のみ |
| 参加者 1 人以上 |
| exact: 0 以下・合計不一致は拒否 |
| `client_request_id` 重複は二重作成しない |
| **settled 支出は編集・削除不可**（未精算のみ） |

---

## 5. 精算プレビューと確定（SET）

### プレビュー（Dashboard・未精算のみ）

```mermaid
flowchart LR
  U[未精算 expenses 取得] --> N[ネット残高計算]
  N --> P[二者間相殺で送金リスト]
  P --> UI[画面表示]
```

| 守る判定 |
|----------|
| ネット残高の全ユーザー合計 = **0** |
| 相殺は **同一ペアの逆方向のみ**（三者連鎖はまとめない） |

### 確定

```mermaid
flowchart TD
  A[精算確定ボタン] --> B[確認]
  B --> C[API confirm settlement]
  C --> D[batch + transfers 作成]
  D --> E[対象 expenses を settled]
  E --> F[Dashboard / History 反映]
```

| 守る判定 |
|----------|
| 対象は **前回確定〜今回** の未精算（期間精算） |
| メンバーのみ実行可 |
| 未精算 0 件時の挙動は API 仕様で明示（エラー or 空 batch — 実装前に決定） |
| 確定は D1 `batch` で一括更新 |

---

## 6. 履歴（HIS）

```mermaid
flowchart LR
  M[月選択] --> FE[支出フィルタ expense_date]
  M --> FB[精算バッチフィルタ]
  FE --> L[一覧表示]
  FB --> L
```

| 守る判定 |
|----------|
| 月候補は settled / unpaid / batch の月をマージし降順 |
| **当月はデータがなくても選択肢に含む** |
| period 精算で `target_month` が null の batch は `period_ended_at` の月でフィルタ |

---

## 7. グラフ（CHT）

```mermaid
flowchart LR
  Q[グループの expenses 取得] --> S[月次合計シリーズ]
  S --> C[累計・月平均]
  S --> B[立替者別内訳]
```

| 守る判定 |
|----------|
| メンバーのみ `/groups/:id/charts` 閲覧可 |
| 集計は `expense_date` の YYYY-MM |

---

## フロー × 画面対応

| 業務 | 主な画面 |
|------|----------|
| 認証 | Login, Signup |
| グループ | GroupList, GroupNew |
| 招待 | GroupDetail メニュー, GroupJoin |
| 支出 | GroupDetail RegisterExpense タブ |
| 精算 | GroupDetail Dashboard タブ |
| 履歴 | GroupDetail History タブ |
| グラフ | GroupCharts |

---

## 関連

- [communication.md](./communication.md) — 上記を HTTP / D1 に落としたシーケンス
