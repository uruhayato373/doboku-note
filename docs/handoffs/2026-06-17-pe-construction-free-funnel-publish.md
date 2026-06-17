# ハンドオフ: 技術士建設部門 無料ファネル記事 公開準備＋note予約投稿ツール

- 日付: 2026-06-17
- ブランチ: `develop`（全コミット push 済み・別PCは `git pull` で同期）
- 真実源（ポインタ・重複記載しない）: memory `project_pe_construction_note_funnel` / `feedback_mokuji_index_cta_format` / `project_note_write_automation`
- 関連 doc: `docs/reference/note-funnel-architecture.md` / `docs/reference/content-principles.md` §14-c

## 要約

技術士建設部門の **note 導線（L2もくじ + 無料入口記事）を公開品質まで仕上げ、予約投稿ツールを実装**した。
無料記事 **16本が公開準備完了**（カバー・ハッシュタグ96・note-lint・内容QA 済）。残りは **note への実公開**（時間ずらし予約投稿）と **もくじの無料セクションのリンク化→再公開**。
重複していた論点記事の **B系統6本は hold（未公開・repo残置）**。

> [!note] 状態
> 作業ツリー clean・`develop` と `origin/develop` 完全同期・このセッションの4コミットは全て push 済み。

## このセッションのコミット（develop, push 済み）

1. `b072c4561` 建設部門もくじ最新化（有料8→12本・「順次公開予定」削除）＋無料セクション16本構造化＋科目連動2本是正（河川海岸→河川砂防mag／都市計画→都市計画mag・陳腐化コピー除去）＋もくじ index 書式の**系統修正**（`check-note-magazine-cta` を「index は markdownリンク許容／価格¥は禁止」に小改修・3もくじ+L1総合案内から¥48箇所削除・§14-c に例外明文化・既存§14-b太字括弧9件是正）
2. `4003af1d7` 無料16本のハッシュタグを各96個に拡充（記事固有保持＋共通プール＋トピック別マージ・LF・重複0）
3. `7992f4fc3` 内容QA反映の確定修正4件（スケジュール3→4ステップ／テンプレ「応用能力」→「問題解決能力」／必須I使い方「マネジメント」追加／書き分け「文化的価値の尊重」追加）
4. `c7e4a9e4a` note予約投稿（時間ずらし）対応を browser 自動化に追加

## 確定した公開セット＝無料16本（もくじ順）

マニフェスト: `.claude/state/note-publish/pe-construction-free-16.txt`

- 勉強の進め方(3): 建設部門二次の勉強法／勉強時間とスケジュール／建設部門二次の難易度と合格率
- 答案の書き方(4): 業務経歴票の書き方／選択科目II-1・II-2・IIIの書き分け／答案構成のテンプレート／必須科目I解答例の使い方
- 選択科目キーワード(3): 道路／河川海岸／都市計画 の論文キーワード
- 必須I論点 A系統(6): 防災・国土強靱化／担い手確保と生産性向上／カーボンニュートラルとGX／インフラ老朽化と維持管理／国土形成と地域づくり／建設DXとi-Construction の論点

> [!warning] B系統6本は hold（公開しない）
> 「〜の論点キーワード」6本（社会資本整備／持続可能な地域づくり／インフラ維持管理・更新／防災・減災／担い手・DX／低炭素・環境保全）は A系統と重複のため**未公開で repo 残置**。マニフェストから意図的に除外済み。広域 glob で publish すると拾ってしまうので**必ず `--list` で公開**すること。

## 公開品質の検証結果（16本）

- カバー: 16/16 `img/cover.png` 1280×670 生成済
- ハッシュタグ: 各96個（note上限99・LF・重複0）
- note-lint: 16/16 OK（表なし・段落長・リンクカード・文字化けなし）
- 内容QA: 事実密集9本=外部一次情報照合で **must_fix 0**（数値・法令・年度すべて整合）。メタ7本=確定修正4件反映済。可変情報（R8筆記7/20・建設部門合格率9.8%・受験手数料20,500円・業務詳細720字）は WebSearch で現行公式一致を確認済。
- 任意の残 minor（非ゲート・公開可）: 流域治水「復興」脱落／グリーンインフラ「全面改定」等の表現精度のみ。

## 残作業（別PCで続行）

> [!todo] 公開フロー
> 1. **（推奨）予約投稿UIの初回検証**: 1本だけ `--schedule` 実走し `.tmp/np-sched-*.png` で実UIと selector を突合（後述の未検証点）。安全弁で誤公開はしない。
> 2. **無料16本を予約投稿**（時間ずらし）→ 各 noteUrl/noteId/notePublishedAt が frontmatter に自動 writeback される
> 3. **もくじ無料セクションをリンク化**: 現在はプレーン表記＋HTMLコメント `<!-- 無料記事リスト(16本)... -->` でマーク。公開後に各記事タイトルを noteUrl でリンク化
> 4. **もくじ再公開**（`note-publish --update` 系／公開済み記事の更新）
> 5. `npm run audit-note-funnel` でドリフトゼロ確認

### 公開コマンド（1日1本 07:00 JST から予約投稿）

```bash
# DRY（割当確認・--commit なし）
node scripts/note-publish-magazine.mjs \
  --list .claude/state/note-publish/pe-construction-free-16.txt \
  --schedule-start 2026-06-20T07:00 --interval-hours 24

# 実行（予約投稿）: --commit を付ける
node scripts/note-publish-magazine.mjs \
  --list .claude/state/note-publish/pe-construction-free-16.txt \
  --schedule-start 2026-06-20T07:00 --interval-hours 24 --commit

# 単記事だけ試す
node scripts/note-publish.mjs --article "docs/note/技術士建設部門/建設部門二次の勉強法/article.md" --commit --schedule 2026-06-20T07:00
```

## 別PCでの前提・注意

> [!warning] 別PC セットアップ
> - `git pull`（develop）で同期。
> - **note ログインプロファイル `.local/playwright-note-profile` は git 管理外（local）**。別PCでは初回に手動ログインが必要（`note-publish.mjs` は永続プロファイル方式。memory `project_note_write_automation` 参照）。
> - 会社PCはプロキシで外部API遮断だが、`note-publish.mjs` は `channel:'chrome'＋ignoreHTTPSErrors＋proxy` でプロキシ越え対応（Windows可）。`HTTPS_PROXY`/`HTTP_PROXY` 環境変数を設定すること。
> - 安全弁: `note-publish.mjs` は既定 draft、`--commit` でのみ公開。account=dobokunote を assert。

> [!warning] 予約投稿 UI selector は未実走検証
> `--schedule` の予約投稿フロー（日時設定→日付→時刻→「予約投稿」）の **Playwright selector は `scheduling.md` 由来で初回ライブ未実走**。初回 `--schedule` 実行で `.tmp/np-sched-{open,datetime,abort,done}.png` を残すので実UIと突合し、必要なら `scripts/note-publish.mjs` step12 の予約投稿分岐（`日時を指定して公開` 等のラベル候補、カレンダー aria-label、`予約投稿` ボタン名）を調整する。**日時をUIで確定できないときは即時公開せず下書きに退避**する安全弁つき＝合わなくても誤公開しない。

## 触ってはいけない/注意

- もくじ index（`noteSeries: 総合案内`）はマガジン **markdownリンク列挙OK・価格¥は禁止**（`check-note-magazine-cta` が例外化済）。新規もくじ編集時に価格を書かないこと。
- note 記事（`docs/note/**`）は **CRLF**。一括編集は CRLF 保持の python（LF正規化→置換→CRLF復元）で行う。直接 writeFileSync の CRLF 混在は pre-commit reject。
- `git add` は変更ファイルのみ明示（並行セッションの巻き込み防止）。
