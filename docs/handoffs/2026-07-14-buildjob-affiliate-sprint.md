# 2026-07-14 BuildJob 収益最大化スプリント P0 実装ログ

対象: `docs/project/04_運営/09_BuildJob収益最大化スプリント.md` の P0（高意図 slug の BuildJob 優先表示＋カードコピー改善）

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/config/affiliate-creatives.ts` | `HIGH_INTENT_CAREER_SLUGS`（P0 時点 31 slug・後述 P1 で計 36 に増加）・`isKensetsuJobsArmEffective()`・`resolveBuildJobCopy(slug)` を追加。`resolveCareerSidebarAbArm` / `resolveCareerArticleEndCard` / `resolveCareerTextLink` を実効 arm 判定に切替。`CareerTextLink` に `lead`（安心コピー）追加 |
| `src/components/ui/MidArticleCta/MidArticleCta.tsx` | career モードに `lead?` prop を追加しリンク直前に安心コピーを表示 |
| `src/app/docs/[...slug]/page.tsx` | `careerMidLink.lead` を `MidArticleCta` へ渡す 1 行追加 |
| `docs/project/04_運営/02_アフィリエイト提携状況.md` | 「高意図キャリア slug の BuildJob 優先表示」節を追記 |
| `docs/project/04_運営/08_転職アフィリ記事ビルド計画.md` | 冒頭に 2026-07-14 実装ノート追記 |
| `docs/project/04_運営/09_BuildJob収益最大化スプリント.md` | 実装記録節を追記（新規ファイルとして同 commit で追跡開始） |

## 実装仕様（要点）

1. **BuildJob 優先表示**: キャンペーン中（`isCampaignActive()`＝〜2026-08-31 15:00 UTC）かつ高意図 slug のとき、建設JOBs arm（slug ハッシュ奇数）を無効化して BuildJob を返す。31 slug 中 **17 本が建設JOBs→BuildJob 切替**、14 本は元から BuildJob。切替 17 本は `resolveCareerTextLink` も null→BuildJob になり本文中間テキスト面が新規に出る。
2. **3 面一致**: サイドバー（PC・唯一のピクセル源）／モバイル記事末カード／本文中間テキストが同一の `isKensetsuJobsArmEffective()` を共有＝同一ページで案件が食い違わない。1 ページ 1 ピクセル維持（切替ページは KensetsuJobs ピクセル停止→BuildJob ピクセル発火に置き換わる）。
3. **自動復帰**: 9/1 以降は `isCampaignActive()`=false で全面が通常の slug ハッシュ A/B（GKS/建設JOBs）へ復帰。コード削除不要。
4. **コピー改善**（`resolveBuildJobCopy`）:
   - description（安心コピー内蔵・全カード共通）: 「今すぐ転職すると決めていなくても、資格・経験で狙える求人や年収相場を無料キャリア面談で確認できます。」
   - CTA テーマ別: quit→「辞める前に、外で評価される条件を確認する」／salary・allowance・market-value→「今の年収で損していないか確認する」／resume・interview→「職務経歴書・面接対策を無料で相談する」／hatchu-shien・consultant・public-servant→「発注者支援・別職種の選択肢を相談する」／white-company・job-reality・timing→「残業・休日条件のよい求人を相談する」／women・young・haken-seishain・age-career→「年齢・経歴に合う求人を無料で聞く」／既定→「資格・経験で狙える求人を無料で聞く」
   - `CareerAffiliate program="gks"`（inline 163 枚・slug 不明）は既定 CTA＋新 description が自動反映。
   - BuildJob 公式数値（年収アップ平均 163 万円等）は保証表現・LP 更新リスク回避のため**カードに入れていない**（使う場合は「サービス公表値」明記が 09 の条件）。
   - GA4 ラベル継続性: `data-cta-label="ビルドジョブ"`・`BuildJob-sidebar/-midtext/-hubcareer` は不変。
5. **不変を確認した面**: pe-comprehensive-management（総監）＝PE_CONSULTING 維持／カテゴリ hub の建設JOBs＋BuildJob 並置（harvest）維持／学習 intent ページの note CTA 序列に変更なし／MDX は 1 行も変更なし（mat 直書きなし）。

## 検証結果（2026-07-14）

| コマンド | 結果 |
|---|---|
| `npm run check-affiliate-mats` | ✓ 1308 ファイル全許可リスト内 |
| `npm run check-affiliate-prose` | ✓ 廃止アフィリ prose なし |
| `npm run check-cta-density` | ✓ 1064 ページ閾値内 |
| `npm run lint` | ✓ |
| `npm run type-check` | ✓ |
| `npm run build` | ✓（本番ビルド成功） |

MDX 変更なしのため refresh-indexes / ogp / validate-mdx は対象外。

## P1/P2 実装（同日追加・Opus）

### P1: 新規記事 3 本（civil-construction-1・guide・career・published:true）

| slug | 位置づけ | 本文字数 | CTA |
|---|---|--:|---|
| `guide-buildjob-review` | ビルドジョブ指名検索の受け皿（向く人/向かない人を正直に併記） | 3,174 | BuildJob（既定） |
| `guide-career-agent-comparison` | 比較検索の受け皿（特化型/求人サイト/総合型を軸で公平比較） | 3,210 | BuildJob（既定） |
| `guide-career-consultation-before-quit` | 辞める前顕在層（求人相場/年収/働き方の確認手順） | 3,154 | BuildJob（「辞める前に」テーマ CTA） |

- 3 slug を `HIGH_INTENT_CAREER_SLUGS` に追加 → SSG 出力で建設JOBs mat=0・BuildJob mat 検出・pixel `<img>` 各 1・`rel="nofollow sponsored noopener"`・PR バッジ確認済み。
- BuildJob の具体数値（163万/50,529人/4.8/77% 等）は当初カード/本文に入れたが、後述「ファクトチェック是正」で**全削除→定性記述に統一**（現行公式値との不一致・裏取り不能のため）。「向かない人」（未経験・地方求人・都市部中心）は正直に記載。
- 年収・担い手不足（29歳以下 約12%）統計は doc 08 検証済みファクトパック由来だが、job tag 年収は現行に合わせ「600万円台」に是正・ピーク720万/全国平均460万の出典混同も是正（後述の是正表参照）。
- `guide-career-agent-comparison` は既存 `guide-career-agents`（選び方の枠組み）と角度差別化（具体サービス比較）＋相互リンク（keep-differentiate-not-delete）。
- OGP 生成済み（`npm run ogp <slug>`）・`refresh-indexes` 実行済み・`validate-mdx` / `check-ogp-coverage` / `check-links`（新規3記事に壊れリンクなし）通過。

### P1: note 送客強化（UTM インラインリンク 1 本ずつ追加・大量リライトなし）

- `転職エージェントの使い方-無料` → `guide-career-agent-comparison`（utm_content=agent-comparison）
- `転職した方がいい施工管理-発注者視点-無料` → `guide-career-consultation-before-quit`（utm_content=before-quit）
- `転職のベストタイミング-無料` → `guide-career-consultation-before-quit`（utm_content=before-quit）
- note-lint 通過。既存 UTM パターン（doboku-note.com/docs/...?utm_source=note...）を踏襲。

### P2: BuildJob クリック集計レポート

- `npm run report-buildjob-affiliate`（`.claude/scripts/report-buildjob-affiliate.mjs`）新設。オフライン集計。
- 出力: `.claude/state/metrics/affiliate/buildjob-report-latest.md`（プログラム別クリック・BuildJob 面別内訳・上位ページ・推定 EPC）。
- **当初「未登録ブロッカー」と報告→訂正（2026-07-14・ユーザーの GA4 画面で確認）**: `event_label` カスタムディメンションは「CTA label」として **2026-07-07 に登録済み**（パラメータ名 `event_label`・実装 `gtag.ts` と一致）。既存 by-label スナップショット（期間 06-11〜07-08）が `(not set)` だったのは、取得期間の大半が登録日 07-07 より前で**カスタムディメンションが遡及しない**ため。**追加の GA4 設定は不要**。deploy 後にクリックが溜まり、07-07 以降を含む期間で `fetch-ga4-cta-clicks --by-label` を取り直せば面別に分解される。レポートスクリプトの警告文言も実態に合わせ修正済み。

### P1「既存記事の本文文脈強化」を見送った理由

- 安心コピー（「今すぐ転職すると決めていなくても〜」）は `resolveBuildJobCopy` の description と `resolveCareerTextLink.lead` により、全 career カード/中間テキストにコード側で自動反映される。
- 既存キャリア記事の多くは inline `CareerAffiliate program="gks"` を持ち、そのコピーも同 resolver で BuildJob 新コピーに統一される。
- したがって個別 MDX の手編集は不要（制約「大量リライト禁止」とも整合）。テーマ別 CTA も slug 一致で自動適用。

## 2026-07-14 ファクトチェック是正（guide-fact-checker 検出→修正）

新規 3 記事に `guide-fact-checker` を実施し、5 件の suspicious / 2 件の unverifiable を検出。景表法・ステマ規制リスクのある数値を是正（是正後も 3 記事とも本文 3,000 字以上を維持）。

| 検出 | 元の記載 | 是正後 |
|---|---|---|
| BuildJob 年収アップ平均 | 163万円（サービス公表値） | 具体数値を削除・定性記述（「実績値は公式サイトで確認」）。第三者引用の現行値は 124万円で不一致のため |
| BuildJob 累計支援数 | 50,529人 | 削除（現行公式「2万名以上」・50,529 は裏取り不能） |
| BuildJob 利用者満足度 | 4.8以上 | 削除（どの情報源でも確認できず＝unverifiable） |
| job tag 平均年収 | 約600万円 | 「600万円台」（現行 job tag は約625万円・令和7年）に統一 |
| job tag ピーク | 50〜54歳 約720万円 | 削除（unverifiable）→「40〜50代にかけて上がる傾向」に軟化 |
| 全国平均460万の出典混同 | job tag のデータとして紐づけ | 「国税庁 民間給与実態統計調査」と正しく再帰属 |
| 建設業 29歳以下 約12% | （検証済み VERIFIED） | 維持 |

- 企画時メモ（doc 09 §外部調査メモ）の数値も公開流用しないよう doc 09 に warning 追記。
- **教訓**: 検証済みファクトパック（doc 08）の再利用でも、年度更新（job tag 600→625）や企画メモの LP 版差（BuildJob 163→124）で陳腐化する。ガイド新規公開前は `guide-fact-checker` を必ず通す（memory `factcheck-guide-facts-required`）。

## 2026-07-14 civil-2 版 指名/比較記事を追加（ユーザー指示）

civil-1 の指名/比較記事に対応する civil-2 版を 2 本新設。**2級読者は未経験/若手が中心**のため、civil-1（経験者前提）とは角度を差別化し、BuildJob が経験者寄りである点を正直に扱った。

| slug | 角度 | 本文字数 |
|---|---|--:|
| `civil-construction-2-guide-career-agent-comparison` | 経験の有無で使い分け（未経験/若手→若手特化・2級＋経験→建設特化・まず眺める→求人サイト） | 3,059 |
| `civil-construction-2-guide-buildjob-review` | 2級・経験浅めでビルドジョブは使えるか（経験者寄りを正直に・完全未経験は若手特化と併用） | 3,074 |

- 2 slug を `HIGH_INTENT_CAREER_SLUGS` に追加（campaign 中 BuildJob 固定・本文は経験段階で正直に出し分け）。
- civil-1 版と相互リンク（RelatedKeywords）で束ねた。既存 civil-2 career 記事（career-change/young-career/haken-seishain/salary/resume）とも相互リンク。
- **fact-check（guide-fact-checker）: suspicious 0 / unverifiable 1**。civil-1 の教訓を反映し具体数値（163万/50,529人/4.8 等）は最初から不掲載＝定性記述に統一。定性主張（経験者寄り・都市部中心・建設特化・2級=主任技術者の入口）は全て VERIFIED。unverifiable だった「専任アドバイザー」の語は civil-1/2 の buildjob-review 両方で「建設業界に詳しいアドバイザー」に軟化（断定回避）。
- OGP 生成済み・refresh-indexes・validate-mdx（1111件）・check-guide-length（112件全3,000字以上）・check-ogp-coverage・affiliate3種・type-check・lint 全通過。

## 完了済み（2026-07-14・本セッション）

- **P0/P1/P2 実装＋ファクトチェック是正＋GA4 誤診訂正＋doc-sync 是正**：完了・commit 済み。
- **本番デプロイ完了**：`git push origin develop:main`（FF・作業ツリー非接触）で develop→main、Cloudflare Pages CI 成功。本番で新規5記事 HTTP 200・高意図ページで BuildJob mat 発火／建設JOBs mat=0 を curl 検証済み。origin/main = 3932bb671。
- **note→サイト送客強化（SoT 完成）**：note キャリア8本すべてが新高意図サイト記事へリンク（うち5本を本セッションで追加）。

## 🔴 別PCで実施するタスク（note.com 再push・手動ゲート）

**下記5本の note 記事は SoT（`docs/note/**`）を更新済みだが、live の note.com 本文は旧内容のまま。** サイト送客リンクを反映するには、note ログイン済みの別PCで `npm run note-update-body`（Playwright）で再push が必要。**まず `git pull origin develop` で本コミット（f902d6fa2）を取得してから実行すること。**

| note 記事（`docs/note/1級・2級土木/…-無料/`） | 追加した送客先 |
|---|---|
| 1級土木で市場価値が変わる | civil-construction-1-guide-career-agent-comparison |
| 年収を上げる人の違い | civil-construction-1-guide-career-agent-comparison |
| ホワイトな建設会社の見分け方 | civil-construction-1-guide-career-consultation-before-quit |
| 公務員土木か民間か | civil-construction-1-guide-career-consultation-before-quit |
| 施工管理の失敗談と教訓 | civil-construction-1-guide-career-consultation-before-quit |

- 再push の罠は memory `note-update-body-gotchas`（複数行 blockquote 脱落等）を参照。今回の追加は既存段落末尾への1文インラインリンクのみ＝低リスク。
- 追加リンクは UTM `utm_medium=referral`。リンク先はサイト側デプロイ済み（本番200確認済み）なので、再push すれば即 live 動線になる。
- **site デプロイは不要**（note SoT は doboku-note.com のビルド対象外＝note.com にのみ住む）。

## 🟡 戦略転換：note ドメインパワー活用（note 記事作成タスク・2026-07-14 ユーザー指示）

**方針変更**: これまで「note=送客層／サイト=着地・カニバリ回避」としていたが、**ユーザー判断で「カニバリよりも note のドメインパワーを優先活用する」方向へ転換**。note.com は DA が高く新規サイトページより早く上位化しやすいため、BuildJob/キャリア系の指名・比較・顕在クエリを **note 記事自体でも取りに行く**（多少のサイトとの共食いは許容）。

### 作成する note 記事（候補・すべて `docs/note/1級・2級土木/` 配下・notePricing:free）

サイトの高意図記事に対応する note 版を作る（note ネイティブの発注者/合格者ボイスで執筆）:

| note 新記事（案） | 狙うクエリ | 対応するサイト記事（相互リンク） |
|---|---|---|
| ビルドジョブの評判（元自治体土木=発注者目線） | 「ビルドジョブ 評判」指名 | civil-construction-1-guide-buildjob-review |
| 施工管理 転職エージェント おすすめ比較 | 「施工管理 転職エージェント おすすめ」比較 | civil-construction-1-guide-career-agent-comparison |
| 施工管理を辞める前に確認すること | 「施工管理 辞める」顕在 | civil-construction-1-guide-career-consultation-before-quit |

### 制約（必ず守る）

- **数値は載せない**: BuildJob の「163万/50,529人/4.8」は fact-check で不一致・裏取り不能と判定済み（§外部調査メモ warning）。note 記事でも具体数値は使わず定性記述。公開前に `guide-fact-checker` 相当の照合を通す。
- **note はコンポーネント非対応** → BuildJob は生 A8 リンク（**note 専用 mat `4B5OO5+FHBA2+5B0Y+NTJWY`**＝既存8本と同じ）。**PR 表記必須**（「**PR**：以下はアフィリエイト広告を含みます。」既存パターン踏襲）。
- **note 有料商品（学習意図＝経験記述/模範論文）とはカニバらない**: 今回はキャリア意図なので財布が別＝OK。学習意図の note 有料をキャリア記事から侵食しないこと。
- **note↔サイト相互リンク**で権威を渡し合う（純粋な競合でなく、note が上位化→サイトへ送客／サイトが note へ被リンク）。UTM は `utm_medium=referral`。
- **公開は手動ゲート**: ドラフトは `docs/note/**` に作成（このPCで可）→ push →**別PCで `npm run note-publish`（新規）/ `note-update-body`（既存）で note.com へ投稿**（note ログイン済み環境）。
- **SSOT 更新**: 実際に作成・公開したら、`docs/project/04_運営/08_転職アフィリ記事ビルド計画.md` §note 記事（現 N1〜N6）と `02_アフィリエイト提携状況.md` に追記して戦略転換を反映（この転換は現状ハンドオフのみ記録＝doc 08/02 はまだ旧「送客一本」前提）。

### 進め方（次セッション）

1. まず既存8本の note キャリア記事（発注者ボイス資産）と重複しない角度を確認（`docs/note/1級・2級土木/*-無料/`）。
2. 上記3案を `docs/note/1級・2級土木/{テーマ}-無料/article.md` で執筆（free・draft）。cover frontmatter も付ける。
3. `guide-fact-checker` 相当で数値照合 → PR 表記・生 mat NTJWY・UTM referral を確認 → note-lint。
4. push → 別PCで note.com 投稿。投稿後 `verify-note-status` で SoT と突合。

## 残りの次アクション（時間差）

- **A8 成果の月末入力**：`.claude/state/metrics/affiliate/a8-results.json` に BuildJob/建設JOBs の成果を手入力すると `npm run report-buildjob-affiliate` で EPC が出る（A8 は API 無し）。
- **GA4 面別クリック**：event_label は登録済み（2026-07-07）。deploy 後クリックが溜まったら `npm run fetch-ga4-cta-clicks -- --by-label`（07-07 以降を含む期間）→ `report-buildjob-affiliate` で面別内訳。
- **9/1 以降**：最初の本番再ビルドで `isCampaignActive()`=false → 高意図 slug が slug ハッシュ A/B（GKS/建設JOBs）へ自動復帰。EPC 実績で再配分判断。
- **計測上の注意**：期間中は高意図 slug が A/B 母集団から抜けるため、建設JOBs vs BuildJob の恒久 EPC 比較は低意図面・hub のみで解釈する。
- **別セッションのデザイン刷新**：本作業ツリーに未コミットで進行中（Soft Editorial）。担当セッションがコミット後、同じ FF push でデプロイ可能。本セッションは非接触。
