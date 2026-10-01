---
name: note-ogp-card-no-delete
description: note編集画面のOGPカード(figure atom)は自動削除不可＝note-append-ctaは追加専用。カードのswap/差し替えは手動UIかrepublishのみ
metadata: 
  node_type: memory
  type: reference
  originSessionId: dd035073-c925-42f5-8b9a-a214fe16c7c9
---

note 編集画面（ProseMirror）の**OGP カード（figure・embedded-service の atom ノード）は自動削除できない**。2026-07-05、2級無料記事の「1級パック→2級バンク」カード差し替えで4方法すべて失敗:
1. DOM `Range.setStartBefore/EndAfter` + `keyboard.press('Delete')` → atom 残存
2. `document.execCommand('delete')` → atom 残存
3. figure を `page.click()` で node-select → `Backspace` → 残存
4. caret 設置→Shift+click で native 範囲選択→Backspace → **ProseMirror が evaluate 間に data 属性を strip** するため対象ノードを再取得できず失敗

**帰結**: `note-append-cta` は**追加専用**として設計が正しい（[[project_note_write_automation]]）。既存カードの**差し替え（swap）は不可**。対応策:
- **追加で上書き**: 新カードを append で足す（旧カードは残るが republish で自動消滅＝ソースに旧が無ければ）。live は2カード並ぶ
- **手動 UI**: note 編集画面で旧カードを人手削除（1本1分）
- **republish**: `publish-note --update` でソースから再構築（ソースが正なら旧カード消滅）

**関連の罠**: CTA の「イントロ文」を live で type すると**H2 見出しとして描画される**ことがある（目次を汚す）。冒頭カードのイントロは無料域だが H2 化に注意。**記事タイプ 有料→無料 の切替**は 記事タイプ radio が「無料」表示でも API が `is_limited:true` を返す状態がある（published が stale・primary ボタンが「試し読みエリアを設定」＝有料概念）＝自動 toggle は状態が曖昧で危険、手動 UI 推奨。真実源運用は [[tankan-chokuzen-funnel-2026-06]] / note-funnel-architecture 原則8/9。
