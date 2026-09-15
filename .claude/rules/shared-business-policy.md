---
paths:
  - ".claude/shared-policy/**"
  - "tools/admin-app/src/app/strategy/policy/**"
  - "tools/admin-app/src/lib/document-roots.ts"
  - "tools/admin-app/src/components/Nav.tsx"
---

# 共通事業方針 (HARM)・SNS リパーパス戦略の同期・検証規約

3プロジェクト(stats47 / doboku-note / Obsidian vault)共通の判断枠組みの配布と検証の規約。**正本はこのリポジトリには無い。**

| 配布物 | 正本(Obsidian vault) | 中身 |
|---|---|---|
| `.claude/shared-policy/POLICY.md` | `memos\共通事業方針SSOT.md` | 事業・収益化判断枠組み(HARM・5つの判断の問い・原則) |
| `.claude/shared-policy/REPURPOSE.md` | `memos\リパーパス戦略SSOT.md` | SNS リパーパス戦略(6切り口・`angle` パラメータ・運用ルール)。X / IG / YouTube の writer エージェントと各チャネル policy が参照する(2026-09-15 に knowledge/reference 配下の旧 sns-repurpose-policy から移設・削除済み) |
| `.claude/shared-policy/STRUCTURE.md` | `memos\note記事構成SSOT.md` | note 記事本文の型(5 ステップ骨格・売れる 9 型・強化 6 部品・制約)。writer エージェントは `knowledge/reference/note-selling-structures.md`(doboku-note での適用表・機械ゲート・参照経路)経由で参照する(2026-09-15 に本文を移設) |

- **正本**: Obsidian vault `C:\Users\m004195\obsidian\memos\` 配下の上記 SSOT。編集はそのファイルだけで行う。doboku-note側の `.claude/shared-policy/*.md` は正本から配布された写しで、**手編集しない**(手編集は`npm run policy:check`/`policy:sync`が改変として検出し失敗する)
- **配布**: 正本更新後、Obsidian vaultで `npm run policy:sync` を実行するとstats47・doboku-noteへ配布される。配布物は 上記 `*.md`(本文) / `sync.mjs`(検証スクリプト) / `manifest.json`(SHA-256・`docs` に文書ごとの version・updated・sourcePath。トップレベルの version/updated/sourcePath は POLICY.md の値)
- **検証**: `npm run policy:check`(`preadmin`で`npm run admin`起動前に自動実行)。**SessionStart でも `scripts/check-shared-policy.mjs` が同じ検査を静かに走らせ、写しの手編集・欠落・(正本が隣にあれば)陳腐化を冒頭に表示する**(2026-09-15)。正本(Obsidian vault)が同じ親ディレクトリに無い環境(クラウド・単独clone)では、配布物とmanifestのlocal整合性だけを検査し「最新版との一致は未確認」と表示する
- **`application.json`はこのリポジトリが所有する**(sync対象外・手編集してよい)。doboku-note固有の適用文(対象読者・提供価値の解釈)を書く。共通原則の定義・KPI・優先順位はここに書かない
- **管理画面表示**: `/strategy/policy`(「戦略・収益化」→「共通事業方針」)で読み取り専用のミラー表示のみ(`document-roots.ts` の `shared-policy` root + `DocDetailView` を再利用)。全ページ共通ヘッダーには表示しない。書き換え機能は追加しない
- 対象作業(企画・収益化・商品設計・週次/月次計画とレビュー)では判断理由に「読者の課題／HARM分類と理由／提供価値・支払う理由／需要の証拠または未検証／次の検証」を短く含める。ユーザーの具体的指示や安全・公開規約を上書きしない
