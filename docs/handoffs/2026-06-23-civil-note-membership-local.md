# 引き継ぎ: 土木 note 売上強化（会員ローンチ＋無料集客公開）— ローカル実行用

**作成日**: 2026-06-23
**ブランチ**: `claude/civil-engineering-certifications-jr57d6`（doboku-note）/ PR #271
**前提**: サイト側 CTA 配線・SoT 整合・公開キュー・専用サブエージェントはリモートで完了・push 済み。**本書は note への実投稿・メンバーシップ設定をローカルで進めるためのチェックリスト**。

> [!important] なぜローカルか
> note への投稿・特典マガジン収録・メンバーシップ設定編集は **Playwright ブラウザ自動操作**で行い、**note ログイン済み永続プロファイル（`.local/playwright-note-profile`／システム Chrome）が必須**。これは gitignore 対象で新規クローン（リモート/web セッション）には来ない＝**リモートでは一切実行できない**。初回は `npm run note-edit-session` で手動ログインを済ませる（理由は計測ルールでなく、認証プロファイル非在）。

---

## すでに完了している（本ブランチ・push 済み・PR #271）

| 種別 | 成果物 |
|---|---|
| サイト会員 CTA 配線 | `src/lib/note-magazines.ts` に `civil-membership-lab`（`published:false` プレースホルダ）／`magazine-placement.ts` で 1級・2級の経験記述系・guide・カテゴリに会員 CTA 配置（買い切りは維持・末尾追加） |
| 2級過去問集の整合 | 公開済み R03-R07 の退役商品「予想問題集」へのデッドリンク文言を全5本除去／stale な「公開準備中・published:false」表記を実態へ |
| 公開キュー | `docs/note/1級・2級土木/_publish-queue-無料集客.txt`（draft 無料集客16本を優先順で `--list` 一括公開） |
| もくじ会員導線 | `docs/note/1級・2級土木/土木もくじ/article.md` に「伴走する（会員制）」節＋目的逆引き行を前準備（URL は運営者TODO） |
| 専用サブエージェント | `.claude/agents/note-membership-operator.md`＋`agents-registry.md` 反映（既存ブラウザ script を束ねるオーケストレーター） |

---

## ローカルでやる作業（順序＝ROI順）

### 0. 初回ログイン（1回だけ）
```bash
npm run note-edit-session   # 画面で dobokunote に手動ログイン → プロファイルに永続化
```

### 1. 【最優先】無料集客16本を公開（眠っている転換層を起こす）
原稿は3点セット完備・lint クリーン・プレースホルダ残存なし＝即公開可。
```bash
# dry（対象16本の確認）
node scripts/note-publish-magazine.mjs --list docs/note/1級・2級土木/_publish-queue-無料集客.txt
# 即時公開
node scripts/note-publish-magazine.mjs --list docs/note/1級・2級土木/_publish-queue-無料集客.txt --commit
# または1日1本ドリップ予約
node scripts/note-publish-magazine.mjs --list docs/note/1級・2級土木/_publish-queue-無料集客.txt \
  --schedule-start 2026-06-24T07:00 --interval-hours 24 --commit
```
- 公開順: リードマグネット3本 → 2級BOFU5本 → **1級6本（現状ライブ0本＝新チャネル開通）** → 2級入口2本。
- 冪等（noteUrl があればスキップ・再実行で再開）。公開後 frontmatter に noteUrl が writeback される → **`git add` は変更記事のみ pathspec で commit**。

### 2. メンバーシップ本体の URL を SoT へ反映（ローンチ直後1回）
メンバーシップは作成済み（`https://note.com/membership/settings/manage`）。本体ページの URL を取得して3箇所へ:
1. `src/lib/note-magazines.ts` の `civil-membership-lab` → `noteUrl` 記入＋`published: true`
2. `docs/note/1級・2級土木/土木もくじ/article.md` の運営者TODOコメント箇所 → bare URL 記入（要 note 再公開）
3. `npm run type-check` → 変更ファイルのみ commit（**サイト CTA が自動発火**）

### 3. 特典マガジンの確認・会員配信の開始（`note-membership-operator` で）
- `メンバーシップ/予想問題マガジン`・`学科記述予想`・`添削事例アーカイブ` を特典マガジンとして用意し、`/membership/settings/manage` で各プランの特典に紐付け（過去問マガジンは紐付けない＝非重複）。
- 週次ドリップ: 該当週の article.md を公開 → `note-magazine-add-articles.mjs --commit` で特典マガジンへ収録（＝会員へ自動配信）。配信カレンダーは `メンバーシップ/README.md`（W1→W11）。

### 4. 添削実測ゲート（添削層 定員10 の唯一の根拠・募集前に必須）
`2級土木/2級経験記述-添削テンプレ.md` でサンプル2本を添削し **1本30分以内**を実測（超なら定員10→6 or 隔週化）。計画 §5.1 ゲート1。

### 5.（任意）設定UIフォーム自動化の calibration
価格/定員/説明の**自動書き換え**は実 DOM 未確認のため未実装。欲しい場合は `note-edit-session` で `/membership/settings/manage` を開き、DOM/文言を控える（または `note-magazine-add-articles.mjs --probe` 方式）→ それを基に selector を作り込む。当面は画面を開いて手動編集で足りる（note 規約上も自動保存は避ける）。

---

> [!warning] 崩してはいけない一線（Red Line #10・非重複の生命線）
> 過去問・完成答案を**会員特典マガジンに入れない**／予想・添削を**買い切りに出さない**。崩すと価格逆転 or 会員の存在理由消失が再発する（計画 §2.3）。`note-membership-operator` は収録先が買い切りマガジンでないか実行前に assert する。

> [!note] 安全弁
> 収益アカウントのため、各 script は **account=dobokunote ゲート・既定 draft/dry-run・`--commit` 必須・公開後 API 実体検証（偽成功ガード）**。`note-publish.mjs` はユーザー起動限定（モデル自動 `--commit` 禁止）。
