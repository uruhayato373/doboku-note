---
name: note-traffic-sources-2026-09
description: "note ダッシュボード「記事の流入元」実測(2026-09-15)。稼いだ6〜7月の流入は note内回遊+note記事への検索直で73〜80%、X は年間0.2%、サイト→note は rel=noreferrer で不可視だった(PR #511 で noopener のみへ)。取得手順つき"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3c41bba2-16e2-4af0-af42-3ad2bde82382
  modified: 2026-09-15T10:20:44.306Z
---

2026-09-15 に note ダッシュボード（`https://note.com/dashboard`・「記事の流入元」円グラフ/時系列）を Playwright read-only で実測（year 35,174PV・売上 ¥638,840 = sales-log と整合）。

**月次流入元（PV）**: 5月 note内913/検索244/no-ref164 → 6月 3,930/1,645/1,236 → 7月 5,301/4,866/3,603 → 8月 1,719/1,168/4,524 → 9月(〜15日) 686/768/4,088。X は年間 75PV（0.2%）。検索直のうち Bing+Yahoo が 45%（会社 PC・40〜50 代の技術士層）。

**結論**: 収益エンジンは「note 内の発見性（関連記事・マガジン・タグ・フォロワーTL）」と「note 記事自身の Google/Bing/Yahoo 順位」。サイト SEO・図・品質基盤・X は売上への寄与が計測上 1 桁%以下（GA4 の note CTA クリックは 4 週で ~200）。8〜9月の no referrer 急増（4,000超/月）は正体未確認（note アプリ／直打ち／自己閲覧＝直近1か月131本公開のプレビュー混在）。

**サイト→note が note 側で見えなかった原因**: 全 note CTA が `rel="noopener noreferrer"`。PR #511（feat/note-link-referrer・`src/lib/external-link-rel.ts` に判定集約）で note.com だけ `noopener` に変更。**合格条件＝deploy 翌月の流入元に `doboku-note.com` が現れること**（2026-10 に確認）。

**How to apply**: 時間配分は note 側（無料→有料の内部導線・タイトル/冒頭の検索適合・フォロワー獲得）へ。X は直前期の告知に縮小。取得はスクリプト化していない: note プロファイルで /dashboard → 期間ボタン → 「時系列」ボタン → データテーブルを innerText で取る（`DOBOKU_PW_MIN_FREE_MB=1000` が要ることがある）。関連 [[revenue-diagnosis-2026-06]] [[note-revenue-strategy-2026]]
