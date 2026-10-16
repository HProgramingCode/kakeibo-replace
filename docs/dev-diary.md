# dev-diary

## 記録一覧

### 2026-10-17 — 実行基盤の決定

- **やったこと**: Git 初期化とリモート URL 設定（push はリポジトリ未作成のため未実施）。`reference/kakeibo-share` に旧ソース rsync（gitignore）。同一オリジン Workers、Cookie セッション、秘密情報・ログ・状態管理・ライブラリ方針を requirements に追記。communication を `/api` + Cookie に合わせた。
- **触ったパス**: `.gitignore`, `reference/`, `docs/requirements-and-tech.md`, `docs/design/communication.md`, `README.md`

### 2026-10-17 — 画面・業務・通信の設計図

- **やったこと**: `docs/design/` に画面遷移（Mermaid）、業務フロー（認証〜グラフ）、Browser→Hono→D1 通信・API 草案、`mock-brief` は画面数・名前・役割のみ（色・画像は未）。
- **触ったパス**: `docs/design/*.md`, `docs/tasks.md`, `README.md`

### 2026-10-17 — 再構築計画の文書化

- **やったこと**: 現行 `kakeibo-share` を参照し、要件・技術選定（Vite + React / Hono Workers / D1）と振る舞い棚卸しを `apps/replace/docs/` に作成。計画ファイル本体は編集せず、成果物のみリポジトリに反映。
- **触ったパス**: `README.md`, `docs/requirements-and-tech.md`, `docs/behavior-inventory.md`, `docs/tasks.md`
