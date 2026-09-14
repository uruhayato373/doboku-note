---
name: feedback_publish_x_false_success
description: publish-x の「予約投稿完了」ログは信用せず X 予約キューを実体検証する。確定クリック不発の偽成功事故と check-x-length の Windows 空振り
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2cf8f692-40ae-40de-8b80-614c2d8617b0
---

publish-x.ts の「✅ 予約投稿完了」ログは投稿成功の証拠にならない。X 予約キュー（`https://x.com/compose/post/unsent/scheduled`）を Playwright で開き、仮想スクロールで全セルをロードして実体（本文マッチ＋送信時刻）を確認するまで「完了」と報告しない。プロフィール（`x.com/<handle>`）のポスト数で即時投稿の誤爆も併せて確認する。

**Why:** 2026-05-29、総監 X ドラフト034/035/036 の9件を予約したつもりが、キューに1件も入っていなかった（偽成功）。原因は予約確定の最終ボタン `getByTestId("tweetButton").click()` が X の React onClick を発火できず compose が閉じない（=保存されない）のに、その手前の `予約モード確認OK` だけで success を返していたこと。即時投稿側は同問題を Ctrl+Enter に切替済みだったが予約側のコードだけ旧 `.click()` のまま＋クリック後検証なしだった。修正: 予約側も `Ctrl+Enter` 確定＋compose 閉鎖をループ検証し、閉じなければ中止（偽成功を物理的に出さない）。加えて clipboard paste 不発で textbox 空のまま進む偽成功も `innerText` 読み戻し＋`keyboard.insertText` フォールバック＋空なら中止のガードを追加。

**2026-06-03 追加の2学び（土木145本予約時）:**
- **コメント混入バグ**: `tweets.md` の `## Tweet` 見出し直後に `<!-- 投稿予定: … -->` 注記を置くと、publish-x.ts のブロックパーサがそれを本文に含めて投稿していた（dry-runで文字数277=注記込みと判明）。`parseTweetMd` の body 抽出に `.replace(/<!--[\s\S]*?-->/g,"")` を追加して修正（commit 31e2bd52a）。注記付きドラフトを投稿する前は必ず dry-run で本文プレビューを確認する。
- **検証ダンプのスクロール上限**: 予約キューが大きい（総監149＋土木145＝約294件）と、`[role="dialog"]` 内 innerText 蓄積ダンプは**チャンクのlazy-loadが約190件（時系列で〜9月頭）で頭打ち**になり、それ以降（9/14以降）が全件未到達＝偽陰性になる。`scrollTop=scrollHeight` 強制ジャンプでも576行で停止し10/25末尾に届かなかった。**境界が日付できれいに揃う（≤早9月は全ヒット／≥9/14は全ミス）場合はスケジュール失敗ではなくダンプ到達不足を疑う**。少数キュー時代（〜173件）は同コードで全件取得できていた。当面は小さいキュー or 月別少数ニードルでの実査に留め、巨大キュー全件ダンプは未解決（mouse.wheel 連打 or 正しいスクロールコンテナ特定が要検討）。

**How to apply:** publish-x で投稿したら必ずキュー実体検証スクリプトを走らせる（`.tmp/verify-final.mjs` パターン: scheduled タブを cellInnerDiv 末尾 scrollIntoView で全件ロード→本文 regex マッチ＋送信時刻ヒストグラム＋プロフィールポスト数）。ログの「完了」だけで報告しない。ただし上記の通り巨大キューではダンプが末尾に届かないので、未検出が後半日付に固まる場合は到達不足を切り分ける。関連: [[feedback_tool_output_hallucination]] [[project_x_30days_campaign]]（90件予約完了の記録も同バグで一部しか入っていない可能性があり要再検証）。なお `scripts/check-x-length.mjs` は Windows で末尾の `import.meta.url === \`file://${process.argv[1]}\`` ガードがパス表記差（`file:///C:/…` vs `file://C:\…`）で常に false になり main() 不実行＝無条件 EXIT0 の偽パス（`pathToFileURL` 比較へ要修正）。文字数検証は publish-x 内蔵 guard（>280 で中止）を真実源にする。
