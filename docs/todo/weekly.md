# 週間計画 — 2026-W26（06/22〜06/28）

**今週のゴール**: 試験直前ピーク（技術士二次まで約2週間）に向けて、note 残作業（Mac手動操作4本）を消化し、直前訴求コンテンツを整備する
**参照**: [monthly.md](./monthly.md)

---

## 今週やること

| 優先 | タスク | 担当 | Codex? | 完了 |
|---|---|---|---|---|
| 🔴 | 「立場別模範論文の選び方」を note 新規投稿 | Claude Code(Playwright) | | [x] |
| 🔴 | 自治体道路担当 R08（R08-yosou-1/2）を note 公開 → 完全パック・ペルソナマガジンへ収録 | Claude Code(Playwright) | | [x] |
| 🟡 | develop → main デプロイ（W25〜W26 の統合分を本番反映） | Claude Code | | [x] |
| 🟡 | 公務員学習設計 `nc7d70c92b8b0` をペルソナ選択案内に緩和 | Claude Code(Playwright) | | [x] |
| 🟡 | BK-I を差し替え投稿（R03/04/06/07 の I-1/I-2 両収録版へ更新） | ドラフトstaging済→手動カットオーバー | | [~] |
| 🟢 | 総監 R8予想6本の旧マガジン導線削除（完全パック + もくじへ置換） | Claude Code(Playwright) | | [x] |

---

## 今週やらないこと

- X 投稿（凍結中・今シーズン断念）
- BK-09/10 yosou 生成（試験後 7月中旬以降に先送り確定）
- バックログの UI 系タスク（TOC 廃止・RelatedArticles・AuthorCard 改修等）— 試験ピーク期は手を付けない
- コンクリート診断士 cd-essay（来年向け、急がない）
- iOS アプリ（Web 月収 ¥15k 達成後）
- IG Reels / IG Carousel（試験直前週は note 作業を優先）
- Kindle KDP 着手（試験後フェーズ）

---

## メモ・ブロッカー

<!-- 前週からの持ち越し理由・ブロッカーをここに記録 -->

- **技術士二次筆記まで約2週間**（annual.md §7月上旬）。W26 が直前訴求の最終週。
- **Mac手動4本はすべて note.com 操作が必要**（Playwright browser-use または手動）。Claude Code 単独では完結しない。優先順位は「新規投稿（直前訴求効果大）> 差し替え・緩和」。
- **develop → main デプロイ**: W25 で feat/gsc-management・feat/ogp-ai-background・ci/index-coverage を develop に統合済み。試験ピーク前に本番反映すべき変更（component lint 整理・GSC 監査ワークフロー・OGP AI背景）が溜まっている。
- **総監 R8予想6本の旧マガジン導線削除**: 現状のまま実害なし（backlog §SNS §旧マガジン導線削除）。BK-I 差し替えと同じ note-edit-session で実施すると効率的。
- **W25 完了サマリ**: develop push 済み、建設部門もくじ note 再公開済み、総監ロードマップ14ペルソナ更新済み。
- **【2026-06-20 完了】** 🔴2本を Claude Code(Playwright `note-publish.mjs`)で公開＝note 投稿は Mac 手動でなく自動化できると実証（立場別 na030d9cb3060 / R08 n30d34b67a8c5・nf90ba1382475）。完全パックも ¥14,800→¥9,800 改定に伴い repo の価格ドリフト全42ファイル同期＋develop→main デプロイ済み。
- **【2026-06-20 ライブ更新セッション完了】** Phase U-B（update-mode.md 準拠・Selection限定・API実体検証・通知いいえ）で実施:
  - 公務員緩和 → ライブ nc7d70c92b8b0 反映済（旧「道路担当デフォルト断定」→「ロードマップから選べる」＋ロードマップカード。API hasOLD=false/hasNEW=true/hasRoadmap=true）。[x]
  - ライブ CTA ¥14,800→¥9,800: **API診断で実際に価格テキストを持つライブ記事は na030d9cb3060(本日公開)の1本だけ**と判明（他18本は「説明文＋埋め込みカード」形式で価格テキスト無し＝修正不要）。当該1本を修正済（API hasOLD=false）。backlog の「29本」は誤り→訂正済。
- **【2026-06-20 完了】旧マガジン導線削除（R8予想6本）**: n5116639ee21f/naace4eeaa230/n0c52cfabab78/nf12d75c3e606/n05314b15b375/nb4e6f088f0e8 の末尾有料領域の旧3ペルソナ導線（道路担当/ゼネコン/河川コンサル）を**完全パック m171222175fac + 総監もくじ n3ed4c77ceed6** へ Phase U-B 置換。手段＝偵察で実DOM確認（カードは block `<FIGURE>`）→ **シグネチャ駆動で1ブロックずつ Delete**（embed一括 Range Delete は ProseMirror で残カードが出るため不可）→ type → 公開に進む polling → 有料エリア設定で境界を「予想問題本文」H2直前へ再設定し `boundaryBeforeExam=true` 検証 → 更新する → 通知いいえ。**6/6 ペイウォール完全保持**（全 price=700・can_read=false・remained>0）＋新カード2反映＋旧mag=0 を API + 編集DOM再読で実体検証。スクリプト＝`.tmp/fix-r8-funnel.mjs`（偵察＝`.tmp/recon-r8-funnel.mjs`）。ソースは既に commit 76c4fb540 で修正済み。
- **【2026-06-20 ドラフトstaging完了・カットオーバー待ち】BK-I 差し替え**: R03/04/06/07 の I-1・I-2 両収録版を note ドラフト4本として作成（公開ゼロ・完全可逆・書式正確を DOM 検証）。新ドラフトid: R03 `nb1ddc4eb7622`/R04 `n8d72cf82ca72`/R06 `n149dd5284f51`/R07 `n6cbd95df5aad`。残＝公開→マガジン `m0f3bc3933454` 入替→旧4本（ne8b5b287351f/n61e459a3c541/nf7881f25de47/nffe6938dc40c）削除を**ユーザーが note UI で実施**。手順書＝`docs/handoffs/2026-06-20-bki-i2-draft-staging.md`。方式＝in-place type は書式崩れ確実ゆえ /new、ただし旧記事の非公開/マガジン削除は自動化なしゆえ最安全のドラフトstaging選択。価格ドリフト（frontmatter500/ライブ780）は公開時に780で揃える。
