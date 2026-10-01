---
name: kdp-price-change-gotchas
description: "KDP価格改定の罠=70%帯は¥1,650まで拡大/セレクト外は日本35%/AI申告必須化で既刊の出版が弾かれる/旧成功判定の偽成功"
metadata:
  node_type: memory
  type: reference
  originSessionId: bafde8c2-cfb3-4f45-bce6-57e8b0de10a2
  modified: 2026-09-23T03:16:24.462Z
---

2026-09-23 の Kindle 価格改定（3段階）で実測した KDP の罠。

- **70% 帯は ¥250〜¥1,650**（KDP 価格ページの告知。旧 ¥1,250）。¥1,250 の本は 70% のまま ¥1,650 まで上げられる（未判断）。
- **日本の 70% は KDP セレクト登録が条件**。外れるとプランのラジオは 70% のまま Amazon.co.jp 行だけ 35%。d-00/d-03 は note 併売のため早期解除を申請しており、9/23 時点で日本 35%。`catalog.royalty` は日本の実効レートとして扱う。
- **AI 生成コンテンツ申告が必須化**（`require_generative_ai_questionnaire_affirmation=true`）。2026-07 提出の既刊は未回答のまま残り、価格改定の出版が「この項目は必須です」で弾かれる。`--set-price --commit` が自動で埋める。d-00 は埋めた後もエラーが残り、該当欄は未特定。
- 旧 `--set-price` は本文の「保存」で成功判定し、「下書きとして保存」ボタンに一致して**失敗を成功と誤報**した（PR #581 で「価格ページを離れた＋エラー表示なし」に修正）。直前の報告は本棚の表示価格で裏取りする。
- 本棚は先頭10冊しか DOM に無い。内部ID（title-setup）は ASIN で本棚検索した行のリンクから取る（`--sync-status` が catalog.draftAsin を補完）。
- ブラウザ操作は空きメモリ 2GB 未満でガードが止める。本棚1枚程度なら `DOBOKU_PW_MIN_FREE_MB=1200`。

関連: [[kindle-dup-prevention]] [[project_kindle_publishing_launch]]
