---
name: project_pack_lineup_2026_09
description: "売れ筋3軸（試験の区切り解像度／全部パック／直前パック）で 2026-09-16〜17 に 19 SKU を note 公開（PR #515）＋RCCM 無料 3 本・口頭 3 本 draft・Kindle h-01 ready。判定は EXP-011（12/1）。2026-09-18 に #513/#514/#515 のスタックを develop へ一括着地（1ee15d722）→ main deploy（a81761771）済み。残＝h-01 出版承認・W8〜W11 の特典マガジン収録（公開日 9/19・22・24・28 の後）・hearing-sheet・#511/#516〜#519 は未マージ"
metadata:
  type: project
---

**判断（2026-09-16・sales-log 293 件の裏取り）**: 全部パック＝件数 8%／売上 28%、試験の区切りに沿った単線マガジン＝51%、読者職種で切った総監ペルソナ 14 SKU は 8 本が売上ゼロ。→ **解像度は「試験の区切り」だけ、ペルソナ軸には投資しない**。競合 chansato_st の直前パック（1級二次 模試3回 ¥2,480→セール ¥1,980）を見て、単品で持っていた模試・暗記・出題分析を束ねる直前パックを全資格に置いた。

**公開済み（全て note ライブ・API 実体確認）**: 1級 直前 m7a9b3ad964f6 ¥2,980／2級 まるごと m2d9a069b6f87 ¥8,800（78 記事）・直前 md3518107aa97 ¥2,480・出題分析 n4e4f4930cf2e ¥580／建設部門 7 科目パック ¥4,980（全 11 科目完了）／RCCM まるごと me2b526bf77f4 ¥5,980・暗記 n6a82c25cc9de／主任技士 暗記 n25197277c5a9・択一直前 mfdf781d7222b ¥2,980／技術士一次 暗記 n7b4f17a09d3f・直前 mfa3fcffdd85d ¥1,980／コン技士 暗記 n0bbd4a5a8b57 ¥780・直前 m49ac37c76bef ¥1,480／1級まるごと・総監完全パック・主任技士まるごとへ追加収録（据置）／精読ガイド 3 本無料。

**暗記ノートの型**: `Q. …／A. …` 1 行 1 対・分野 H2・2 番目の H2 が paidBoundary（最初の分野が無料）・素材は自前の予想問題/論点集/テキスト章のみ（RCCM・主任技士は過去問復元禁止）・writer(sonnet)→note-fact-checker→是正→publish。問数の 4 箇所同期は [[reference_note_publish_price_field]]。

**2026-09-17 追記**: RCCM 無料 lead-in 3 本公開（n7570e79a4d27・n67ac63e3df10・n6d9b2fbb71a3）。口頭ライン＝建設部門 口頭対策 ¥1,980（draft・SKU `pe-construction-oral-guide` published:false・guide-fact-checker 済）＋無料「筆記合格発表後」総監/建設（draft）を D 当日公開待ち。Kindle h-01（RCCM 問題III）は EPUB/表紙/kdp-memo ready・**KDP ログイン切れで下書き未提出**（`node scripts/kdp-publish.mjs --id h-01`・価格 ¥980 は C 系前例 ¥1,250 も検討）。PR スタック #511→#513→#514→#515 は CI 緑（develop の DN-0238〜0243 と衝突した RCCM 側カードを DN-0247〜0251 へ採番し直し）。

**残**: W8〜W11 の特典マガジン収録（DN-0246・各公開日後）／口頭試験ライン（総監 完全版は hearing-sheet 待ち・建設部門 口頭は draft 済・筆記合格発表 D 当日に 4 本公開）／KDP h-01 下書き提出（人がログイン）／PR #511→#513→#514→#515 マージ→`/deploy`→`check-production-ssr`／EXP-009 11/1・EXP-011 12/1 判定／X 期限超過警告（9/15〜16 civil-1 5 本）は Codex 監視側で確認。
