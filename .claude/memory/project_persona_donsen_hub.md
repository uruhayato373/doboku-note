---
name: project_persona_donsen_hub
description: 総監14ペルソナの導線ハブ整備完了(2026-06-12 develop)。サイトhub essay-persona-guide新規+note roadmap④を14ペルソナ化+クラスター是正+inboundリンク。note実公開とdeployが残。note側索引=既存roadmap更新（新規索引記事を作らない）
metadata: 
  node_type: memory
  type: project
  originSessionId: 4b25b4a2-8dd5-4521-bca2-cb00d577efb7
---

総監模範論文ペルソナを3→14に拡張したのに回遊性に未反映だった断層を解消（2026-06-12、develop コミット 0bf834231 + 18caf4fa8）。確定ロスター=14（受注者系4: ゼネコン/河川コンサル/道路橋梁コンサル/都市計画コンサル ＋ 自治体系10: 道路/河川/都市計画/下水道/上水道/港湾/砂防/公園緑地/技術基準/契約調達）。SoT=`src/lib/note-magazines.ts`。memory [[project_essay_persona_water_municipality]] の「農業農村/アセマネ」はマガジン化されておらずロスター外。

**実装した3層＋inbound**:
- (A) サイト新規ハブ `essay-persona-guide`（slug=pe-comprehensive-management-essay-persona-guide, guide_order:5）。立場×分野で14へ分岐するナビ層。Red Line #5順守でフル論文非掲載、MagazineCard 15枚。
- (B) **note側索引は既存ロードマップ記事「総監R08合格ロードマップ」(n3d73729e6cc7) の④節を14ペルソナ化**。9記事が既に送客中で発見性が即波及。
- (B') **note新規専用記事「立場別模範論文の選び方」**(docs/note/技術士総監/立場別模範論文の選び方/、noteStatus:draft、3点セット完成 commit 7f2ba210d)。ロードマップ＝カタログ角度に対し**立場診断・選び方角度**で差別化（Red Line #4＝同内容でも角度違いは両立可）。「同一角度の索引は重複だが、角度を変えた記事は別物としてOK」が判断基準。**公開はサイト(A) deploy後**（本文にハブURL含む＝先行公開で404）。
- (C) クラスター8本は多くが既にロードマップ送客済で、道路デフォルト断定の「公務員の総監学習設計」1本のみ是正。
- inbound: pattern-essay 3ページ＋essay-exam-strategy から (A) へ送客。road-municipality の「別属性のハブページ（順次追加予定）」プレースホルダを実リンクで充足。

**Red Line #6 区別（誤読防止）**: #6「サイトspoke固定3ペルソナ」はR8予想の縦串spoke規律。本ハブはナビ/索引層で#6対象外。これを根拠に予想spokeを増やすな。

**deploy 完了（2026-06-12）**: main=7f2ba210d へ ff昇格（checkoutせずorigin ref push、12コミット）。CI success、`.pages.dev` トップ200・新ハブ200描画 検証済。新ハブ本番ライブ。

**残（user/Mac側）**: (1) B/B'/Cのnote実公開（repoは更新済、note.com反映は note-edit-session=Mac。会社PCはプロキシでnote write不可。サイトdeploy済なのでB'のハブURL依存は解消） (2) ¥14,800パック再収録 (3) roadmapの他inline価格ドリフト（¥7,980/¥14,380相当は未監査、R8¥3,480のみ是正）。worklist=docs/handoffs/2026-06-12-note-persona-donsen-fixes.md

**トークン分業の実証**: Opus=設計spec/最終判断/監査決定、Sonnet=記事量産（A/B/C/inbound）、Fable=独立Review(PASS_WITH_NITS, id/URL取り違え0)。会社PCプロキシで稀に407でサブエージェント0トークン死→再投入で回復。note .md/MDX編集は `.claude/scripts/lib/mdx-io.mjs` の transformMdxFile/writeMdxFile でCRLF保持（Windows絶対パスimportは不可、相対import）。
