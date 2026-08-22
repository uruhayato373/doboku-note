# 多資格 SNS 展開設計（IG / X の試験軸対応）

作成: 2026-06-02 ／ 状態: **実装完了（IG carousel/reels 静止素材・X 多資格分業）。残は mp4 再生成と X 実投稿運用**（§8 参照）

## 1. 背景・課題

現状の SNS（IG カルーセル過去問パック・X ドラフト）は **総監を暗黙の前提とした単一試験構造**で、ディレクトリにもデータにも「試験軸」が無い。1級土木・コンクリート主任技士等へ展開すると、どの試験の投稿か判別できず混在する。

note カバー v2 は既に「試験＝色」で解決済みだが、SNS は未対応（IG の色は **5管理色**＝総監専用概念）。多資格化の前に、(A) ディレクトリの試験軸、(B) カバーの試験識別レイヤー、(C) 過去問データの試験軸統合、の3点を設計する。

## 2. 試験キー対応表（真実源）

ディレクトリ・データ・パレットで使う試験キーは **日本語**（content/note の試験別dir と統一）。slug・色は下表で対応づける。

| 日本語キー（dir） | slug（posts/palette） | 色相 | base hex | 状態 |
|---|---|---|---|---|
| 技術士総監 | pe-comprehensive | navy | `#16365C` | 既存 |
| 1級土木 | civil-1 | azure | `#1E73C8` | 既存 |
| 2級土木 | civil-2 | green | `#2A7050` | 既存 |
| コンクリート主任技士 | concrete-chief | teal | `#0F6E6E` | **新規追加** |
| コンクリート診断士 | concrete-diagnosis | （未割当・teal/green 被り回避で plum 系等） | TBD | **要色割当** |
| 共通 | common | bronze | `#9A6B1E` | 既存 |

- 色相は `.claude/knowledge/design-system/note-cover-tokens.json` の `exams` を**唯一のパレット真実源**とし、note カバー・IG・X・Shorts が同じ token を解決する（1回追加で全チャネル伝播）。
- **コンクリート2資格は色が近接しやすい**。主任技士=teal なら診断士は青緑から離す（plum/indigo 等）。

## 3. ディレクトリ構成（試験軸を追加）

### IG（exam-packs）

```
content/sns/instagram/{exam}/exam-packs/{年度}/pack-NN/       ← 年度括り（総監のみ）
  例) cem/exam-packs/r07/pack-01/
content/sns/instagram/civil-{1,2}/theme-packs/{論点}/pack-NN/  ← 論点括り（1級/2級土木・2026-07〜）
  例) civil-1/theme-packs/hoki-labor/pack-01/
```
> 1級/2級土木は年度括り（旧 `civil-{1,2}/exam-packs`）を廃し、論点（頻出問題）括りへ移行（`ig-carousel-skill.md` シリーズ C）。

- 既存の `exam-packs/{年度}/pack-NN/`（総監・試験軸なし）は `cem/exam-packs/{年度}/` へ**移行**（§7）。

### X（draft）

連番は**全試験でグローバルにユニーク**を維持（publish-x.ts の draft 解決を変えずに済む）。**当面は試験をディレクトリ名に含める**：

```
content/sns/x/draft/{連番}-{試験}-{名前}/
  例) 042-1級土木-過去問PR/
```

- 長期理想は `draft/{試験}/{連番}-{名前}/` だが、`publish-x.ts` の draft パス解決の改修が要るため後続課題とする。

### その他 IG 系統（highlights / stories / _quiz-sample）

試験横断のものはそのまま。試験固有のクイズ/ポイントを作る場合は `_quiz-sample/{試験}/...` のように試験軸を足す。

## 4. カバー「試験識別レイヤー」仕様（slide 1 / サムネ）

キャンバス **1080×1350**（IG カルーセル 4:5）。

- **セーフゾーン = 中央 1080×1080**。プロフィールグリッドは正方クロップで**上下135pxがカット**される。文字情報は必ず y∈[135, 1215] に置く。色帯はカットされてOK。
- **レイヤー1（試験識別・上部色帯 約440px）**:
  - 試験色帯（パレット base 色）。ブランド帯としてグリッドで多少切れて良い。
  - **正式名称（略称なし）**を大きく。長い「技術士／総合技術監理部門」は2行、他は1行（auto-fit）。
  - タグ（過去問/予想問題/解説/クイズ 等）ピル＋ページ番号。**いずれも y≥135 のセーフゾーン内**。
- **レイヤー2（コンテンツ）**:
  - **年度を主役（大）** = 過去問の年度識別子（例「令和7年度」150px）。
  - 形式＋種別を従（小）（例「択一式 過去問」「第一次検定 過去問」「四肢択一 過去問」）。
- **レイヤー3（CTA/ブランド）**: CTA ピル＋`doboku-note.com`。ブランドは y≤1215 のセーフゾーン内に置く。
- **5管理色は試験色帯を侵さない**。総監の5管理は内部のアクセント chip に降格（試験色＝第1軸、5管理＝第2軸）。

> 識別の主役は**試験名テキスト**。navy/azure 等の青系は小サイズで判別しづらいため、色は補強・名前が主。

## 5. パレット SoT 拡張

`.claude/knowledge/design-system/note-cover-tokens.json` の `exams` に下記を追加し、SNS 生成器からも解決する。

- `concrete-chief`（dir: コンクリート主任技士, hue: teal, base `#0F6E6E`, deep `#0A4F4F`）
- `concrete-diagnosis`（dir: コンクリート診断士, hue: 要割当, base TBD）

SNS 側（`.claude/scripts/sns/lib/`）に exam→色 を解決する共有ローダを置き、note と同一 token を参照する。

## 6. 過去問データのカバレッジと統合（IG過去問パックの前提）

IG 過去問パックは「**試験軸つきの問題データ SoT**」から生成する。現状は総監専用 `src/config/exam-questions.json`（試験軸なし）。土木・コンクリは MDX に散在し未統合。

| 試験 | 過去問データ所在 | 年度カバレッジ | 統合状態 |
|---|---|---|---|
| 技術士総監 | `src/config/exam-questions.json` | H21〜R07（全16年度・640問） | ✅ 統合済 |
| 1級土木 | `content/site/civil-construction-1/primary-{年度}-{a,b}/` | h26〜（**要精査**） | ❌ 未統合 |
| コンクリート主任技士 | `content/site/concrete-chief-engineer/primary-*/` | 平成29〜令和5（部分） | ❌ 未統合 |

統合方針（後続タスク）:
- `exam-questions.json` を **試験軸つき**（`{試験}: {年度: [問...]}`）へ拡張、または試験別ファイルに分割。
- 各試験の過去問 MDX をパースして投入（パーサは `scripts/parse-exam-questions.mjs` を試験対応に拡張）。
- **試験ごとに保有年度が違う**ため、IG パック生成は「存在する年度のみ」を対象にする（欠落年度の空パック生成を防ぐ）。
- 著作権: 土木・コンクリの過去問は既にサイト（primary 記事）で原典どおり公開済み。IG（同一内容）は既存編集方針の範囲。JCI 等の再配布条件は公開済み記事の判断を踏襲。

## 7. 移行計画（既存総監パック）

- 既存 `content/sns/instagram/cem/exam-packs/{r03..r07}/` → `cem/exam-packs/{年度}/` へ移動。
- 生成器（`generate-exam-pack-dirs.mjs` / `bulk-generate-exam-packs.mjs`）の出力パスを `{試験}/{年度}` 対応に改修。
- 移行はコンテンツが安定したタイミングで一括実施（並行セッション競合を避ける）。

## 8. 実装タスク（順番・本設計合意後）

> 状態: **大部分を実装完了（2026-06-02 セッション）**。IG carousel/reels 静止素材は総監/1級/2級で揃った。残は mp4 再生成（ffmpeg/VOICEVOX 環境）と X 実投稿運用。

1. ✅ 本設計の合意（このドキュメント）
2. ✅ `exam-palette.mjs`（`note-cover-tokens.json` の exams を解決する SNS 共有ローダ）。concrete 系は tokens に定義済み
3. ✅ 既存総監 IG パックを `cem/exam-packs/{年度}/` へ移行（git mv, 1909b6f23）＋ `ig-post-create`/`ig-reel-create`/`yt-shorts-create` の `--exam-dir`（既定=技術士総監）・examId `[zk]` 対応
4. ✅ 1級土木（`parse-civil-1`＋`civil-1-exam-questions.json`）・2級土木（`parse-civil-2`＋`civil-2-exam-questions.json`、前期 r05z/後期 r05k 分離）を試験軸データ SoT へ統合
5. ✅ `exam-cover-ig.mjs` を試験識別レイヤー＋**3 フォーマット（carousel/reels/stories）**対応に実装。`slide-data._meta.exam` 注入。正式名称 1 行・レイアウト洗練（C3）。CTA は `buildQuizCta` が試験別 stats/色を出し分け
6. ✅ パック生成: 1級 carousel 228 + reels 228、2級 carousel 123 + reels 123、総監 carousel/reels/stories カバー＋CTA 刷新。caption は `generate-caption.cjs` が試験別タグで生成
7. ✅ X 多資格分業: `x-post-policy.md`・`x-post-writer`/`x-post-qa` 新設、`gen-x-card.mjs` 試験別色、X draft 命名 `{連番}-{試験}-{名前}`
8. ⏳ 残: reels `video.mp4` 再生成（ffmpeg/VOICEVOX 環境）、r03-r06 reels 09-cta は世代統一済、X 実投稿運用（`x-post-writer` 量産→`publish-x`）

## 9. 未決事項

- コンクリート診断士の色割当（teal/green 非近接の確定）。
- X draft を将来 `draft/{試験}/` サブdir 化するか（publish-x.ts 改修可否）。
- 1級土木の過去問の保有年度の精査（h26〜どこまで揃っているか）。
