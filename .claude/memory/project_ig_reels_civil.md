---
name: project-ig-reels-civil
description: IG Reels 動画生成の多資格対応状況（ig-reel-create v1.2）と未生成年度
metadata: 
  node_type: memory
  type: project
  originSessionId: b28acf51-448b-4d99-8f0a-be688d78024e
---

ig-reel-create スキルを v1.2 で多資格対応にした（2026-06-04、PR #236 → develop、マージはユーザー判断待ち）。

**生成済み**: 1級土木r07(20) + 2級土木r07k後期(12) + r07z前期(12) = 44本。技術士総監は既存27本（r03/r04全 + r05pack-01 + r07全）。

**未生成（同手順で追加可能）**: 1級 h26-r06、2級 r03-r06系（k=後期/z=前期）、技術士総監 r05残り/r06/各_summary。docs/sns/instagram 配下で全398 reels中まだ大半が画像のみ。

**生成手順**:
1. ネイティブ VOICEVOX 起動（Docker不要）: `/Users/minamidaisuke/voicevox_engine_dl/macos-arm64/run --host 127.0.0.1 --port 50021 &` → `curl localhost:50021/version` で確認
2. `node .claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs --exam-dir <1級土木|2級土木> --exam <r07[k|z]-pack-NN> --skip-png`（既存img PNGが1080×1920なので--skip-png必須で高速）
3. 完了後 VOICEVOX 停止: `pkill -f voicevox_engine_dl`

**コミット方針**（2026-06-18 更新）: コミットは script.txt + caption.txt のみ。video.mp4 / wav / slide-NN.mp4 / _combined.mp4 / _empty.ass / concat.txt は .gitignore 済み（再生成可）。wav も R2 退避へ統一（`npm run upload-sns-r2` + `sns-archive-auditor`、真実源 docs/reference/sns-archive-policy.md）。旧「video.mp4 + script.txt のみ」「SoT=slide-data+wav」は失効。wav は script.txt から VOICEVOX 再生成可＋R2 復元可。

**注意**: 2026-06-04 時点で working tree に別プロセスの x-post 系作業が並走していた。git add は必ず明示指定（[[parallel-agent-commit-sweep]]）。

**2026-06-06 セッションで判明したツール欠陥3点（全て修正済）**:
1. **カバー desync**: カバーPNG(`img/00-cover.png`)を刷新しても reel 動画(`slide-00.mp4`)を再生成しないと「サムネ新・動画1枚目旧」になる（2026-06-02 cover刷新で発生、総監27本＋YT26本に波及）。→ `yt-shorts-create` に `assertCoverInSync`（slide-00 先頭フレーム vs cover png の SSIM<0.90 で中断）を新設。**カバーPNGだけ更新する運用は禁止、ig-reel-create で動画も同時再生成**。
2. **`--exam-dir` バグ**: parseArgs 未登録で弾かれていた（修正済）。
3. **VOICEVOX 読み辞書**: `過去問`/`全問` が「かことい/ぜんとい」と誤読 → `reading-dict.mjs` に `かこもん`/`ぜんもん` 追加。cover/cta ナレーションのみ該当。**該当2スライドだけ再TTS＋再合成すれば全パック再生成は不要**（`.tmp/renarrate.mjs` 方式、script.txt の[00]/[09]行を SoT に。要 wav/img/slide 存在ガード）。
- 再生成で TTS 尺が微変し境界パックが60s超になることがある→ pair-swap（短い設問ペア）or 微速調整（atempo/setpts ~1.05x、題保持）で吸収。
