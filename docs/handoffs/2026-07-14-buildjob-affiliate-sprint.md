# 2026-07-14 BuildJob 収益最大化スプリント P0 実装ログ

対象: `docs/project/04_運営/09_BuildJob収益最大化スプリント.md` の P0（高意図 slug の BuildJob 優先表示＋カードコピー改善）

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/config/affiliate-creatives.ts` | `HIGH_INTENT_CAREER_SLUGS`（31 slug）・`isKensetsuJobsArmEffective()`・`resolveBuildJobCopy(slug)` を追加。`resolveCareerSidebarAbArm` / `resolveCareerArticleEndCard` / `resolveCareerTextLink` を実効 arm 判定に切替。`CareerTextLink` に `lead`（安心コピー）追加 |
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

## 未実施・次アクション

- **P1**: BuildJob 評判・比較記事 3 本の新規作成／既存キャリア記事上位 9 本の本文 CTA 文脈強化／note 無料 6 記事からの UTM 送客強化
- **P2**: BuildJob クリック集計レポート（GA4 `affiliate_cta_click` label 別週次）／9/1 以降の EPC 再配分判断
- **手動確認**: deploy は `/deploy` スキル経由でユーザー判断（本作業では未実施）。デプロイ後、高意図ページ（例 `/docs/civil-construction-1-guide-quit-or-stay`＝切替対象）のサイドバーが BuildJob になっていることを目視確認
- **計測上の注意**: 期間中は高意図 17 本が A/B 母集団から抜けるため、建設JOBs vs BuildJob の恒久 EPC 比較は低意図面のみで解釈する
