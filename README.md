# みんなの精算（再構築）

家族向けの立替・精算 Web アプリ。スタック: Vite + React、Hono on Cloudflare Workers、D1。

## Git

- リモート: `https://github.com/HProgramingCode/kakeibo-replace.git`
- このリポジトリに含めるのは **アプリ本体**（将来の `src/`、`wrangler.toml` 等）。要件・設計メモと旧ソース参照は **手元の `docs/`・`reference/`**（`.gitignore`）。

## スタック

| 層 | 技術 |
|----|------|
| フロント | Vite + React + TypeScript |
| API | Hono on Cloudflare Workers |
| DB | Cloudflare D1（SQLite） |
| 認証 | HttpOnly Cookie `session`（同一オリジン） |

## 実装方針

- 本人が TDD でコードを書く。
- 手元 `docs/` に要件・画面設計・通信設計がある（Git 非追跡）。
