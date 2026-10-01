---
name: feedback_gate_zero_coverage_false_pass
description: "ゲートの「異常0件」と「検査0件」は同じ緑。取得不能をFAIL/構造的に必ず赤も害。否定側を1回の観測で断定すると待ち不足の偽陰性。緑は実検査数・赤はゲート自身の欠陥を先に疑う"
metadata:
  type: feedback
---

**「異常0件」と「検査0件」は出力が同じ緑になり、後者は事故を隠す。** 2026-07-28 に **5 つのスクリプトが同時にこの状態**だった。検査ゲートだけでなく**実行系スクリプト**も同じ形で壊れる。

| スクリプト | 故障 |
|---|---|
| `check-note-structure` | Node `fetch` がプロキシで全滅 → `FETCH_ERR` が `sev:'INFO'` 固定で `critGate` に入らず、`--ci` 無しでは `process.exit()` すら呼ばれない（675/675 失敗でも緑） |
| `check-note-site-utm` | `join()` の `\` 区切りを `/\/article\.md$/` で判定 → Windows の全量実行が常に0件（`--staged` は git の `/` 出力で動き発覚が遅れた） |
| `check-note-republish` / `audit-note-cards` | `name === 'article.md'` 固定で型別 `article-*.md` を走査せず建設部門の大半が対象外 |
| `check-note-live-headings` | 全件取得失敗でも `bad.length` だけで判定し「✓ 不整合なし」 |
| **`note-sync-tags`（実行系）** | live タグ取得が fetch で全滅 → 全件 `[skip] API 取得失敗` → **「追加すべきタグなし（全て in-sync）」と表示して exit 0** |

その陰で有料記事2本が無料プレビュー0字、送客リンク64件がライブでリンク切れ、note ライブのハッシュタグが675本中250本で90未満（0タグ19本）のまま公開されていた。

**Why:** ゲートは「異常を検出する」ことは設計するが「自分が機能しているか」は自己申告しない。走査・取得経路が壊れると対象0件のまま最も安全に見える出力（緑）を返す。

## 裏返し: 「取得できない」を FAIL と呼ぶと偽の不足と phantom タスク（2026-07-30）
未ログインの note public API はメンバーシップ限定記事に `body='' / hashtag_notes=[] / price=0` を返す（`status` は `published`）。素朴に読むと「タグ0」「画像欠落 live=0/sot=2」だが、**著者ログインで実測するとタグ99/98/98・画像2/2 で充足**。実害: (1) `note-sync-tags` が3記事を `[6] FAIL: ライブ件数が増えていない（0→0）` と報告→「試し読みサブフローでタグ入力が破棄される（2026-07-23 実測）」という誤結論と allowlist 登録が1年近く残りかけた (2)「note ライブ本文の画像欠落3件を修復」という phantom タスク。判別は `scripts/lib/note-live-check.mjs` の `isUnmeasurable()`。該当記事は UNMEASURABLE として**分母から外し別枠表示**（充足にも不足にも混ぜない）。
- 事前に作った固定リストの完走を「全量完了」と呼ばない。07-30 のタグ反映は668件リストを完走したがリスト外の4本が49〜54タグで残っていた（露出は `--list` 無しの全量ゲートだけ）。**完了判定は必ず全量ゲート**。

## 3 つめ: 「構造的に必ず赤いゲート」も同じ害（2026-07-30）
`weekly-review-guard` が2週連続 failure（「先週分の review が存在しません→ルーティンの発火状態を確認」）。「ルーティン停止」と結論したが誤り。週次レビューは最新週だけ残す保持方針で、W31 を作るコミットが W30 を削除する。guard は「先週分のファイルが今あるか」だけを見るため**サイクルが正常でも翌週分生成の瞬間に必ず赤**。害: (1) 常に赤いゲートは読み飛ばされ本当の欠落を隠す (2) メッセージが「ルーティンを再作成せよ」と誘導し従えば重複生成事故を再演。**自分の修正でも踏んだ**: 判定を git 履歴（`git log --diff-filter=A`）にしたら `fetch-depth: 0` が必要になり、65,000 ファイルのリポジトリで checkout が job の5分 timeout を超え cancelled（緑にも赤にもならず検査不成立）→履歴不要な「現存する最新週が先週以降か」に作り替えた。
- 同じ赤が2回続いたら、まずゲート自身の欠陥を疑う（外部原因断定の前に、判定条件が保持方針・ローテーション・意図的削除と衝突していないか）。
- 「今の状態」で判定するゲートは成果物が意図的に消される運用と衝突しないか確認。消えるなら「生成された事実」か「最新世代の新しさ」で判定。
- ゲートの修正指示に破壊的アクションを書かない（「再作成せよ」でなく「まず切り分けよ: 誰が生成しているか→list-first→不在を確認できないなら作らない」）。
- 判定精度のために CI を重くしない（checkout/取得コストが timeout を超えると cancelled＝何も検査していない）。
- `RemoteTrigger list` は cursor を渡しても同じページを返し全件列挙できない（2026-07-30 実測）＝不在を証明できないので routine を create しない。

## 4 つめ: エージェント自身の手打ち確認でも同じ誤読（2026-08-27）
| 叩いたもの | 返り | 誤読 | 実際 |
|---|---|---|---|
| `gh release list \| grep asset-inbox` | 空 | 「release が消えた＝取込成功」と報告 | release は残存・workflow は failure |
| `curl --noproxy '*' https://doboku-note.pages.dev` | `HTTP 000` / `<main` 0 | 「デプロイ失敗・SSR 破壊」と報告しかけた | 200 で正常。`--noproxy` で自分がプロキシを外していた |

R2 も同型: `rclone lsd obsidian-r2:` の空を「bundle が無い」と読みかけたが、対照実験（中身があると分かっている公開バケットを同じ remote で引く）でも空→その remote から見えていないだけ（endpoint が別アカウント）。対策として判定をコード化: `npm run check-production-ssr`（exit 0=正常 / 1=壊れている / **2=検査不成立**）。deploy skill Step 7.5 はこれを呼ぶだけで手打ち curl 禁止。
- 外部コマンドの空応答は「無い」の証拠にならない。`grep -c` で件数を出し、0 件なら**対照実験**を1本挟んでから結論。
- 会社 PC で外部 URL に `--noproxy` を付けない（必ず 000）。localhost だけは逆に必要。
- 接続不能は合格でも不合格でもない**第三の状態**。まず自分の経路を疑う。

## 5 つめ: 否定を1回の観測で断定する＝待ち不足の偽陰性（2026-09-07）
2026-09-07 の棚卸しで否定側（不足・未ログイン・0件）を1回の観測で確定する実装が5回続けて嘘を生んだ。

| 場所 | 単発判定 | 出た嘘 |
|---|---|---|
| `check-note-attachments --live` | goto→2.5s→scroll→1.5s→1回数える。`live < want` を確定 | 添付があるのに `live=0`（2日で2件） |
| 同スクリプトの account gate | `assertAccountGate(attempts:1, intervalMs:1500)` | authenticated なのに20分の走査を開始3秒で ABORT |
| `auth:status` | goto→`waitForTimeout(1500)`→1回分類 | note が `--all` で `unknown`・`--service` で `authenticated`（marker は4回目＝約6秒で出る） |
| URL redirect だけのログアウト判定 | google=`/search-console/about`、x=`x.com/`+パスワード欄はパターンに当たらず `unknown` に埋もれた（実体はログアウト） | |
| 保存前ゲート | 未証明のまま「入れた」と記載 | |

**Why:** 肯定は1回見えれば真だが、否定は「まだ描画されていない」と区別できない。偽陰性が本物の欠落として台帳・スナップショット・レポートに残る。CLAUDE.md §9「検査ゼロを PASS と呼ばない」の裏面。
- **決着済みの分類は即返し、未決着のときだけ待ち直す**（timeout は待ち直しの上限であって判定ではない）。コストは否定側だけに払う（`check-note-attachments` は不足と出た記事だけ単独条件で再実測して確定。575本で暫定不足1→解消1・確定不足0）。
- 出力に「暫定 / 解消 / 確定」と観測回数・待った時間を必ず出す。
- 待ちの既定値をライブラリ既定（10回×2秒）より短くするなら理由を残す（20分のジョブを1.5秒の判定で落とすのは割に合わない）。
- 否定の証拠は肯定の証拠の後ろで見る（ログアウト検出のパスワード欄を account marker 確認より前に置くと、認証済みの note `/settings/account`（パスワード変更欄あり）を `expired` と誤判定。`coconala` が authenticated のまま回帰で気づいた）。ログアウト判定を URL redirect だけに頼らない。
- 新しく入れたゲート（例: note 価格変更の保存前添付ゲート・`.claude/state/note-attachment-loss.json` の pending）は**次に実際の書き込みを回すまで「実挙動は未証明」と明記**し、初回実行時に `[attach] 保存前の添付 N/N を確認` が出ることを見る。

## 緑/赤の共通 How to apply
- **赤を見たとき**: そもそも計測できていたかを確認。値が0なら「無い」か「読めない」かを別経路（著者ログイン等）で1件実測してから作業を起こす。0 を根拠に作業リストを作らない。
- **書くとき**: 検査対象数と実検査数を必ず出力（「実検査 N本（対象M・取得失敗K）」）／取得失敗が支配的（>20%）なら exit 1＝検査不成立／ファイル判定はパス全体でなくファイル名（`join()` は Windows で `\`）／note 記事の走査は `/^article(-[^/\\]+)?\.md$/`（型別を落とさない）／外部取得は `fetch` でなく `curl --ssl-no-revoke`（[[feedback_metrics_cicd_supplied]]）。
- **実行系にも同じ規律**: 「対象0件だったので何もしなかった」と「全部失敗したので何もできなかった」を区別して出力。`skip` を無言で積み上げて最後に「全て in-sync」と言わない。
- **読むとき**: 緑を見たら何件検査したかを確認。0件や対象数より極端に少ない緑は故障の可能性が高い。
- **メタゲート**: `npm run check-gate-coverage` がソース走査型ゲートの検査件数を監視し急減で落とす（r2-audit.yml 週次・故障注入で捕捉を実測済み）。真実源: `.claude/knowledge/reference/note-api-verification.md`「メタゲート」節、CLAUDE.md §9。

関連: [[feedback_prevention_over_patching]] / [[feedback_platform_only_artifacts_destroyed_by_bulk_ops]] / [[feedback_publish_x_false_success]] / [[feedback_verify_your_excuses]] / [[reference_ci_quality_gate_fixes]]
