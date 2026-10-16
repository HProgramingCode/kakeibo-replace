# reference（手元参照）

旧アプリ `kakeibo-share` のソース・テストを、テスト作成時の参照用に置く。

- **git には含めない**（ルート `.gitignore` の `reference/`）。
- `node_modules` / `.next` / `.git` はコピーしない。
- 振る舞いの正は [../docs/behavior-inventory.md](../docs/behavior-inventory.md)。ここは読むだけ。

## コピー方法

```bash
rsync -a --delete \
  --exclude node_modules --exclude .next --exclude .git \
  ../kakeibo-share/ reference/kakeibo-share/
```
