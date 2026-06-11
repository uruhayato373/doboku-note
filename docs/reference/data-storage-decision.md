---
title: データストレージ判断 — D1 不採用と再検討トリガー
---

# データストレージ判断 — D1 不採用と再検討トリガー

複数試験追加時に「タグ・キーワード管理を Cloudflare D1（SQLite）に寄せるか」という論点に対する ADR の圧縮版。元 ADR は `docs/reference/data-storage-decision.md`（commit `5613b76a`）にあり、2026-04-27 に本ファイルへ集約・移管した。

## 決定（2026-04-14）

**D1 は導入しない。frontmatter 拡張 + build-time JSON インデックスで対応する。**

将来 iOS アプリのバックエンドや Web ダッシュボード実装時に、ユーザーデータ専用に D1 を導入する余地はあるが、その場合も「コンテンツ管理は MDX、ユーザーデータは D1」の棲み分けを守る。

## 根拠（要約）

- **静的サイトの優位性を捨てるコストが大きい** — TTFB、CDN エッジ完結、ローカル開発の単純さを失う
- **規模が DB 必要ラインに達していない** — MDX ファイル数 ~700（拡張後でも 2,000-3,000）、build-time のみのクエリ、認証ユーザーゼロ
- **タグ・キーワード横断は frontmatter で解決可能** — `exams: []` 配列で 1 つの MDX を複数試験に再利用できる
- **git を真実源として失う代償が大きい** — PR レビュー・履歴・バックアップが git で完結する利点

## frontmatter 拡張アプローチ

試験横断キーワードは frontmatter に試験配列で表現する:

```yaml
exams:
  - pe-comprehensive-management
  - civil-construction-1
sections:
  pe-comprehensive-management: '2.1'
  civil-construction-1: '4-3'
```

カテゴリ別ページがビルド時に `exams` 配列でフィルタすれば、1 つの MDX が複数試験で再利用できる。

### 関連実装（真実源は実装ファイル）

| 項目 | ファイル |
|---|---|
| zod スキーマ | `.claude/scripts/lib/frontmatter-schema.mjs` + `src/lib/frontmatter-schema.ts` |
| タグ辞書ビルダー | `.claude/scripts/build-tag-index.mjs` → `src/config/tag-dictionary.json` |
| 試験横断キーワード | `.claude/scripts/build-cross-exam-keyword-index.mjs` → `src/config/cross-exam-keywords.json` |
| frontmatter lint | `.claude/scripts/lint-frontmatter.mjs` |
| pre-commit 検証 | `scripts/pre-commit-mdx.mjs` |
| ルール真実源 | `.claude/skills/quality/check-mdx/SKILL.md` |

frontmatter 検査ルールの追加・変更手順は `.claude/skills/quality/check-mdx/SKILL.md` を参照。

## 再検討トリガー

以下のいずれかが現実化したら本決定を再評価する:

| トリガー | 検討する DB の用途 |
|---|---|
| iOS アプリの本格開発が始まる | ユーザーデータ専用の D1 |
| MDX ファイル数が 10,000 を超える | コンテンツ DB は不要、検索のみ別系統検討 |
| `.claude/state/quality-scores.json` が 5MB を超える | Quality Cycle 専用の D1 |
| 編集者が 3 名以上になる | Decap CMS or Git ベース CMS |
| ユーザー認証機能を実装する | D1 + Workers Auth |
| 試験を 5 種類以上扱う | frontmatter 拡張で対応継続、ただし規約厳格化 |
| ビルド時間が 5 分を超える | 増分ビルド戦略を検討（DB 化は最終手段） |

## 参考リンク

- Cloudflare D1: https://developers.cloudflare.com/d1/
- Decap CMS（Git ベース CMS）: https://decapcms.org/
- Astro Content Collections（frontmatter スキーマ運用の参考）: https://docs.astro.build/en/guides/content-collections/

## 改訂履歴

- 2026-04-14: 元 ADR `docs/reference/data-storage-decision.md` 初版（commit `5613b76a`）。複数試験対応の議論を経て D1 不採用を決定
- 2026-04-27: ADR を圧縮し本ファイルへ移管。元ファイル削除。詳細経緯は git history 参照
