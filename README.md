# みんなの精算（再構築）

家族向けの立替・精算 Web アプリ。現行の [kakeibo-share](../kakeibo-share) と同じ製品振る舞いを目指し、スタックだけ作り直す。

## スタック（決定）

| 層 | 技術 |
|----|------|
| フロント | Vite + React + TypeScript |
| API | Hono on Cloudflare Workers（ローカルは Wrangler） |
| DB | Cloudflare D1（SQLite） |

## Git

- リモート: `https://github.com/HProgramingCode/kakeibo-replace.git`
- 旧アプリ参照（手元のみ）: [reference/README.md](./reference/README.md)

## ドキュメント

- [要件・技術まとめ](./docs/requirements-and-tech.md)
- [守る振る舞い（現行からの棚卸し）](./docs/behavior-inventory.md)
- **設計**: [画面遷移](./docs/design/screen-flow.md) / [業務フロー](./docs/design/business-flows.md) / [通信](./docs/design/communication.md) / [モック用ブリーフ](./docs/design/mock-brief.md)
- [タスク](./docs/tasks.md)

## 実装方針

- 本人が TDD でコードを書く。AI は要件・テスト観点・レビューに限る。
- 現行コードは参照のみ。構造の移植はしない。
