---
title: 2026-05-19 R8 予想問題 spoke 固定 4 ペルソナ化セッション
date: 2026-05-19
session_focus: r8-essay-theme-* 9 本の動的ペルソナを試験本質に沿った固定 4 ペルソナに統一、リファレンス整備と配線変更
related_strategy: docs/note/noteコンテンツ計画.md (Red Line #8)
related_principle: docs/reference/content-principles.md §21（新設）
related_plan: docs/project/02_コンテンツ/06_R8記述式予測フロー.md
---

# 2026-05-19 セッション引き継ぎ — R8 spoke 固定 4 ペルソナ化

## 1. 何が起きたか

R8 予想問題 spoke 9 本のペルソナ構成を「テーマ別に最適 4 ペルソナを動的選定する」設計から「固定 4 ペルソナ（ゼネコン / 河川コンサル / 環境調査 / 道路発注者）で全テーマを縦串展開する」設計に統一した。総監試験本質「テーマ不明 → 自分のペルソナで全テーマ対応」との整合と、note magazine M3/M5-M8 との接続改善が目的。関連リファレンス（content-principles §21 新設、Red Line #8 拡張、予測フロー更新、placement 配線、lint カテゴリ 13）も同時整備。

## 2. 経緯と問題発見

### 2.1 当初の構造（撤回対象）

各 spoke で「テーマ別に最適なペルソナ」を H3 化していた:

| spoke | 旧 4 ペルソナ構成（テーマ別動的選定） |
|---|---|
| climate-adaptation | 河川コンサル / 環境調査 / ゼネコン / 自治体発注者 |
| disaster-recovery | 河川コンサル / ゼネコン / 自治体発注者 / 防災コンサル |
| circular-economy | 環境調査 / ゼネコン / 製造業（素材・部材系）/ 自治体発注者 |
| aging-society | 自治体発注者 / 社会保障コンサル / 建設コンサル地方拠点 / ゼネコン地方労務 |
| labor-shortage | ゼネコン / 自治体発注者 / 建設コンサル / 製造業（自動化技術）|
| infrastructure-maintenance | 自治体発注者 / 建設コンサル（点検）/ ゼネコン（補修施工）/ インフラ運営会社 |
| gx-energy-security | エネルギー会社 / 製造業（素材）/ ゼネコン（再エネ施工）/ 自治体発注者 |
| ai-governance | 製造業（情報・電気系）/ 建設コンサル / 自治体発注者 / IT サービス会社 |
| economic-security | 製造業（素材）/ ゼネコン（建設資材調達）/ 自治体発注者（公共調達）/ 商社・物流 |

### 2.2 試験本質との不整合の発見

- 総監記述式は「テーマは試験当日まで不明 → 受験者は自分のペルソナを固定して全テーマに対応する」が本質
- spoke が動的ペルソナだと、製造業の受験者は「経済安保 / GX / AI ガバナンス spoke」のみ自分向けと判断、「気候変動 / 災害復旧 / 老朽化」では離脱
- 結果として、受験者が「自分のペルソナで全 9 テーマを縦串学習する」訓練が成立しない

加えて、note magazine M3「R8 予想問題集」¥2,480 と M5-M8「総監模範論文 ¥1,980 × 4」は既に固定 4 ペルソナ（ゼネコン / 河川コンサル / 環境調査 / 道路発注者）で構築されており、spoke ↔ note の接続も不整合だった。

### 2.3 意思決定: 固定 4 ペルソナ統一（2026-05-19 採択）

採用方針:
- spoke 9 本すべてで固定 4 ペルソナを縦串展開
- 主軸/副軸の区別は撤廃して 4 ペルソナ並列扱い
- 業界外（製造業・エネルギー・IT 等）の受験者は spoke 末尾「業界外受験者へのアレンジ」段落で 1 行マッピング、note M4「3D マトリクス 400 セル」¥2,980 へ深掘り送客

## 3. 4 ペルソナの正準表記（真実源）

| spoke H3 表記 | プロフィール（H3 直下 1 行目に括弧書きで添える）| 対応 magazine ID |
|---|---|---|
| `### ゼネコン` | 大手ゼネコン土木支店工事部長クラス | `essay-general-contractor-magazine` |
| `### 河川コンサル` | 中堅建設コンサル河川・砂防部門部長クラス | `essay-river-consultant-magazine` |
| `### 環境調査` | 中小規模の環境調査会社部長クラス | `essay-environment-survey-magazine` |
| `### 道路発注者` | 地方公共団体・道路担当課長クラス | `essay-road-municipality-magazine` |

ペルソナ表記は `src/lib/note-magazines.ts` の shortTitle と完全一致。

## 4. 影響範囲

| 対象 | ファイル | 変更種別 |
|---|---|---|
| 原則（真実源） | `docs/reference/content-principles.md` | §21 新設（固定 4 ペルソナ化規定） |
| 戦略 | `docs/note/noteコンテンツ計画.md` | Red Line #8 末尾追記（動的ペルソナ禁止 + M4 救済） |
| 設計 | `docs/project/02_コンテンツ/06_R8記述式予測フロー.md` | Stage 2/3 + §3 表に「固定」「ペルソナ責任」追記 |
| 配線 | `src/lib/magazine-placement.ts` | case 2.5 追加（r8-essay-theme-* → M3 inline + M4 inline、M3 sidebar）|
| 機械検知 | `.claude/scripts/lint-mdx-mobile.mjs` | カテゴリ 13 新設（13-1 / 13-2 MEDIUM）|
| spoke 本体 | `.local/r2/posts/pe-comprehensive-management/r8-essay-theme-*/article.mdx` (9 本) | 冒頭リード 1 段落追加 + ペルソナ別 H2 全書き換え + 業界外救済 H3 新設 + 末尾 CTA 二段化 + FAQ 内旧表記修正 |
| ハンドオフ | `docs/handoffs/2026-05-19-spoke-fixed-persona-unification.md` | 新規作成（本ファイル） |

## 5. T4「少子高齢化」処理判断（案 A 採用）

T4 は他 spoke と全く異なる旧ペルソナ構成（自治体発注者 / 社会保障コンサル / 建設コンサル地方拠点 / ゼネコン地方労務）で、固定 4 ペルソナへの統一が最も難しいテーマだった。

検討した 3 案:
- **案 A 採用**: 厳密に固定 4 ペルソナ適用。「河川コンサル × 少子高齢化」「環境調査 × 少子高齢化」も「業務テーマ × 組織人事マネジメント × 社会保障」の 3 軸交差で書き切る
- 案 B: T4 のみ例外化（旧 4 ペルソナ維持）
- 案 C: T4 で 4 ペルソナの管理対象を re-define（ゼネコン → ゼネコン地方労務等）

採用理由:
- ユーザー明示方針「どんなテーマでも答えることが求められるのが総監試験」と整合
- T4 のみ例外化すると 9 spoke の縦串学習が成立しない（受験者が表で比較する時の認知負荷が増える）
- spoke 内導入文で「本テーマは建設業ペルソナでは『業務テーマ × 組織人事マネジメント × 社会保障』の 3 軸交差で組み立てます」を予告

書きにくいセルの緩和: T4 は 1 マス文字数を 180-260 字 → 220-280 字に許容。組織人事マネジメント軸を共通基盤として活用。

## 6. 業界外救済の M4 経路

4 ペルソナに該当しない業界（製造業・IT・エネルギー・商社・社会保障等）の受験者向け:

- spoke 末尾に `### 業界外受験者（製造業・エネルギー・IT 等）へのアレンジ` セクション（200-280 字）を新設
- 「自業務 → 4 ペルソナのどれに対応」のマッピング 1 行を spoke 内で示す
- T7 GX / T8 AI / T9 経済安保は「自業務がそのまま中核論点」と書き分け
- 深掘りは note M4「解答テンプレ 3D マトリクス」¥2,980（テーマ 20 × 5 管理 × 4 ペルソナ = 400 セル）に分業

末尾 CTA（line 158-160 相当）も二段化:
- M3「R8 予想問題集」¥2,480 — 固定 4 ペルソナのフル解答
- M4「3D マトリクス 400 セル」¥2,980 — 業界外受験者の救済

magazine-placement.ts case 2.5 で `inline = [M3, M4]` / `sidebar = [M3]` の自動描画も配線。

## 7. 撤回した過去議論

以下は本セッションで撤回:
- 「テーマ別最適ペルソナを動的選定する」設計（製造業 / IT サービス / エネルギー会社 / 社会保障コンサル / 商社・物流 / 防災コンサル / インフラ運営会社 / ゼネコン地方労務 / 建設コンサル地方拠点 等を主軸ペルソナとして提示）
- 主軸ペルソナ / 副軸ペルソナの区別（→ 4 ペルソナ並列扱い）
- spoke で「ペルソナ別の取り組み方」H2 配下に旧 9 種ペルソナの管理対象例を厚く書く設計（→ 4 ペルソナ + 業界外救済の 5 個に収束）

これらの旧情報は git 履歴に残るため失われていない。深掘りが必要な業界別マッピングは M4 magazine（400 セル網羅）に移管。

## 8. 後続作業

- [ ] **Series2 公開後 (2026-06-08〜)** の販売実績で「5 番目ペルソナ」追加判断（現状 4 で十分か、製造業ペルソナを追加すべきか）
- [ ] **業界外救済段落の効果検証**: M4「3D マトリクス」magazine の販売実績で、業界外受験者の救済導線が機能しているか確認
- [ ] **lint カテゴリ 13 の運用**: MEDIUM 警告で開始、運用 2 週間後に HIGH 昇格判断（spoke ペルソナのドリフト検知）
- [ ] **R9（2027 年度）予想時** に Red Line #8 の追記内容を 1 年運用で再評価
- [ ] **pattern-essay-* との表記統一**: 河川コンサル系の `pattern-essay-river-consultant` は内部呼称「建設コンサル 河川・砂防部門」、spoke は「河川コンサル」。長期的に揃えるか別呼称として維持するか判断（現状は併存で問題なし）

## 9. 関連リファレンス

### 真実源・規約
- 親戦略: [docs/note/noteコンテンツ計画.md](../note/noteコンテンツ計画.md)（Red Line #8 拡張済み）
- 原則: [docs/reference/content-principles.md](../reference/content-principles.md) §21（新設）
- 設計詳細: [docs/project/02_コンテンツ/06_R8記述式予測フロー.md](../project/02_コンテンツ/06_R8記述式予測フロー.md)
- 4 ペルソナ正準表記: [src/lib/note-magazines.ts](../../src/lib/note-magazines.ts)

### コード・配線
- magazine-placement: [src/lib/magazine-placement.ts](../../src/lib/magazine-placement.ts) case 2.5
- lint: [.claude/scripts/lint-mdx-mobile.mjs](../../.claude/scripts/lint-mdx-mobile.mjs) カテゴリ 13

### 関連ハンドオフ
- 前セッション: [docs/handoffs/2026-05-18-r8-essay-forecast-whitepaper-derived.md](2026-05-18-r8-essay-forecast-whitepaper-derived.md)（spoke 9 本初版の設計）
- 前セッション: [docs/handoffs/2026-05-18-r8-pe-double-track.md](2026-05-18-r8-pe-double-track.md)（R8 候補テーマ拡張）

### 確認のみで変更不要（CLAUDE.md §8 準拠）
- `docs/reference/agents-registry.md` — 新規エージェント追加なし
- `docs/reference/skills-guide.md` — 新規スキル追加なし
- `docs/reference/skills-registry.md` — 退役・カテゴリ変更なし
- `docs/reference/exam-content-policy.md` — 既存ルールと矛盾なし
- `docs/reference/content-authoring.md` — 既存ルールと矛盾なし
- `docs/project/03_SNS/02_チャネル動線設計.md` — 動線設計は既存 UTM フォーマットで対応可能

### 検証結果（commit 直前、2026-05-19）

機械検証 6 種すべて期待値達成:

| 検証 | 期待値 | 実測 |
|---|---|---|
| 1. ペルソナ名 4 種統一 | 36 件（9 spoke × 4 ペルソナ）| 36 件 ✓ |
| 2. 旧ペルソナ表記の撤去 | 4 ペルソナ別セクション内 0 件 | 0 件 ✓（業界外救済段落内のマッピング 2 件は意図的に保持）|
| 3. 業界外救済段落 | 9 件 | 9 件 ✓ |
| 4. 主軸ペルソナ/副軸ペルソナ表記 | 0 件 | 0 件 ✓ |
| 5. 冒頭非対称性 1 行 | 9 件 | 9 件 ✓ |
| 6. lint-mdx-mobile.mjs（カテゴリ 13 含む全 9 spoke）| 違反 0 件 | 0 件 ✓ |
