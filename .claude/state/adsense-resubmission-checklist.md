---
title: AdSense 再申請準備チェックリスト
updated: 2026-04-15
status: ready-for-user-action
---

# AdSense 再申請準備チェックリスト

Phase G-2 (74件) + Phase G-2 Polish (3件) + Phase G-3 採点 (50件) 完了時点。

## 1. 現在の品質状況

- **採点累計**: 140/644 件 (21.7%)
- **リライト完了**: 79 件 (Phase G-2 + Polish)
- **品質分布 (採点済み 140 件)**:
  - 3.00 (完全合格): **27 件**
  - 2.5-2.99: 57 件
  - 2.0-2.49: 10 件
  - < 2.0: 46 件 (G-3 で新発見、未リライト)

## 2. 次に検証が必要な項目 (doc 12 §5 最終チェックリスト)

### 自動で確認済み

- [x] Cloudflare Pages にデプロイ済 (main branch)
- [x] AuthorCard に執筆者・更新日表示 (lastRewrittenAt 連携)
- [x] Article schema の author / dateModified 対応済
- [x] OGP article:modified_time 対応済

### ユーザーによる手動確認が必要

- [ ] `published: true` の件数確認 (目標 130-140 件、現状未調整)
- [ ] 5 件スタブ非公開化の確認
- [ ] description 50 字未満ゼロ
- [ ] description 重複ゼロ
- [ ] About ページの著者プロフィール表示
- [ ] 独自エッセイ 3 本公開 (未作成)
- [ ] ガイド 7 件増量 (未実施)
- [ ] git log の test commit 整理 (5 件残存: 5a79687c, ddc38e31, 64c05943, 452fba80, eb76b18b)

### 外部サービスでの手動作業

- [ ] **GSC で sitemap.xml 再送信** (https://search.google.com/search-console)
- [ ] **GSC で改善ページの URL 検査 → 再インデックス申請** (下記 79 URL)
- [ ] Google 再クロール 3-7 日待機
- [ ] AdSense ダッシュボードで再申請送信

## 3. GSC 再インデックス対象 URL 一覧 (79 件)

Phase G-2 + Polish でリライトした全ページ:

```
https://doboku-note.com/docs/pe-comprehensive-management-accident-statistics
https://doboku-note.com/docs/pe-comprehensive-management-all-hazard-approach
https://doboku-note.com/docs/pe-comprehensive-management-alps-treated-water
https://doboku-note.com/docs/pe-comprehensive-management-balance-sheet
https://doboku-note.com/docs/pe-comprehensive-management-bathtub-curve
https://doboku-note.com/docs/pe-comprehensive-management-business-continuity-plan
https://doboku-note.com/docs/pe-comprehensive-management-cash-flow-statement
https://doboku-note.com/docs/pe-comprehensive-management-centralization-decentralization
https://doboku-note.com/docs/pe-comprehensive-management-cluster-analysis
https://doboku-note.com/docs/pe-comprehensive-management-common-criteria
https://doboku-note.com/docs/pe-comprehensive-management-copyright
https://doboku-note.com/docs/pe-comprehensive-management-correlation-analysis
https://doboku-note.com/docs/pe-comprehensive-management-data-cleansing
https://doboku-note.com/docs/pe-comprehensive-management-data-collection
https://doboku-note.com/docs/pe-comprehensive-management-data-mining
https://doboku-note.com/docs/pe-comprehensive-management-data-visualization
https://doboku-note.com/docs/pe-comprehensive-management-disclosure-request
https://doboku-note.com/docs/pe-comprehensive-management-disclosure-standards
https://doboku-note.com/docs/pe-comprehensive-management-dmz
https://doboku-note.com/docs/pe-comprehensive-management-doughnut-economics
https://doboku-note.com/docs/pe-comprehensive-management-ecrs-principle
https://doboku-note.com/docs/pe-comprehensive-management-edge-computing
https://doboku-note.com/docs/pe-comprehensive-management-emergency-info-processing
https://doboku-note.com/docs/pe-comprehensive-management-employment-insurance
https://doboku-note.com/docs/pe-comprehensive-management-encryption-digital-signature
https://doboku-note.com/docs/pe-comprehensive-management-environmental-basic-plan
https://doboku-note.com/docs/pe-comprehensive-management-firewall-ids
https://doboku-note.com/docs/pe-comprehensive-management-forests-villages-rivers-seas
https://doboku-note.com/docs/pe-comprehensive-management-fta
https://doboku-note.com/docs/pe-comprehensive-management-game-theory
https://doboku-note.com/docs/pe-comprehensive-management-generative-ai
https://doboku-note.com/docs/pe-comprehensive-management-ifrs
https://doboku-note.com/docs/pe-comprehensive-management-income-statement
https://doboku-note.com/docs/pe-comprehensive-management-industrial-property-rights
https://doboku-note.com/docs/pe-comprehensive-management-information-disclosure
https://doboku-note.com/docs/pe-comprehensive-management-ismap
https://doboku-note.com/docs/pe-comprehensive-management-isms-iso27001
https://doboku-note.com/docs/pe-comprehensive-management-iso-14000
https://doboku-note.com/docs/pe-comprehensive-management-jisec
https://doboku-note.com/docs/pe-comprehensive-management-job-grade-system
https://doboku-note.com/docs/pe-comprehensive-management-knowledge-sharing
https://doboku-note.com/docs/pe-comprehensive-management-kunming-montreal-framework
https://doboku-note.com/docs/pe-comprehensive-management-labor-standards-act
https://doboku-note.com/docs/pe-comprehensive-management-machinery-safety-guidelines
https://doboku-note.com/docs/pe-comprehensive-management-mobile-communication
https://doboku-note.com/docs/pe-comprehensive-management-monte-carlo-simulation
https://doboku-note.com/docs/pe-comprehensive-management-multi-factor-authentication
https://doboku-note.com/docs/pe-comprehensive-management-npv-net-present-value
https://doboku-note.com/docs/pe-comprehensive-management-occupational-disease
https://doboku-note.com/docs/pe-comprehensive-management-occupational-safety-act
https://doboku-note.com/docs/pe-comprehensive-management-oshms
https://doboku-note.com/docs/pe-comprehensive-management-ozone-layer-protection
https://doboku-note.com/docs/pe-comprehensive-management-pert-cpm
https://doboku-note.com/docs/pe-comprehensive-management-planetary-boundaries
https://doboku-note.com/docs/pe-comprehensive-management-prevention-activities
https://doboku-note.com/docs/pe-comprehensive-management-preventive-maintenance
https://doboku-note.com/docs/pe-comprehensive-management-process-planning-construction
https://doboku-note.com/docs/pe-comprehensive-management-product-safety
https://doboku-note.com/docs/pe-comprehensive-management-public-relations
https://doboku-note.com/docs/pe-comprehensive-management-recommendation-systems
https://doboku-note.com/docs/pe-comprehensive-management-reemployment-system
https://doboku-note.com/docs/pe-comprehensive-management-reliability-maintainability-design
https://doboku-note.com/docs/pe-comprehensive-management-right-to-know
https://doboku-note.com/docs/pe-comprehensive-management-rio-declaration
https://doboku-note.com/docs/pe-comprehensive-management-risk-assessment
https://doboku-note.com/docs/pe-comprehensive-management-safety-2-0
https://doboku-note.com/docs/pe-comprehensive-management-safety-health-education
https://doboku-note.com/docs/pe-comprehensive-management-safety-health-org-structure
https://doboku-note.com/docs/pe-comprehensive-management-safety-health-policy
https://doboku-note.com/docs/pe-comprehensive-management-sl-theory
https://doboku-note.com/docs/pe-comprehensive-management-stakeholder
https://doboku-note.com/docs/pe-comprehensive-management-survey-analysis
https://doboku-note.com/docs/pe-comprehensive-management-swot-analysis
https://doboku-note.com/docs/pe-comprehensive-management-system-reliability
https://doboku-note.com/docs/pe-comprehensive-management-tacit-knowledge
https://doboku-note.com/docs/pe-comprehensive-management-three-c-analysis
https://doboku-note.com/docs/pe-comprehensive-management-unconscious-bias
https://doboku-note.com/docs/pe-comprehensive-management-urban-flood
https://doboku-note.com/docs/pe-comprehensive-management-zero-trust
```

## 4. 判断ポイント

### 今すぐ再申請すべきか

**推奨: まだ早い**。理由:

1. **thin content がまだ多数残存**: Phase G-3 採点で新たに 46 件が weighted < 2.0 (参考資料セクション完全欠落が多発) と判明。このまま再申請すると前回と同じ「有用性の低いコンテンツ」判定を受ける可能性
2. **リライト件数不足**: doc 12 案 B では「弱い ~250 件のリライト」を想定。現状 79 件 (31.6%)
3. **test commit の未整理**: git log に `test` コミットが 5 件残存しており品質感を損なう

### 再申請前に必要な追加作業 (次フェーズ候補)

- **Phase G-4**: Phase G-3 の 46 件 (weighted < 2.0) を連続リライト
- **Phase G-5**: 残 504 件の採点継続 (Phase G-3 方式で 8件×waves)
- **独自エッセイ 3 本作成**: 技術士総監 2 次試験体験記など (運営者固有の独自価値)
- **test commit 整理**: git 履歴の `test` コミットをまとめて revert or squash

### 今できる最小限で再申請する case

もし「待てない」場合の最低ライン:
1. Phase G-3 の 46 件を `published: false` に一時変更 (案 A: hide)
2. GSC で 79 件を再インデックス申請
3. 3-7 日後 AdSense 再申請

この場合の懸念: 500+ keyword-2026 ハブのリンク切れリスク (doc 12 で撤回された戦略)

## 5. 結論

**次のアクション**:
1. (任意) Phase G-4 で weighted < 2.0 の 46 件をリライト
2. ユーザー手動: GSC で 79 件を再インデックス申請
3. ユーザー手動: About ページと独自エッセイを確認
4. 3-7 日待機
5. AdSense 再申請送信 (AdSense ダッシュボード UI)
