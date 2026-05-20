# 引き継ぎ: YouTube Shorts 台本品質改善キャンペーン

最終更新: 2026-05-20

## ゴール

技術士総監キーワードの YouTube Shorts（139本）の台本（`storyboard.json` の `script` / `data.body`）を、機械生成の体言止め断片から「読み上げて自然な解説文」へ品質改善する。Generator→Evaluator の2段で1本ずつ品質担保する。

## 作業環境（重要）

- **git worktree で隔離**: `C:/tmp/doboku-note-yt`（ブランチ `feature/yt-shorts-quality`）。別セッションが main checkout `C:/Users/m004195/doboku-note` で並行作業しているため、YT 作業は必ずこの worktree で行う。
- **node_modules はジャンクション**: worktree には `node_modules` が無いので main からジャンクション済み（`New-Item -ItemType Junction`）。消えていたら再作成する。
- agent には必ず「作業ディレクトリ `C:\tmp\doboku-note-yt`、main は触らない」と明記する。

## アーキテクチャ（Phase 0 完了済み）

- YT パイプラインに編集可能な SSOT `storyboard.json` を追加済み（commit 852c01112）。`yt-shorts-create.mjs` は storyboard.json があれば MDX 解析をスキップし、`--config-only` で storyboard.json のみ生成、`--reset` で MDX から再生成。
- 字幕の日本語折り返し修正済み（`build-subtitle.mjs` WrapStyle 2 + budoux）。
- 各 `storyboard.json` の slide は `{ type, data, script }`。`script` が TTS・字幕の真実源。
- 品質ルーブリック: `docs/reference/yt-shorts-script-policy.md`（5軸・字数厳守ルール・固有名詞取り違えチェックを含む。Generator/Evaluator 両方がこれを参照）。

## 進捗（2026-05-20 時点）

- 139本の storyboard.json を機械下生成済み（commit c8dc83d0c）。
- **完了・コミット済み: 投稿日順の folder 1〜43（43本）**
  - commit 998cd21e5 — batch1-4（accident-cost パイロット含む29本、360-degree-evaluation 〜 asch-conformity-experiment）
  - commit 9c118fdaf — batch5-6（14本、attitude-appraisal 〜 blind-drill）
- **残り: folder 44〜139（96本）未着手**。再開は `2026-08-21-blockchain-crypto` から。

## 再開手順

1. worktree `C:/tmp/doboku-note-yt` で作業（branch `feature/yt-shorts-quality`）。`node_modules` ジャンクション確認。
2. 7本ずつバッチで Generator agent（general-purpose / sonnet）を起動。次バッチ:
   - **batch 7**: 2026-08-21-blockchain-crypto, 2026-08-24-bottom-up-estimation, 2026-08-26-bowtie-analysis, 2026-08-28-break-even-point, 2026-08-31-budget-planning, 2026-09-02-business-continuity-plan, 2026-09-04-business-intelligence
   - **batch 8**: 2026-09-07-capacity-management, 2026-09-09-carbon-neutral, 2026-09-11-carbon-pricing, 2026-09-14-career-ownership, 2026-09-16-career-path, 2026-09-18-career-track-system, 2026-09-21-cash-flow-statement
   - 以降は `ls -d docs/sns/youtube/2*/ | sort | sed -n 'N,Mp'` で7本ずつ。
3. Generator 完了後、**機械的に字数チェック**（下記スクリプト）。100字超があれば Generator に差し戻してトリム。
4. Evaluator agent で内容を採点（軸1,2,3,5。軸4=字数は機械チェック済みなので採点不要）。合格ライン: 平均4.0以上かつ全軸3以上。不合格は Generator に差し戻す。
5. バッチが全件合格したら `git add docs/sns/youtube/{folder}/storyboard.json`（7本）→ commit。

## 字数チェックスクリプト

```bash
cd C:/tmp/doboku-note-yt && node -e '
const fs=require("fs");
const folders=[/* 対象 folder 名の配列 */];
let over=0;
for(const f of folders){const j=JSON.parse(fs.readFileSync(`docs/sns/youtube/${f}/storyboard.json`,"utf8"));
 j.slides.forEach(s=>{const L=(s.script||"").length;
  if((s.type==="definition"||s.type==="examPoint")&&L>100){over++;console.log(`OVER ${f} ${s.type}: ${L}`);}
  else if(s.type==="cover"&&L>45){over++;console.log(`OVER ${f} cover: ${L}`);}});}
console.log(over===0?"字数OK":`${over}件超過`);'
```

## agent プロンプトの要点

**Generator**（既知の失敗パターンを反映済み）:
- 作業ディレクトリ厳守。ルーブリックを読む。
- script は完全な話し言葉の文（体言止め・記号棒読み禁止、記号は言葉に開く）。
- definition は frontmatter description でなく MDX 本文の定義文を真実源にする。
- **字数厳守**: definition・examPoint は100字以内（85〜95字目安）、cover 45字以内。執筆後に字数を数える。
- **論点整合**: `data.body` と `script` は同じ論点。examPoint 2枚は別論点。definition と examPoint も重複させない。
- 固有名詞・法則名の取り違え注意（例: ハインリッヒの法則=1:29:300、コスト比率1:4 と混同しない）。
- 報告は最小限（各キーワード `slug: 各script字数` の1行のみ）。

**Evaluator**: 軸1,2,3,5 を採点。軸5は固有名詞・年号・数値を厳格に。合否一覧表のみ、合格本の個別講評は書かない（コンテキスト節約）。

## 既知の注意点

- 旧 batch（強化前プロンプト）は script が長くなりがちだった → 現プロンプトは字数ルール強化済み。batch3 以降は概ね一発で字数適合。
- Evaluator は字数を甘く見る傾向 → 字数は必ず機械チェックでゲートする。
- agent 起動時に稀に 407 プロキシ認証エラー → 一過性。再実行で回復。

## 残作業（このキャンペーン後）

- **動画 mp4 の再生成**: 改善した storyboard.json をもとに `yt-shorts-create.mjs`（`--reset` なし）で mp4 を再生成する。**ffmpeg を PATH に通し、VOICEVOX エンジンを起動**する必要がある（現状未整備）。
- feature ブランチ `feature/yt-shorts-quality` を develop へマージ。

## 関連: 別件で完了済み

- Instagram 全727件の画像再生成（日付スタンプ削除・見出し修正）→ develop に commit 53c19fba9 済み。
