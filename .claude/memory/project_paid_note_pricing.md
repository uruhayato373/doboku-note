---
name: project-paid-note-pricing
description: "note 有料記事と magazine の価格情報。真実源は `docs/note/_magazines/*.yaml`。販売文言で価格を書く時は yaml と整合させる"
metadata: 
  node_type: memory
  type: project
  originSessionId: c25be8a3-fa91-489c-8640-a7e3a4f4fb3a
---

note 有料記事と magazine の価格情報は `docs/note/_magazines/*.yaml` に保管する。販売文言で価格を書く時は必ずこの真実源と整合させる（推測や記憶で書かない）。

## 総監テキスト精読ガイド（2026-05-12 時点）

`docs/note/_magazines/総監テキスト精読ガイド.yaml` より：

- **individual article price**: ¥500（5管理-経済性／情報／社会環境／人的資源／安全 すべて共通）
- **set price (magazine)**: ¥1,980
- **single total**: ¥2,500（¥500 × 5本）
- **discount**: 21%OFF（または「単品4本分の値段で5本」）

## 推奨される販売文言表現

「19%OFF」「¥3,980」「¥4,900」は **誤り**（2026-05-12 以前の作業で誤って書いた数値）。販売文言を書くときは以下の表現を使う：

- **冒頭バナー型**: 「5本セット ¥1,980（単品4本分の値段で5本・21%OFF）」
- **末尾CTA型**: 「単品4本分の値段（¥1,980）でまとめ購入できます」
- **詳細表記型**: 「単品合計 ¥2,500（¥500 × 5本）→ セット ¥1,980（21%OFF）」
- **直感的訴求**: 「単品4本分の値段で5本買えます」（数字より「実質1本おまけ」のお得感が刺さる）

## How to apply

- 新規 note 記事・magazine 訴求文言を書くとき → 必ず yaml を Read してから書く
- magazine yaml を更新するとき → 派生フィールド（singleTotal・discountPercent）も同時更新
- 既存記事の販売文言を編集するとき → yaml の値と乖離していないか Grep で確認
- 将来 articles ごとに価格が変わる場合 → 各記事 frontmatter に `notePrice: NNN` を追加して override

## 経緯

- 2026-05-12: ユーザー指摘「記事1本500円・マガジン1,980円」を受け、yaml の `setPrice: 3980` → `1980` に修正。私が以前書いた「¥4,900・¥3,980・19%OFF」の販売文言9記事を「¥2,500・¥1,980・21%OFF」に一括修正。

[[project_paid_note_scope]] [[feedback_note_link_card]]
