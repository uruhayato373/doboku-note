# Claude Code 一括実行プロンプト：土木メンバーシップ訴求・加入導線改善

以下のコードブロックをそのままClaude Codeへ渡す。

```text
このリポジトリで、noteメンバーシップ「土木セコカン 合格ラボ」の訴求と加入導線を、サイトのソース変更、note記事のソース変更、noteライブ反映、検証、運用文書同期、引き継ぎ記録まで完了してください。

最初に必ず次を全文で読んでください。

1. CLAUDE.md
2. .claude/plans/civil-note-membership-funnel-remediation-2026-07-30.md
3. .claude/knowledge/reference/note-funnel-architecture.md
4. .claude/knowledge/reference/note-api-verification.md
5. docs/note/1級・2級土木/noteコンテンツ計画.md
6. docs/note/1級・2級土木/メンバーシップ/README.md
7. docs/note/1級・2級土木/メンバーシップ説明文.md
8. .claude/agents/note-membership-operator.md
9. .claude/skills/social/audit-note-funnel/SKILL.md
10. .claude/skills/social/publish-note/SKILL.md
11. .claude/skills/social/publish-note/references/update-mode.md
12. src/lib/note-magazines.ts
13. src/lib/magazine-placement.ts
14. src/app/docs/[...slug]/page.tsx
15. scripts/note-update-body.mjs

今回の詳細仕様、正式URL、対象記事、CTA文面、検証、停止条件は .claude/plans/civil-note-membership-funnel-remediation-2026-07-30.md が真実源です。独自判断で価格、プラン、定員、買い切り商品、他資格へ範囲を広げないでください。

作業開始時:

- git branch --show-current、git status --short --branch、origin/developとの差分を確認する。
- developが遅れていて作業ツリーがクリーンなら git pull --ff-only origin develop で同期する。
- 既存の未コミット変更はユーザーまたは他セッションのものとして保護し、無関係な変更を戻さない。
- Playwrightの永続プロファイルを別処理が使用中でないか確認する。
- 公開プロフィール、加入ページ、対象note記事を非ログインPlaywrightで確認し、変更前のリンク件数と説明記事のプレビュー状態を記録する。

正式値:

- membership id: civil-membership-lab
- join URL: https://note.com/dobokunote/membership/join
- CTA marker: <!-- cta:civil-membership-lab -->
- intro note: n6b66793ca20c
- civil index note: n4fde0f62dc20

Phase 1: サイト側

1. src/lib/note-magazines.ts
   - civil-membership-lab を published:true にする。
   - noteUrlを正式join URLにする。
   - title、description、price、badge、CTA文言は変更しない。
   - ローンチ前の未来形コメントを公開済みの現在形へ直す。

2. src/app/docs/[...slug]/page.tsx
   - 全資格のsecondaryを一律有効化しない。
   - civil-construction-1/2かつdocGroup=secondaryだけをmidEligibleGroupへ追加する。
   - 既存のH2数・本文長ゲート、同一商品重複防止、最大枠数を維持する。

3. src/lib/magazine-placement.ts
   - 土木二次系ではtopの買い切り商品を維持する。
   - inlineの先頭をcivil-membership-labにし、本文中間CTAに選ばれるようにする。
   - 対象は1級・2級のsecondary-r0X、experience-writing guide/examples、2級getting-started、1級secondary catch-all、1級last-minute。
   - 既存買い切り商品は削除せずinline後方へ残す。
   - primaryを今回midEligibleへ追加しない。

Phase 2: note記事ソース

対象:

- docs/note/1級・2級土木/土木もくじ/article.md
- docs/note/1級・2級土木/経験記述-落ちる答案診断-無料/article.md
- docs/note/1級・2級土木/経験記述-独学添削の限界-無料/article.md
- docs/note/1級・2級土木/経験記述-予想問題で書く練習-無料/article.md
- docs/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/article.md
- docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/article.md

必須:

- 各記事にCTA markerと正式join URLを1件ずつ入れる。
- 正確な配置と文面は作業票 §7 を使う。
- 「プロフィールまたはマガジン一覧から」の曖昧な案内を直接リンクへ置換する。
- 土木もくじの会員セクションを「まず選ぶ1冊」の直後、買い切り一覧より前へ移す。
- 土木もくじのローンチ前TODOコメントを削除する。
- 説明記事末尾の自己参照URL n6b66793ca20c をjoin URLへ置換する。
- 価格、買い切りURL、有料境界、免責を変更しない。

Phase 3: 回帰テスト

- tests/note-membership-funnel.test.mjs を追加する。
- civil-membership-labのpublished:trueと正式join URLを検査する。
- 対象6記事のCTA markerとjoin URLが各1件であることを検査する。
- 説明記事本文に自己参照URLが残っていないことを検査する。
- 土木二次の代表配置でtop=買い切り、inline[0]=membershipの契約を検査する。
- テストを通すためだけの別SSOTや商品定義を作らない。

Phase 4: ソース検証

- 対象6記事へ node scripts/note-lint.mjs を個別実行する。
- npm run type-check
- npm run lint
- npm run audit-note-funnel
- npm run check-note-funnel
- npm test
- git diff --check
- ローカルサイトを起動し、作業票 §6.3 の代表5ページをPlaywrightでモバイル・デスクトップ確認する。
- 各代表ページでjoin URLのアンカーが1件、career記事では0件であることを確認する。
- 検査対象0件や全件取得失敗をPASSと呼ばない。

Phase 5: noteライブ反映

- ソース検証合格後に行う。
- .local/playwright-note-profileと既存スクリプトを使う。
- account=dobokunoteを確認する。
- 作業票 §9.2 のコマンドで、対象6記事を1件ずつdry-runする。
- noteId、タイトル、本文長、画像、リンクカード、有料／会員境界、添付の有無を確認する。
- PDF添付が検出されたら保存せず中断する。--allow-attachment-lossは禁止。
- dry-runが正常な記事だけ、同じコマンドへ--commitを付けて1件ずつ反映する。
- 説明記事は必ず --trial-line-bottom --commit を使い、ほぼ全文を加入前に読めるようにする。
- 更新通知は必ず「いいえ」。1件失敗したら後続を止める。
- 新規会員記事の公開、特典マガジン収録、会員通知はこのPhaseでは行わない。

公開後:

- 非ログインの新規Playwright contextでモバイル390x844、デスクトップ1440x1000を確認する。
- 対象5送客記事にjoin URLが1件ある。
- 土木もくじの会員セクションが買い切り一覧より前にある。
- 説明記事の主要本文とjoin URLが加入前に読める。
- まるごとパックの価格、購入導線、本文、有料境界が維持されている。
- 加入ページの2プラン、¥1,480/月、¥2,980/月、参加ボタンが維持されている。
- 公開APIで取得できる記事はAPI本文にもjoin URLがあることを確認する。

Phase 6: 運用文書同期

- noteコンテンツ計画.md
- メンバーシップ/README.md
- .claude/agents/note-membership-operator.md
- docs/todo/backlog.md

上記を公開済み状態へ更新する。ただし、未公開の予想問題等22本、添削実測、継続配信は未完了として残す。公開中プランの設定保存が即時ライブ反映か未確認なら、note-membership-plan-editを実行せず、エージェント文書へ未確認と安全条件を書く。

コード・エージェント文書を変更したため、コミット前に /doc-sync を1回実行する。

新規会員記事の公開は別承認:

- W1予想問題と添削事例の公開候補は作業票 §10 にある。
- 既存会員への配信・通知を伴う可能性があるため、この2本を公開する前に一度だけユーザーへ明示承認を求める。
- 承認がなければ公開せず、「継続価値の公開実績は未着手」と残件報告する。
- コア導線修正は、会員記事公開を待たずに完了できる。

完了時:

- docs/handoffs/YYYY-MM-DD-note-membership-funnel-remediation.md に変更、実行コマンド、結果、ライブ実査、未実施を記録する。
- 変更したファイルだけを明示的にstageする。git add . と git add -Aは禁止。
- deploy、価格変更、定員変更、他資格修正、新商品作成を行わない。
- 最終報告は「サイト変更」「noteソース／ライブ反映」「検証結果」「未実施」の4点でまとめる。
- ソースだけ変更して完了扱いにしない。

次の場合は保存・公開せず停止して報告してください。

- accountがdobokunoteではない。
- join URLが404またはプラン非表示。
- 本文が空、異常に短い、二重化。
- 添付または有料／会員境界を維持できない。
- 試し読みラインの設置を確認できない。
- 更新通知を「いいえ」にできない。
- 新規会員記事の公開承認がない。

作業票の完了条件をすべて満たすまで進め、途中で質問しなくても安全に判断できるスコープ内の作業は自律的に完了してください。
```

