---
name: live-verify-whole-body
description: note の「ライブ反映済み」判定は冒頭の新文言だけでなく末尾・画像数・見出しまで照合してから台帳に記録する
metadata:
  type: feedback
---

note の要再公開を「ライブに反映済み」として再公開台帳へ記録するときは、原稿の新しい文言がライブにあるかだけでなく、**末尾ブロック・画像数・見出し構成**まで照合する。

**Why:** 2026-09-23、ペルソナ選択ガイドを冒頭の新文言だけ確認して記録したら、末尾の著者紹介と注意書きが欠けたままだった（後で週次検査の拡張で発覚）。台帳が in-sync になると要再公開から消え、欠けたまま誰も気づかない。

**How to apply:** 記録前に `node scripts/check-note-live-headings.mjs <パス>`（見出し・画像・太字記号）と、原稿の各段落がライブ本文に含まれるかの全段落照合を行う。取得できない（is_limited）記事は記録しない。関連: [[note-update-body-gotchas]] [[note-membership-publish]]
