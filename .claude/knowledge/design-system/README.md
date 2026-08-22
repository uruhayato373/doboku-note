# doboku-note デザインシステム

土木・建設系の試験対策ドキュメントサイトとして、可読性・学習効率・アクセシビリティを最優先するデザインシステム。

> **デザインの唯一の真実源（SSOT）は [`design-system.md`](./design-system.md)。**
> サイト UI・記事タイポグラフィのトークン体系・レイアウト体系・原則・禁止・更新手順はすべてそこに集約されている。デザインを変更するときは、まず `design-system.md` を読み、変更後は同一 PR で更新する。

## ファイル構成

| ファイル | 内容 |
|---|---|
| [`design-system.md`](./design-system.md) | **デザイン単一 SSOT**（トークン体系・レイアウト体系 PageShell/PageHeader/SectionCard・記事 prose・5 原則・禁止パターン・更新手順・ツーリング） |
| `svg-tokens.json` | 記事内 SVG 用デザイントークン真実源（colors / font / geometry） |
| `instagram-carousel.md` / `instagram-carousel-tokens.json` | Instagram カルーセル（exam-packs）デザイン仕様 — **別サブシステム** |
| `note-cover.md` / `note-cover-tokens.json` | note カバー画像（G2「全幅バナー帯」）デザイン仕様 — **別サブシステム** |

> トークン値の機械真実源は `src/styles/globals.css` の CSS 変数。別サブシステム（SVG 図版・IG カルーセル・note カバー・サイト OGP）の位置づけは `design-system.md` §9 を参照。
