# みんなの精算 — 要件・技術まとめ

参照元（振る舞いのみ）: 手元の `reference/kakeibo-share/`（Next.js + Supabase のコピー。git 非追跡）。コードは移植しない。

---

## 1. 概要（背景・目的・成功指標）

### 背景

- 現行アプリは AI 支援で作られており、自分で説明・改修できる状態にしたい。
- 副業獲得のため、ポートフォリオとして「設計判断」と「動く成果」を示したい。

### 目的

- 自分でコードを書き、テストで振る舞いを固定し、採用技術を説明できるようになる。
- 副業の軸: Web 受託・スタートアップ（TypeScript）、あわせて Python API も将来扱えるようにする（二本目は後段）。

### 成功指標

- 現行と同等の精算フローがブラウザで完走できる。
- README とテストから、なぜ Next.js ではないか、なぜ Workers + D1 かを説明できる。
- 精算ルール（割り勘・相殺・月次/期間確定）が単体テストで固定されている。

### 実装の進め方

- **TDD**: 失敗するテスト → 実装 → リファクタ。本人が書く。
- **AI の役割**: 要件整理、テスト観点の提案、レビュー。コードの代筆はしない。

---

## 2. スコープ

### 含む

- 認証（メール + パスワード、Google OAuth）
- プロフィール（表示名）
- グループ（作成・一覧・削除は owner のみ）
- 招待（トークン発行・参加）
- 支出（登録・編集・削除、均等割 / 金額指定、立替者と負担の分離）
- 未精算ダッシュボード・二者間相殺プレビュー・精算確定（期間ベース）
- 履歴（月フィルタ、精算バッチ表示）
- グラフ（月次支出・累計・立替者別内訳）
- レスポンシブ UI（現行の操作感・見た目を参照）

### 含まない

- SEO、SSR、Server Actions、Next.js
- Supabase（Auth / RLS / SQL RPC）の継続
- PWA / ネイティブアプリ（優先度低。Web 完成後に別判断）
- 現行 DB データの移行
- 同一 API の Go / FastAPI 同時実装（一本目が説明できるまで待つ）

詳細な振る舞いは [behavior-inventory.md](./behavior-inventory.md) を正とする。

---

## 3. 機能要件（要約）

| ID | 領域 | 要点 |
|----|------|------|
| AUTH | 認証 | サインアップ・ログイン・ログアウト。未認証は保護画面へ行けない。Google OAuth。 |
| PROF | プロフィール | 表示名の更新。 |
| GRP | グループ | 作成時に作成者が owner。メンバー以外はグループ詳細 404 相当。 |
| GRP-DEL | 削除 | owner のみ。一覧から削除可能。 |
| INV | 招待 | owner が招待 URL 発行。トークンはハッシュ保存。期限切れ・無効は拒否。既メンバーは再参加せず group_id を返す。 |
| EXP | 支出 | 金額正整数、カテゴリ、日付、立替者、参加者。`client_request_id` で作成の二重登録防止。 |
| SPL | 割り勘 | `equal` / `exact`。均等割の端数ルール・立替のみ負担は inventory 参照。 |
| SET | 精算 | 未精算支出から送金プレビュー。確定で batch + transfers、支出を settled に。期間は前回確定〜今回。 |
| HIS | 履歴 | 月で支出・精算バッチをフィルタ。 |
| CHT | グラフ | 月次合計、累計、月平均、立替者別。 |

---

## 4. 非機能要件

| 項目 | 方針 |
|------|------|
| 性能 | 家族規模（メンバー・支出数は少）。最適化より正しさと説明可能性。 |
| セキュリティ | グループ外のデータは取得・変更不可。招待トークンは平文を DB に保存しない。 |
| 可用性 | 学習・ポートフォリオ段階は Cloudflare 無料枠 + ローカル Wrangler で足りる。 |
| テスト | ドメイン（割り勘・精算）は Vitest。API 統合・E2E は縦割り後。 |
| コスト | D1 / Workers の無料枠内を想定。 |

---

## 5. 制約・前提

- **Git リモート**: `https://github.com/HProgramingCode/kakeibo-replace.git`
- **作業ツリー**: `apps/replace`。ブランチは `main` + 短命の作業ブランチ。
- **バージョン**: アプリ版は将来の `package.json` の `version`（初回 `0.1.0`）。依存の版は lockfile を正とする。
- 現行 `kakeibo-share` の `main` は凍結。履歴は取り込まない。
- 旧ソース参照: `reference/kakeibo-share/`（rsync、`reference/README.md` 参照）。`dist/` はビルド出力専用。

---

## 6. 技術選定

### 6.1 決定

| 項目 | 選定 | 理由 |
|------|------|------|
| フロント | Vite + React + TS | SEO 不要。Client + fetch で API と分離が明確。 |
| API | Hono on Workers | TypeScript を維持。Cloudflare にサーバーを置く。 |
| DB | D1（SQLite） | Workers と同じプラットフォーム。Hyperdrive + 別 Postgres は接続が増える。 |
| 検証 | Zod | API 入力。フロントでも共有可能。 |
| ローカル | Wrangler | Workers / D1 と本番に近い。 |
| 精算の複数更新 | D1 `batch` | 確定時の一括更新。 |
| 配信 | Workers 同一オリジン | 静的アセット + Hono。ブラウザは `/api/*` のみ。CORS なし。 |
| 認証 | HttpOnly Cookie セッション | 6.1.1 参照。JWT / localStorage は使わない。 |

### 6.1.1 実行基盤（詳細）

#### Git・参照

| 項目 | 方針 |
|------|------|
| リモート | `https://github.com/HProgramingCode/kakeibo-replace.git` |
| lockfile | `package-lock.json` をコミット |
| 旧アプリ | `reference/kakeibo-share/` にソース・テストのみ（gitignore） |

#### 秘密情報

| 場所 | 用途 |
|------|------|
| `.dev.vars` | ローカル Wrangler（gitignore） |
| Workers Secrets | 本番（`GOOGLE_CLIENT_SECRET` 等） |
| フロント env | **秘密を置かない** |

ログに出さない: パスワード、セッション ID、招待トークン平文。パスワードは **Web Crypto PBKDF2** でハッシュ。

#### ライブラリ（初回スキャフォールド想定）

`hono`, `zod`, `react`, `react-dom`, `vite`, `vitest`, `wrangler`, `typescript`。DB は D1 prepared statement。

#### クライアント状態

API 結果は画面単位の `fetch` + `useState`。タブは URL クエリ。グローバルストアは使わない。

#### ログ

Workers で 1 行 JSON（`method`, `path`, `status`, `durationMs`, `errorCode`）。`wrangler tail`。外部 SaaS なし。

#### セッション・Cookie

Cookie 名 `session`（HttpOnly, Path=/, SameSite=Lax, 本番 Secure）。D1 `sessions` に user_id と expires_at。有効 14 日。ログアウトで行削除。CSRF トークンは置かない。OAuth も同 Cookie。

#### 開発時 URL

本番は同一オリジン。ローカルは Vite + Wrangler、`vite.config` で `/api` を Wrangler に proxy。

### 6.2 見送り

- Next.js（RSC / Server Actions が不要）
- Supabase（RLS + RPC を API + アプリ層の認可に置き換える）
- Node 常駐 API、Turso、PostgreSQL + Hyperdrive（**このアプリの第一 DB として**）
- Nest、C# / ASP.NET（`kakeibo-share-update` 系）
- PWA / ネイティブ（スコープ外・低優先）
- JWT / localStorage、Pages と Workers の分割、CORS
- Drizzle、Zustand、TanStack Query、Sentry
- 旧プロジェクトを `dist/` に置くこと

### 6.3 未決

- **二本目 API**: Go か FastAPI（Hono 版を説明できる後）。
- **Google OAuth** の Client ID / Secret の取得タイミング（実装 AUTH 時）。

---

## 7. 移行順（縦割り）

```text
1. リポジトリ骨格（Wrangler, Hono, D1 マイグレーション空）
2. ドメイン: 割り勘・ネット残高・二者間相殺（Vitest、DB なし）
3. AUTH + PROF
4. GRP + INV
5. EXP + SPL
6. SET + HIS
7. CHT + UI 仕上げ
8. README / ポートフォリオ用デモ
9. （任意）同契約の Go または FastAPI
```

各段: 守る振る舞いを inventory から拾う → 失敗テスト → API → 画面接続 → 手動確認。

---

## 8. 未決・リスク・次のアクション

| 種別 | 内容 |
|------|------|
| 未決 | 二本目 API（Go / FastAPI） |
| リスク | D1 と Postgres の SQL 方言差（UUID、トリガー、RLS の置き換え） |
| リスク | ローカル dev で Vite proxy と Cookie の挙動 |
| 次 | [behavior-inventory.md](./behavior-inventory.md) を API 設計のチェックリストに使う |
| 次 | D1 スキーマ草案（現行 Postgres から RLS をアプリ認可に落とす） |

---

## 9. 未決事項リスト（短）

- 二本目: Go / FastAPI
