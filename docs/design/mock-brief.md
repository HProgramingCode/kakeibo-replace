# デザインモック用ブリーフ（第1段）

**この段階でやること**: 必要画面の **数・名前・役割** のみ。  
**まだ書かないこと**: 色・フォント・コンポーネント詳細・モック画像。別 AI で画像化する前に、チャットで見た目方向を壁打ちする。

根拠: [screen-flow.md](./screen-flow.md)

---

## 必要画面数

| 区分 | 数 | 備考 |
|------|-----|------|
| 独立ルートとしての画面 | **8** | Home, Login, Signup, GroupList, GroupNew, GroupJoin, GroupDetail, GroupCharts |
| GroupDetail 内タブ | **3** | Dashboard, RegisterExpense, History（URL は `/groups/:id` のまま） |
| モーダル / シート（画面扱い） | **4** | Members, Invite, DisplayName, LogoutConfirm（+ DeleteGroupConfirm は List / Detail 両方） |

ルート 8 + タブ 3 を「ユーザーが触る主要面」として **合計 11 面**（タブは Detail に内包）。モーダルは同一ルート上のオーバレイ。

---

## 画面名と役割

### 公開

| 名前 | 役割 |
|------|------|
| **Login** | メール・パスワードと Google でサインイン。Signup への導線。 |
| **Signup** | 新規登録。成功後はグループ一覧へ。 |

### ログイン後 — グループ

| 名前 | 役割 |
|------|------|
| **Home** | エントリ。未ログインなら Login、済なら GroupList へ誘導（実装でどちらかに寄せてよい）。 |
| **GroupList** | 所属グループ一覧。新規作成・行選択で詳細。owner は削除。ログアウト。 |
| **GroupNew** | グループ名入力と作成。 |
| **GroupJoin** | 招待 token で参加。失敗時は理由表示と一覧への逃げ道。 |

### ログイン後 — グループ詳細（`/groups/:id`）

| 名前 | 役割 |
|------|------|
| **GroupDetail** | グループ名・メンバー文脈・タブ切替・⋮ メニューの器。 |
| **Dashboard**（タブ） | 未精算の残高サマリ、送金プレビュー、精算確定。支出登録タブへの導線。 |
| **RegisterExpense**（タブ） | 支出の新規登録（均等 / 金額指定、立替者・参加者）。 |
| **History**（タブ） | 月別の支出と精算履歴。未精算の編集・削除（シート想定）。 |

### ログイン後 — 分析

| 名前 | 役割 |
|------|------|
| **GroupCharts** | 月次支出グラフ、累計・平均、立替者別内訳。詳細へ戻る。 |

### オーバレイ（モーダル / シート）

| 名前 | 役割 |
|------|------|
| **MembersSheet** | メンバー一覧と role 表示。 |
| **InviteSheet** | owner が招待 URL 発行・コピー（非 owner は出さない）。 |
| **DisplayNameSheet** | 自分の表示名編集。 |
| **LogoutConfirm** | ログアウト確認。 |
| **DeleteGroupConfirm** | グループ削除確認（owner のみ）。 |

---

## 第2段で足す予定（未着手）

- モバイルファーストのレイアウト指示
- 各画面の主情報ブロック（残高カード、支出行、精算ボタン等）
- 空状態・エラー状態の文言と配置
- 色・タイポ・トーン（壁打ち後）

---

## 関連

- [screen-flow.md](./screen-flow.md) — 遷移図
- [business-flows.md](./business-flows.md) — 業務フロー
- [communication.md](./communication.md) — API 対応
