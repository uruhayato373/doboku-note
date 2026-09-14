---
name: 校正時の過去問核心 Callout 確認
description: 校正依頼時、PE キーワードページでは過去問逆引きデータを lookup し未カバーの引っかけ論点があれば Callout 追加を提案する標準ルーチン
type: feedback
originSessionId: a1241738-6bc3-4638-9661-87a194f11f36
---
「校正して」と依頼されたら、PE キーワードページについて以下を **毎回標準チェック** する:

1. `src/config/past-exam-backlinks.json` で対象キーワードを lookup（過去問からの逆参照があるか）
2. 過去問あり → 該当過去問 MDX の `<details>` 解説から誤答パターン・引っかけ論点を把握
3. 既存 `<Callout type="warn">` がその引っかけをカバーしているか確認
4. 未カバーで、読み飛ばすと失点する論点があれば **Callout 追加候補を提案**（content-principles.md §7 準拠：単なる補足は追加しない、1 記事 3 個まで）

**Why:** PastExamBacklinks（過去問逆引きカード）は build-time 自動注入で 548 ページ全てに付くが、引っかけ警告 Callout は手動で 51 ページのみ。この差を校正のたびに埋めて editorial 品質を底上げする方針。

**How to apply:**
- 「校正して」コマンド時の標準フロー。明示指示がなくても毎回実施
- 対象は主に PE keyword ページ（civil-construction-1 等は構造が異なれば別途判断）
- 過去問が無い or 引っかけ要素がないキーワードでは「追加なし」と明示してスキップ
- 真実源は `.claude/content-principles.md` §16
