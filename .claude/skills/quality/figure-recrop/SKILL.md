---
name: figure-recrop
description: >
  既存の記事図クロップ（.local/r2/posts/**/img/*.webp）を「タイト再クロップ」して、
  図に写り込んだ答え/本文/問題文テキストを除き公開レベルへ上げるオーケストレータスキル。
  元PDFからの再抽出ではなく、既に埋め込まれている画像を切り直す（civil-figure-rework とは別物
  ＝あちらは問題PDFから抽出だが過去問PDFは図なしテキスト版で不成立）。provenance の
  needs=recrop/recrop-urgent を対象に、視覚で切り位置を決め figure-recrop.mjs で機械適用する。
  Use when user asks to [図の写り込みを除く, 図を再クロップ, 答え漏らし図の是正, /figure-recrop].
user-invocable: true
---

# /figure-recrop

記事に埋め込み済みの図クロップから、**答え漏らし（「したがって，(N)は適当」「【正解】(N)」）・本文/問題文の写り込み**を、既存画像を切り直して除く。図画素は既に足りている（=画質OKで写り込みだけが問題）ケース専用。

> [!warning] このスキルが直せないもの
> - **画質不足（ボケ/低解像度）**は切り直しでは直らない → `figure-provenance` の needs=rescan（要再スキャン）。
> - **元クロップ時点で図が見切れ**ているものは復元不可 → 再スキャン or SVG。
> - **過去問データグラフの SVG 化は禁止**（幾何が答え＝誤答誘発）。真実源 [figure-provenance.md](../../../../docs/reference/figure-provenance.md)。

## 対象の選び方

1. `npm run audit-figures`（監査→provenance 再生成）。
2. 管理画面 `npm run admin` → 記事図版タブ → フィルタ「対応」＝**再クロップ / 要再クロップ(緊急)**、優先は「公開×掲載」。
3. **必ず現物を目視して確認**（重要）: audit の写り込み(prose)は**ラベル/注記の句点や OCR ノイズで誤検出**する。図が既にクリーン（数値ラベルだけ）なら**触らない**。実際に答え/本文テキスト帯があるものだけ対象。

## 手順（1 図ずつ）

```bash
# ① 現物を見る（webp→png 変換して Read。切り位置＝テキスト帯の場所を判断）
sips -s format png <.local/.../img/NAME.webp> --out /tmp/x.png   # Read で目視

# ② 切り位置を決めて適用（crop+webp再生成+MDX width/height更新+OCR報告を1発）
#    上帯を落とす=--top / 下帯=--bottom(上をFだけ残す) / 中央図=--band Y0 Y1 / 明示=--crop WxH+X+Y
node scripts/figure-recrop.mjs <.local/.../img/NAME.webp> --top 0.15
#   → まず --dry-run で dims/OCR を確認してから本適用してもよい

# ③ 検証: 出力 JSON の ocr.answer_markers が [] であること＋ Read で図が切れていない/テキスト消滅を目視。
#         答え語が残れば切り位置を深くして再実行（例 --top 0.15 → 0.30）。
```

各図の切り位置は**人（またはエージェント）が図を見て決める**。自動 OCR 帯検出は図の凡例を誤認して切りすぎるため使わない（実証済み）。

## 切り位置の型（今セッションの実績）

| 型 | 症状 | 指定 |
|---|---|---|
| 上帯トリム | 図の**上**に答え/問題文（r01-a/h26-a 型） | `--top F`（F=テキスト帯の高さ割合） |
| 下帯トリム | 図の**下**に答え/表/【正解】（h30-a-fig-07/09/13 型） | `--bottom F`（F=残す上部の割合） |
| 中央帯 | 上にヘッダ＋下に【正解】/次問題（h30-a-fig-05 型） | `--band Y0 Y1`（図の帯だけ残す） |

## 完了処理（ページ単位）

```bash
# webp は figure-recrop.mjs が自動再生成済み。MDX width/height も更新済み。
node .claude/scripts/audit-exam-figures.mjs        # broken_image_reference:0 を確認
grep -c "�" <article.mdx>                          # 文字化け 0
git add <article.mdx> <img/変更した png/webp を明示>   # git add -A 禁止・並行セッション注意
git commit -m "content(<slug>): 過去問図の写り込みを再クロップで除去（fig-NN…）"
npm run audit-figures                              # 監査/provenance を最新化（ギャラリー反映）
```

## 鉄則（ハマりどころ）

- **触る前に必ず目視**。クリーンな図（数値ラベルのみ）を写り込みと誤判定して切らない。
- **図の凡例（「Uc≥10：粒度分布がよい。」等）は図の一部**＝残す。答え/本文だけ落とす。
- **MDX の width/height は新寸法に一致必須**（figure-recrop.mjs が自動更新。アスペクト比崩れ防止）。
- **1 ページ 1 commit**・明示 pathspec（`git add -A` 禁止）。
- 見切れ/画質不足は本スキール対象外 → provenance の rescan へ。

## 連携

- 対象選定＝`figure-provenance.json`（needs）／品質＝`figure-text-audit.json`。真実源 [figure-provenance.md](../../../../docs/reference/figure-provenance.md)。
- 機械化ヘルパ＝`scripts/figure-recrop.mjs`（crop+webp+MDX+OCR）。
- 別物＝`civil-figure-rework`（問題PDFから抽出・過去問では図なしで不成立）／`scanned-figure-crop-auditor`（スキャン教材の bbox 監査）。
- 大量処理時は本スキルの手順を `civil-exam-figure-auditor` 等の Evaluator で採点させながら回してもよい（Generator/Evaluator 分離）。
