# Brain 出品プレイブック（両商品・turnkey）

> [!note]
> Brain（brain-market.com）で Claude Code キット2商品を手動公開するための手順集約。
> Brain は審査プロセスがあり即公開されない。ログイン・CAPTCHA・特商法登録は運営者が行う。
> アセットは全て準備済＝この手順で座って公開できる状態。最終更新 2026-07-22。

## 事前準備（両商品共通・1回だけ）

1. **Brain 販売者登録**：Brain アカウント → 販売者情報（特定商取引法に基づく表記）を登録。
2. **最新規約の確認**：[販売者用利用規約](https://brain-market.com/brain_terms_of_seller.pdf)・手数料（2026-07 時点＝紹介なし12%／紹介あり24%）を公開直前に再確認。
3. **サムネ PNG（生成済）**：SVG から sharp で PNG 化済み。Brain へはこの PNG をアップロード。
   - 商品①：`C:\tmp\claude-code-civil-essay-kit\thumbnail.png`（1200×630・日本語目視OK）
   - 商品②：`C:\tmp\pe-policy-bank-kit\thumbnail.png`（1200×630）

## 商品①：施工経験記述 設計キット（1級・2級土木）

| 項目 | 値 |
|---|---|
| タイトル | Claude Codeで作る 1級・2級土木「施工経験記述」設計キット｜設問整理・答案案・字数検査まで |
| 販売記事本文 | `docs/products/brain-claude-code-essay-skill/02-brain-sales-page-draft.md`（冒頭コピー〜CTA をそのまま貼付） |
| β価格 | 7,980円 |
| 添付ファイル | `C:\tmp\claude-code-civil-essay-kit-beta.zip`（Brain版・165KB） |
| サムネ元 | `C:\tmp\claude-code-civil-essay-kit\thumbnail.svg` → PNG 化 |
| 公開前チェック | `03-publication-checklist.md`（全項目 ✓ 済＝前方テスト5/5・免責・サンプル架空・secrets無） |

**公開手順**：Brain → 商品作成 → 02 の販売記事を貼付 → 価格7,980 → ZIP添付 → サムネPNG → 審査提出。

## 商品②：総監 出題テーマ分析・国家施策バンク キット

| 項目 | 値 |
|---|---|
| タイトル | Claude Codeで作る 技術士総監「出題テーマ分析・国家施策バンク」設計キット｜設問3の施策を根拠つきで備蓄 |
| 販売記事本文 | `docs/products/brain-r8-policy-prediction-skill/06-brain-sales-page-draft.md` |
| β価格 | 9,800円 |
| 添付ファイル | `C:\tmp\pe-policy-bank-kit-beta.zip`（40KB） |
| サムネ元 | `C:\tmp\pe-policy-bank-kit\thumbnail.svg` → PNG 化 |
| 公開前チェック | `00-product-concept.md §12`＋`04-backtest-results.md`（R8前向き実証済・R6/R7は方式C残） |

**公開手順**：商品① と同様。ただし総監②は「予想的中」表現を使わないこと（本命=気候変動適応は外れ・K=11開示）を販売記事で徹底済み。

## 公開禁止条件（両商品・1つでも残れば公開しない）

- 「採点者」「添削者」「試験委員」「必ず合格」「予想的中」等の誤認表現
- 本人が経験していない工事の自動生成（①）／出典のない数値・後知恵資料（②）
- 内部有料資料・秘密情報・APIキー・絶対パスの混入（漏れスキャン済＝clean）
- Brain の商品説明と ZIP の中身の不一致

## 公開後

- バージョン番号・更新日を商品内に記録／購入者導入率・返金理由を確認
- 売上は `/record-sales` で記録（`.claude/state/sales/sales-log.json`）
- Claude Code 仕様変更を月1確認・試験要領改定を年度更新時に確認

## 参照

- 商品①仕様：`brain-claude-code-essay-skill/00〜04`
- 商品②仕様：`brain-r8-policy-prediction-skill/00〜07`
- ココナラ版（公開済）：`.claude/knowledge/reference/coconala-operations.md`（K1 キット・K2 総監PDF）
