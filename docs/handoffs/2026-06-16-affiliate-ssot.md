# ハンドオフ: ビルドジョブ追加＋アフィリエイト SSOT 整備（PR #253）

- 日付: 2026-06-16
- ブランチ: `feat/buildjob-sidebar-aff`（PR #253・`develop` ベース・**未マージ**）
- 真実源（重複記載しない・ここはポインタ）: `docs/project/04_運営/02_アフィリエイト提携状況.md`（現状サマリ 2026-06-16）/ memory `project_affiliate_mat_ssot`

## 要約

建設業界特化の転職エージェント「ビルドジョブ」を、全 docs サイドバーの転職枠に**期間限定**で投入（〜2026-08-31 は無料面談 ¥50,000＝GKS ¥25,000 の 2 倍）。同カテゴリでカニバるため**並置せず単独切替**、9/1 以降は GKS に自動復帰。あわせてアフィリエイト SSOT を整備（mat レジストリ＋機械ゲート＋台帳再同期＋MDX 完全脱直書き）。

## PR #253 のコミット（6 本）

1. `756db72` サイドバー転職枠を `resolveCareerSidebarAd()` で期間切替（〜8/31 ビルドジョブ / 9-01 GKS 自動復帰）
2. `33a8f21` 収益カバレッジ `report-monetization-coverage.mts` のサイドバーラベル追従＋台帳「2件→4件」
3. `bee34fe` `src/config/affiliate-mats.json`（mat SSOT 8 種）＋ `scripts/check-affiliate-mats.mjs` lint ＋台帳再同期（`SAT_SIDEBAR_AD` 撤去・GKS 全 docs 化・GKS ドメイン是正）＋計測ラベル命名規約
4. `184520c` GKS mat を約 90 MDX から脱直書き（`<CareerAffiliate program="gks">`）
5. `56713b1` 独学(12)・SAT(1) も脱直書き（`CourseAffiliate program` / 新規 `DokugakuKeikenLink`）＋ MDX 生 mat=ERROR を機械強制

## 検証済み

`npm run type-check` 緑 / `check-affiliate-mats` 緑（既知 8/8・MDX 生 mat 0・未登録 0）/ pre-commit（MDX + component）OK / 混在 EOL 0。**本番 build は未実行**＝CI（権威ゲート）で確認。

## 次アクション（ユーザー判断）

> [!note]
> ビルドジョブ ¥50,000 は **8/31 まで**。本番反映はデプロイ後なので、効かせるなら早めにマージ→デプロイ。

1. PR #253 を `develop` マージ → `/deploy` で `main`
2. lint ゲート有効化: 各環境で `npm run pre-commit:install`（**現状 CI 未組込**＝真のゲートにするなら `.github/workflows` に `npm run check-affiliate-mats` 追加）
3. 9/1 の GKS 自動復帰は日付ゲート（SSG 再ビルドで反映）＋ lint の失効 WARN がバックアップ
4. 新規コンポーネント `DokugakuKeikenLink` の本番描画は CI build で最終確認

## 未実装（任意・トリガー時に実施）

- **`affiliate-courses.json` 完全一元化**: 全 creative の実体（href/imageSrc/pixelSrc/expiresAt）を 1 ファイルに集約し、各コンポーネント・`page.tsx` はそこを参照、lint 許可リストも自動導出（`affiliate-mats.json` との二重管理を解消）。現状は creative がコンポーネント／config に分散（各 1 箇所・重複なし）で運用可。**トリガー＝講座案件 5 件以上 or JSON 管理に移行したくなったとき**（詳細は 02 台帳「再検討トリガー #1」）。
- インライン `DokugakuKeikenLink` は PR バッジ非表示（元の生リンク挙動を保存）。文中リンクへの PR 表示付与は別途デザイン判断。
