# 建設部門 note マガジン（道路以外）公開準備 — 引き継ぎ

**日付**: 2026-06-15
**対象**: `docs/note/技術士建設部門/magazines/` の道路(BK-01)以外 全11マガジン
**ゴール**: 「道路以外を完璧な品質で公開できるように」

---

## 完了したこと（コミット済み）

### 内容品質（全11マガジン ≈158記事）

- **BK-02 河川・BK-03 都市計画**: QA 18/18 pass（既存フル整備の検証のみ）
- **BK-I 必須科目I**: R03/R04/R06/R07 が I-1/I-2 片方欠落のゲート不合格 → 欠落側のフル模範解答を補完し再QA pass（R05 と同じ2セクション構成へ統一）
- **BK-04〜11 合格科目外8科目 R03-R07（120記事）**: 各区分1設問のみの薄い状態から **全選択肢網羅**（II-1=全設問・II-2=II-2-1/II-2-2・III=III-1/III-2）へ拡充。旧式の経験記述免責を除去、cover: ブロック付与、令和8改訂コンピテンシー反映、発注者視点注入
- **生成→検証パイプライン**: `pe-secondary-exam-writer`（拡充）→ `pe-secondary-exam-factcheck`（外部一次情報照合・WebSearch）→ writer（修正）→ 再factcheck → `pe-secondary-exam-qa`（6軸＋ゲート）。全120記事 QA pass
- **外部ファクトチェックで是正した主な事実誤り**（合格科目外のハルシネーション）:
  - テールボイドの定義（カッター外径差→テール通過後にセグメント外面と地山に生じる空隙）
  - 洋上風力のブルーカーボン: J-クレジット→**Jブルークレジット制度**(JBE運営)
  - ダム耐震診断の根拠: 電気設備技術基準→**発電用水力設備技術基準(水技)**
  - 環境大臣意見の根拠条文: 法第24条→**第23条**(評価書段階)
  - 締固め内部振動機の挿入間隔: 60cm→**50cm**(土木学会示方書)
  - 当て板補修: 溶接→**高力ボルト摩擦接合**(実務標準) ほか

### 梱包・配線

- 記事カバー 120枚（`generate-note-covers.mjs`、satori+sharp）
- マガジンカバー 8種（`_cover.png` ＋ `public/images/magazines/*.{png,webp}`）。`generate-magazine-covers.mjs` に BK-04〜11 の8設定を追加
- `note掲載文.txt`: BK-09 電力土木・BK-10 鉄道 を新規作成（他6科目は既存）
- `src/lib/note-magazines.ts`: 8マガジン登録（**published:false / noteUrl 空**）
- `src/lib/magazine-placement.ts`: 8科目の doc slug→マガジン対応を追加
- 各記事ハッシュタグ 120ファイル（88〜95個・1行1個・全#・≤99・LF）

---

## 残タスク（手動 / 別環境）

1. **印刷用PDF（Windows必須）**: Mac の Chrome は `--headless=new`/`--headless=old` どちらでも `--print-to-pdf` 後にプロセスが終了せずハング（PDF自体は生成されるが execFileSync が120秒でタイムアウト）。**Windows PC で** `node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/BK-XX.json --in-place` を実行（CHROME_PATH 不要・既定の Windows パスで動く）。
   - **BK-09 電力土木・BK-10 鉄道 の pdf-spec は作成済み（2026-06-15・R03-R07×3＝各15記事）**。ただし R08-yosou 未生成のため現状 R03-R07 のみ収録。R08-yosou を cloud(#5) で生成後、他BKに倣い R08-yosou エントリを追記すること
   - 既存 BK-04-08,11 の pdf-spec は R08-yosou も含むため、そのまま実行で R03-R07＋yosou のPDFが出る
2. **note 本投稿（ユーザー手動・Mac）**: `/publish-note` または手動。投稿後、各記事 frontmatter の `noteUrl`/`noteId`/`notePublishedAt` と `note-magazines.ts` の `noteUrl`/`published:true` を反映
3. **BK-I 必須科目I の差し替え**: R03/R04/R06/R07 は**既に note 公開済み**。今回 I-1/I-2 両収録に補強したので、note 本体の更新＋印刷PDF差し替えが必要
4. **価格レビュー（要判断）**: 価格に3者ドリフトあり — SSOT `noteコンテンツ計画.md`=¥3,480 / 各 note掲載文の実値=¥2,980(18記事)・¥1,980(15記事) / note-magazines.ts も実値に合わせた。公開前に最終価格を確定すること（published:false なので未露出）
5. **R08-yosou（BK-04-08,11 の予想問題3記事ずつ）**: 前セッションで作成済み（フル整備）。今回の R03-R07 検証パスの対象外。必要なら verify モードで再検証可（`pe-secondary-exam-qa`/`factcheck`）

---

## 既知のツール不具合（別途修正候補）

- `npm run note-meta-lint`: Node v20 で `node:fs/promises` の `glob` 未提供エラーで起動失敗（Node 22+ 必要）。今回は手動で字数検証
- `scripts/magazine-to-pdf.mjs`: Mac での Chrome 終了ハング（上記1）。移植性修正（CHROME_PATH / 出力先OS分岐）は投入済みだが、ハング自体は未解決

---

## 運用メモ（再発防止）

- **ワークフロー並行数は最大2**。3並行（同時40+ sonnet エージェント＋WebSearch）でエージェントのストール多発（各6回×180秒リトライも進展せず記事が未検証で落ちる）。2並行ではストールゼロ
- **fact残存（自動修正で解けない likely_wrong）は手動是正が確実**。factcheck詳細（claim/location/correction/出典URL）を取得→該当行のみ Edit
- **`check-note-charlimits`（pre-commit）は QA の python 計測より厳密**。III/必須I の1,800字超過を commit 時に弾くので、QA pass でも commit 前提で圧縮が要る場合あり
