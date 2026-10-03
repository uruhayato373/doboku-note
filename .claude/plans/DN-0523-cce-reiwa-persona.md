---
taskId: DN-0523
type: implementation-plan
createdAt: 2026-10-03
deleteOnComplete: true
---

# 主任技士 小論文を立場別に選べる構成へ戻す

## 決定（2026-10-03 ユーザー）

- 記事の単位は 1立場×1テーマ（8立場×5テーマ＝40本）。(1)表題と(4)今後の対策は立場ごとに書く。(2)現状と課題は同じテーマで共通にしてよい。(3)はテーマ別記事の立場段落を土台にする。
- 公開済みのテーマ別5本（1本に8立場）は、40本の公開後に note から削除する。原稿はココナラ K3 の PDF 素材として `content/sources/` へ移す。
- 価格: 単品 ¥980／立場別5テーマ（有料5＋無料の出題傾向分析）×8誌 ¥2,480／立場別合格パック（立場別5テーマ＋択一直前3点）×8誌 ¥3,980／全40答案（既存 `cce-essay-reiwa-pack` を組み替え）¥5,980／まるごと ¥7,980／択一直前パック ¥2,980 は据え置き。

## 名前の対応

| 立場（SSOT `answerModel.personas`） | 記事の置き場 dir | noteMagazine ラベル | 立場別 id | 合格パック id |
|---|---|---|---|---|
| 生コン工場 | `コンクリート主任技士-令和形式-01-生コン工場` | `コンクリート主任技士-令和形式-生コン工場` | `cce-reiwa-namacon-pack` | `cce-goukaku-namacon-pack` |
| プレキャスト工場 | `…-02-プレキャスト工場` | `…-プレキャスト工場` | `cce-reiwa-precast-pack` | `cce-goukaku-precast-pack` |
| ゼネコン土木施工 | `…-03-ゼネコン土木施工` | `…-ゼネコン土木施工` | `cce-reiwa-civil-contractor-pack` | `cce-goukaku-civil-contractor-pack` |
| 維持管理・補修 | `…-04-維持管理補修` | `…-維持管理補修` | `cce-reiwa-maintenance-pack` | `cce-goukaku-maintenance-pack` |
| 発注者・監督員 | `…-05-発注者監督員` | `…-発注者監督員` | `cce-reiwa-owner-pack` | `cce-goukaku-owner-pack` |
| ゼネコン建築施工 | `…-06-ゼネコン建築施工` | `…-ゼネコン建築施工` | `cce-reiwa-building-contractor-pack` | `cce-goukaku-building-contractor-pack` |
| 設計コンサルタント | `…-07-設計コンサル` | `…-設計コンサル` | `cce-reiwa-design-consultant-pack` | `cce-goukaku-design-consultant-pack` |
| 試験・検査機関 | `…-08-試験検査機関` | `…-試験検査機関` | `cce-reiwa-testing-pack` | `cce-goukaku-testing-pack` |

記事 dir はテーマ別記事と同じ `01-環境負荷低減`〜`05-担い手不足と品質確保`。旧 `cce-persona-*-pack` は削除済みマガジンの記録なので id を再利用しない。

## 収録の期待値（`config/note-magazine-membership.json`）

- 立場別: ラベル1つ（5本）＋ extras 1（出題傾向分析）＝6
- 合格パック: `fromMagazines: { 立場別: "all" }` ＋ extras 3（予想50問・配合計算・暗記ノート）＝9
- 全40答案 `cce-essay-reiwa-pack`: labels から packs へ移す。ラベル＝出題傾向分析＋8立場＝41
- まるごと: `fromMagazines: { cce-essay-reiwa-pack: "all" }` ＋パック案内ラベル1＋ extras 3＝45

## 手順

### P1 コード（このブランチ）
1. `config/cce-essay-history.json` の `answerModel` に立場別記事の型（必須 H2・(1)(4) も立場固有）を足し、`scripts/lib/cce-essay.mjs` で `cceEssayPersona` を持つ記事を判定する。同じテーマの立場別記事どうしで (1)・(4) が一致したら止める。`tests/check-cce-essay.test.mjs` に追加。
2. `cce-essay-writer` / `cce-essay-qa` に立場別記事の型を書く。agents-registry・Codex 用の写しを更新。

### P2 原稿
1. `.tmp/` の一回きりのスクリプトでテーマ別5本から40本の下書きを作る（無料節・(2)・(3)・採点者ポイントを写す）。
2. writer をテーマ単位で5回（同時3体まで）。8立場の (1)(4)・書き分けポイント・導入を書く。
3. qa をテーマ単位で5回 → 指摘を直す → `check-cce-essay`・`note-lint` を PASS させてテーマごとに commit。

### P3 公開前の配線
`note-magazines.ts`（16誌を published:false で追加・2誌の価格と説明）、収録台帳、カバー設定、16誌の `note掲載文.txt`、まるごとのパック案内、L2 もくじ、`sales-recorder` の対応表。

### P4 note（外部書き込み）
40本公開（¥980）→ 立場別8誌を作成・収録 → 合格パック8誌を作成・収録 → 全40答案とまるごとへ40本を追加・テーマ別5本を外す・価格変更 → テーマ別5本を削除 → マガジンカバー → snapshot 更新。

### P5 仕上げ
noteUrl と published:true、サイト導線、README・`noteコンテンツ計画.md`（主任技士・新規）、ココナラ K3 の素材パスと価格根拠、`/doc-sync`、PR（base develop）。

## 完了ゲート

`node scripts/check-cce-essay.mjs`・`node scripts/check-magazine-membership.mjs --ci`・`npm run verify-note-magazines`・`npm run audit-note-funnel`・`npm run check-note-paid-cta` が exit 0。
