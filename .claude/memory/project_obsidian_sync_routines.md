---
name: project-obsidian-sync-routines
description: doboku-note の活動を Obsidian vault へ日次記録する仕組み。実体は obsidian repo の GitHub Actions（旧 Claude Schedule routine 2本は消滅済み）
metadata: 
  node_type: memory
  type: project
  originSessionId: 4860c9d8-b4d5-4c1f-9055-aa34a4a48d6a
  modified: 2026-08-05T07:42:52.147Z
---

doboku-note の commit 進捗を Obsidian vault（`uruhayato373/obsidian`・private）へ自動記録する仕組み。
**実体は obsidian リポジトリ側の GitHub Actions**。doboku-note 側には何も無い（設定・スクリプトを探しても見つからないのが正常）。

## 稼働中（2026-08-05 実測で確認）

| workflow | cron | 動作 |
|---|---|---|
| `github-activity-log.yml` | `0 */3 * * *`（3時間おき）＋ 日曜 `45 13 * * 0`（過去14日バックフィル） | `.claude/scripts/github-activity/{fetch,update-dairy}.js` で対象リポの当日コミットを取得 → `dairy/YYYY-MM-DD.md` の `<!-- github:start -->` ブロックを書き換え → bot が commit & push |
| `weekly-progress.yml` | 週次 | 週次の進捗まとめ |

- 対象リポは `fetch.js` の `REPOS`（doboku-note と stats47 の2つ。vault 自身は対象外＝本人方針）
- 認証は obsidian repo の `secrets.GH_PAT`
- `> _更新:` の時刻行だけの差では書き換えない＝活動が無い日はコミットも発生しない（ノイズなし）
- cron は数十分〜2時間ずれる（GitHub Actions の仕様）。頻度で吸収する設計

## 旧 Claude Schedule routine は消滅している（2026-08-05 確認）

`trig_015qRPqzor7QzVroWf1Xo4Ss`（日次）/ `trig_019xPxsZ3RWNAJM9y7JTzPMV`（週次）は
**RemoteTrigger get で両方 404**。2026-05-25 に作った remote agent 版は既に無く、
GitHub Actions へ移行済み。**この2つを「稼働中」と思って新規 routine を足さないこと**（重複になる）。

## 踏んだ罠: GitHub commits API は `sha` 無しだとデフォルトブランチだけ

**`/repos/{repo}/commits?author=...` は `sha` を省略すると main（デフォルトブランチ）のコミットしか返さない。**
doboku-note も stats47 も日々の作業は develop に積み、main はデプロイ昇格時にしか動かないため、
**昇格しなかった日の活動が丸ごと 0 件**になっていた。エラーにならず静かに 0 件と判定されるので誰も気づかない。

- 実害: 2026-08-05、doboku-note の 15 コミットが 1 件も dairy に載らず、stats47 の 6 件だけが表示されていた
- 修正（obsidian repo `79415aa`）: `REPOS` を `{ repo, branches: ['main','develop'] }` へ。
  ブランチごとに `&sha=` を付けて取得 → **フル SHA で dedupe**（昇格で両ブランチに出る分を1件に畳む）→ 日付降順。
  ブランチ不在（404/422）はそのブランチだけ skip し、全ブランチ不可のときだけ note を上げる
- 修正後の実測: doboku-note 0→16件・stats47 6→14件・重複SHA 0。dairy の出力形式は不変

**How to apply:**
- **動作確認**: `gh api repos/uruhayato373/obsidian/contents/dairy/$(date +%F).md --jq .content | base64 -d` で
  `<!-- github:start -->` ブロックを見る。手動発火は `gh workflow run github-activity-log.yml --repo uruhayato373/obsidian`
- **対象リポを増やす/ブランチを足す**: obsidian repo の `.claude/scripts/github-activity/fetch.js` の `REPOS` を編集
- **「記録されていない」と言われたら**: まず「そもそも run が来ているか」（cron 遅延）と
  「どのブランチにコミットしたか」の2点を見る。author 不一致や設定もれより **ブランチの取りこぼしを先に疑う**
- 関連: [[project_coconala_tensaku_channel]]（本 routine の主な観測対象）
