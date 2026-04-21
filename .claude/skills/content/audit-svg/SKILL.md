---
name: audit-svg
description: >
  MDX 記事に埋め込まれた SVG の品質問題を検出する Evaluator スキル。文字クリップ、
  必須属性欠落、viewBox 超過、フォントサイズ過小、テキスト重なりを静的解析で検出し、
  .claude/state/svg-audit.json に出力する。修正は行わず検出のみ。
  Use when user asks to [SVG 監査, SVG 品質チェック, /audit-svg].
---

## 用途

`.local/r2/posts/**/img/*.svg` 配下の自作 SVG に対して、**文字が重なる・はみ出す・サイズが過小・アクセシビリティ属性欠落** といった品質問題を静的解析で検出する。修正は行わない（Generator 側の `/create-svg` や `/improve-article` が担当）。

## 検出パターン

| ID | 重大度 | パターン | 例 |
|---|---|---|---|
| **P1-text-clip** | HIGH | テキストが viewBox からはみ出している | `text-anchor="end"` で x=55 の 6 文字日本語ラベルが viewBox 左端より外に出る |
| **P2-text-overlap** | MEDIUM | テキスト同士の bounding box が重なっている | 隣接ラベルが近すぎ読み分けできない |
| **P3-missing-role** | MEDIUM | ルート `<svg>` に `role="img"` が無い | アクセシビリティ： スクリーンリーダが画像として扱えない |
| **P3-missing-aria** | MEDIUM | ルート `<svg>` に `aria-label` が無い | 同上 |
| **P3-missing-maxwidth** | HIGH | ルート `<svg>` に `style="max-width:Xpx;width:100%"` が無い | PC で viewBox 幅を超えて拡大表示されるリスク |
| **P4-tiny-font** | LOW | `font-size < 11px` | モバイル 375px での可読性下限割れ |
| **P5-wide-viewbox** | MEDIUM | `viewBox` 幅が 400px 超過 | create-svg の原則違反（モバイル縮小率低下） |
| **P6-color-drift** | MEDIUM | `svg-tokens.json` の colorsAllowList 外の hex 使用 | サイト特色・ブランド一貫性の崩壊 |
| **P7-missing-font-family** | MEDIUM | `font-family` が SVG 内のどこにも未指定 | ブラウザデフォルト serif に落ちて本文と不整合 |
| **P8-dark-bg** | **HIGH** | 濃色 fill（輝度 < 0.3）+ 内部に白/薄色テキスト（輝度 > 0.8 or "white"） | `prohibited.md` 違反（淡色 bg + 濃色文字を使う） |

## 制限事項

- **正規表現ベースの簡易パーサー**: `<tspan>`、複雑な transform（rotate/scale）、`xlink:href` 参照は未対応
- **日本語文字幅は 1.0em、ラテン/数字は 0.55em で近似**（実フォントメトリクスと完全一致しない）
- **縦積みラベルの false positive 対策**: bbox 重なりが 3px 未満なら許容（descender や line-spacing の視覚的近接を誤検知しない）
- **親 `<g>` の属性（font-size / text-anchor / transform）はスタック継承する**が、クラスベースの CSS 継承は 1 階層のみ

## 引数

```
/audit-svg [--path <glob>] [--file <single.svg>] [--severity <HIGH|MEDIUM|LOW|ALL>]
```

| 引数 | 既定 | 説明 |
|---|---|---|
| `--path` | `.local/r2/posts/**/img/*.svg` | 走査対象の glob |
| `--file` | なし | 単一ファイルを指定（`--path` を上書き）|
| `--severity` | `ALL` | 指定重大度のみ報告（例: `HIGH` で重大のみ） |

## 実行

```bash
# 全 SVG を走査
node .claude/skills/content/audit-svg/scripts/audit.mjs

# 単一ファイル
node .claude/skills/content/audit-svg/scripts/audit.mjs --file=.local/r2/posts/civil-construction-1/textbook-histogram/img/figure-4-9.svg

# HIGH のみ
node .claude/skills/content/audit-svg/scripts/audit.mjs --severity=HIGH
```

## 出力

`.claude/state/svg-audit.json`

```json
{
  "meta": { "generated_at": "...", "path": "...", "file": null },
  "summary": {
    "scanned_files": 97,
    "files_with_issues": 76,
    "total_findings": 890,
    "by_severity": { "HIGH": 19, "MEDIUM": 210, "LOW": 661 },
    "by_pattern": {
      "P3-missing-role": 69,
      "P3-missing-aria": 70,
      "P5-wide-viewbox": 63,
      "P4-tiny-font": 661,
      "P2-text-overlap": 8,
      "P1-text-clip": 19
    }
  },
  "findings": [
    {
      "file": "...figure-7-6.svg",
      "pattern": "P1-text-clip",
      "severity": "HIGH",
      "text": "航路内の禁止",
      "detail": "「航路内の禁止」が viewBox 外（bbox x=-11〜55, viewBox 幅 400, anchor=end）"
    }
  ]
}
```

## 連携パターン

### /create-svg の出口検証

SVG 作成直後に本スキルを走らせ、HIGH が 0 件であることを確認する。

```bash
node .claude/skills/content/audit-svg/scripts/audit.mjs --file=<作成した .svg> --severity=HIGH
# findings == 0 なら合格
```

### /improve-article の視覚チェック

記事内の全 SVG を `--path` で絞って監査し、HIGH/MEDIUM 件数を改善候補に組み込む。

### バルク品質監査

リポジトリ全体の SVG 健全性を把握（Phase 2 以降のクリーンアップ計画）。

## 制約・前提

- Node.js 20 以上（`import.meta`, `globSync` 対応）
- macOS only （他スキルに準拠）
- **検出専任、修正しない**（Evaluator/Generator 分離）
- bbox 計算は近似値のため、視覚検証（Playwright スクリーンショット）と併用することを推奨

## 参照

- [`.claude/skills/content/create-svg/SKILL.md`](../create-svg/SKILL.md) — SVG 作成規約（本スキルの検証対象となるルール）
- [`.claude/skills/content/improve-article/SKILL.md`](../improve-article/SKILL.md) — 記事品質改善のオーケストレータ
- [`.claude/skills/content/audit-exam-explanations/SKILL.md`](../audit-exam-explanations/SKILL.md) — 類似の検出スキル（過去問解説向け）
