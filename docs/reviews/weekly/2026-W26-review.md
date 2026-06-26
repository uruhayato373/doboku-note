# 週次レビュー 2026-W26

作成日: 2026-06-26
対象期間: 2026-06-22 〜 2026-06-28
前週: [2026-W25.md](./2026-W25.md)

---

## サマリー

- **W25 Must の達成率は 1/3（33%）**。EXP-003/004 close・LCP EXP 化が 3 週・2 週連続で未達。週次ルーティンは今週（2026-06-26）に正常発火。
- **W26 の本体作業は質・量ともに充実**: キャラクター資産化・角度駆動リール・IG 管理強化・記事カード GA4 駆動化・ガイド記事品質改善（3,000 字ゲート）・アフィリ完全廃止など広範な領域を進めた。
- **NSM は +6.8%（クリーン 7 日 WoW）**: 812（2026-06-18〜06-24）vs 760（2026-06-11〜06-17）。上昇トレンド継続。
- **GSC clicks はほぼ横ばい**: 32 vs 33（-3%）。impressions は -10.6%。試験 17 日前のシーズン性か、あるいはコンテンツ刷新の過渡期か要観察。
- **収益カバレッジは 0 ギャップ**: 高流入 (≥15 users) ページはすべて収益導線あり。ただし civil 系テキストの note CTR 0%が目立つ。
- **X 予約キュー**: 062/063（試験直前カウントダウン W2）が DUE。go-live 6/29 = 3 日以内に投入必須。

---

## 計画 vs 実績

W25 計画（`docs/reviews/weekly/2026-W25.md`）の Must/Should タスクを評価。

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| EXP-003 / EXP-004 measure → close | seo | **未達（3 週連続）** | experiments.json で "measuring" のまま。今週も未消化 |
| docs テンプレ LCP 改善を EXP 化 | infra | **未達（2 週連続）** | experiments.json に該当エントリなし |
| 週次定例ルーティン発火確認 | mgmt | **完了** | 2026-06-26 本ルーティンが正常発火 |
| monetization-coverage 実行 | metrics | **完了** | 0 ギャップ確認、coverage-latest.md 更新済 |
| distill-proofread-learnings | mgmt | **未実施（2 週連続）** | W25/W26 とも校正は多いが抽出は未実行 |
| EXP-002（paused）再開/中止判定 | seo | **未決（3 週連続）** | paused 継続 |
| note 建設部門マガジン未投稿分 | content | **差し替え** | W26 weekly で「BK-I 両収録差替」等別タスクとして処理 |

**Must 達成率**: 1 / 3（33%）。测定・実験規律の押し出しが継続。

---

## W26 成果ハイライト

1. **キャラクター「doboku-note 先生」資産化**: 透過ポーズ素材 14 点＋ソース 3 点を新設。`character-poses.json` SSOT・`npm run character-extract` スクリプト配線・CHARACTER-SPEC.md ポリシー化まで完了（commit `2b2ffb37` / `1560991b`）。
2. **角度駆動リール（angle-reel）実装**: experience リールを実動画化（51→28.6 秒に尺短縮）・ズームモーション・キャラクター合成・カバー PNG ラスタライズを完成（commits `b771cf28`〜`500f52eb`）。
3. **IG 管理品質向上**: `verify-ig-status` に投稿型判定（リール/カルーセル識別）・リールギャップ検出を追加。CTA テンプレゲート `check-ig-cta` を新設し pre-commit 配線（commits `42abc033`/`5ba025ec`）。
4. **ガイド記事品質改善**: 3,000 字バーンダウン 32 本＋ゲート配線・§20 参考資料撤去・文末変化・リードリライト。guide-qa / guide-rewriter / guide-fact-checker エージェント 3 体新設。
5. **記事カード刷新＋人気記事特集（GA4 駆動）**: category ページを `ArticleFooter/Sidebar` 分離・人気記事ランキング実装 → ただしガイドカバー写真（AI 生成）は当日リバート、テキストカードへ戻した（commit `65c67cd0`）。
6. **アフィリエイト戦略転換**: 講座・教材・添削・書籍アフィリを完全廃止し転職一本化（BuildJob のみ残存）。書籍アフィリは 2026-06-25 完全廃止（commits `82ee7700` / リファレンス更新）。
7. **リファクタ**: デッドコンポーネント 9 件削除・feature レイヤー残骸削除（commits `9b840f4e` / `c9641fca` / `1b8b4934` / `aab7eed7`）。

---

## 開発活動

- **コミット数**: 81 件（2026-06-19〜2026-06-26）
- **変更ファイル数**: 大規模（docs/sns・docs/reference・src/components 多数）
- **主な領域**:
  - `docs/sns/instagram/` — angle-reel スクリプト/SoT
  - `src/components/` — 記事カード・ArticleFooter・Sidebar リファクタ
  - `.claude/skills,agents/` — guide-qa/rewriter/fact-checker・ig-カルーセル系
  - `docs/reference/` — character-asset-policy 新設・book-list 廃止注記
  - `.local/r2/posts/` — ガイド記事リライト（character フィールド含む）

---

## コンテンツ実績

| カテゴリ | W26 の動き |
|---|---|
| ガイド記事（全資格横断） | 3,000 字ゲート配線・32 本バーンダウン完了、文末変化/リードリライト |
| 技術士総監（note） | 立場別模範論文 × 追加ペルソナ公開・収録（W26 計画分 3 本）、設問 3 バンク ¥780 統一 |
| 技術士建設部門（note） | BK-I 両収録差替・R8 予想 6 本の旧マガジン導線削除 |
| 1 級土木（サイト） | 公務員学習設計 ガイド緩和・BuildJob キャリアカード追加 |
| IG/Reels | angle-reel experience 動画化・CTA ゲート配線・angle-reel 予約（6/27 21:00）|

---

## NSM（オーガニック検索流入）

クリーンな 7 日 organic スナップショット（JP・Organic Search のみ）を使用。

| 指標（Organic Search） | 2026-06-11〜06-17 | 2026-06-18〜06-24 | WoW |
|---|---|---|---|
| activeUsers（★NSM） | 760 | 812 | +52（**+6.8%**） |
| sessions | 1,201 | 1,282 | +81（+6.7%） |
| ページ/セッション | 2.19 | 2.35 | +0.16 |
| 平均セッション時間 | 381.5s | 395.7s | +14.2s |
| engagementRate | 64.4% | 62.7% | -1.7pt |

GSC（7 日 date 窓・非重複で比較、3 日遅延あり）:

| 指標 | 2026-06-08〜06-14 | 2026-06-15〜06-21 | WoW |
|---|---|---|---|
| clicks | 33 | 32 | -1（-3%） |
| impressions | 954 | 853 | -101（-10.6%） |
| CTR | 3.46% | 3.75% | +0.29pt |
| 平均順位 | 〜36 | 〜26 | 改善傾向 |

### NSM トレンドの洞察

- organic activeUsers は 649 → 877 → 760 → 812 と高原状態。+6.8% の上昇は安定トレンドで継続。
- GSC clicks は横ばい（-3%）。impressions の減少（-10.6%）に対し CTR が +0.29pt と効率は改善。これは EXP-003/004（seoTitle 最適化）の遅効が出ている可能性もあるが、measuring 判定がまだ。
- 試験直前シーズン（7/13 まで 17 日）の流入加速が始まっていないとすれば、W27-W28 で impressions 反転増が期待できる。
- 注目クエリ: 総監・1 級土木の受験対策系で位置が上昇中（平均順位 36 → 26）。

---

## 実験の進捗

| ID | title | status | 経過 | 次アクション |
|---|---|---|---|---|
| EXP-002 | Group 1 S+A 評価 5 件復活 + 双方向内部リンク | paused | 2026-04-18〜（paused 2026-04-19） | 再開 or 中止の判定（3 週連続未決） |
| EXP-003 | 個別ハイインパクト SEO 修正 5 件（seoTitle 整合） | measuring | 2026-05-16〜（42 日超） | **今週必須**: measure → 判定 → close |
| EXP-004 | primary h26-r06 系 21 件 seoTitle suffix バグ解消 | measuring | 2026-05-16〜（42 日超） | **今週必須**: measure → 判定 → close |

### Running
現在 running 状態の実験なし。

### Measuring
EXP-003 / EXP-004 ともに 42 日超で滞留中。W25 の Must タスクだったが未消化（3 週連続）。GSC の CTR/impressions 変化（CTR +0.29pt）が EXP の効果か他要因かを切り分けるためにも早期 close が必要。

### 次サイクルへの仮説

- LCP テンプレ改善（`src/app/docs/[...slug]/`）を EXP 化: PSI 53 件違反のうちモバイル LCP 4-6s が多数。テンプレ側の 1 施策で 15〜20 ページに波及する見込み。EXP-005 として起票を推奨。

---

## PSI パフォーマンス推移

2026-06-25 付き `latest-report.md` より。

### Core Web Vitals 主要違反（モバイル）

| URL | Perf | LCP | 状態 |
|---|---|---|---|
| `/` | 77 | 4,879ms | LCP 違反 |
| `/docs/civil-construction-1-guide-strategy` | 57 | 6,301ms | Perf+LCP 違反 |
| `/docs/civil-construction-1-guide-four-management` | 63 | 6,601ms | Perf+LCP 違反 |
| `/docs/pe-comprehensive-management-exam-passing-strategy` | 67 | 5,726ms | Perf+LCP 違反 |
| `/docs/pe-comprehensive-management-r07-secondary` | 67 | 3,675ms | Perf+LCP 違反 |
| `/docs/pe-comprehensive-management-activity-abc` | 68 | 5,656ms | Perf+LCP 違反 |
| `/docs/pe-comprehensive-management-r05-primary` | 69 | 5,524ms | Perf+LCP 違反 |
| （他多数） | 70-79 | 4-6s | LCP 違反のみ |

### デスクトップ違反

| URL | 問題 | 値 |
|---|---|---|
| `/category` | SEO スコア | 83（閾値 ≥90） |
| `/docs/civil-construction-1-primary-r07-a` | CLS | 0.176（閾値 ≤0.1） |
| `/docs/civil-construction-1-secondary-concrete-basics` | Perf + TBT | 60 / 1,994ms |

### 洞察

- 違反 53 件は W25 比で増減不明（比較データなし。psi-batch は 2026-04 止まり）。
- モバイル LCP 4-6s の根本原因はテンプレ共通の画像読み込み戦略と見られる（多数のページで一様な高 LCP）。EXP 化して一括改善する価値が高い。

---

## 収益カバレッジ ダッシュボード

`coverage-latest.md`（2026-06-18 fetch ベース）より。

- 流入のあるページ: **96**
- 高流入（≥15 users）× 無導線: **0**（全ページに何らかの収益導線あり）

### CTR 低位の注目ページ

| ページ | users | note CTR | 課題 |
|---|---|---|---|
| civil-construction-1-guide-strategy | 207 | 0.5% | 1 級土木でトップ流入なのに CTA クリックがほぼゼロ |
| civil-construction-1-textbook-leveling | 102 | 0.0% | 流入あるが CTR ゼロ |
| civil-construction-1-textbook-schedule-charts | 61 | 0.0% | 同上 |
| civil-construction-1-secondary-experience-writing-guide | 54 | 0.0% | 経験記述ガイドでコンバージョンなし |

**ギャップはゼロだが CTR 0% ページが多い**: CTA テキスト・配置・文脈適合の改善余地あり。W27 の Should 候補。

---

## 過去問起点の校正サイクル

`.claude/state/exam-keyword-cycles/` が存在しない。今週の実施なし。

---

## 校正学習の蒸留

`/distill-proofread-learnings --since "7d"` は **2 週連続未実施**。W26 に guide 記事の大規模リライト（3,000 字バーンダウン・文末変化）があるため学習候補は豊富なはず。W27 では冒頭に実行を確保する。

---

## GitHub Umbrella Issue 棚卸し

`gh` CLI 不使用環境（MCP 経由のみ）のため、今週は GitHub Umbrella サーフェスをスキップ。

---

## SNS 予約キュー投入（X）

`npm run x-queue-surfacer` 出力より:

```
キュー充足: 6/28 まで（残り 2 日）  lookahead: 8 日

⚠ 今週投入すべき下書き: 2 件

| draft                           | go-live  | 状態   |
|---------------------------------|----------|--------|
| 062-pe-construction-countdown-w2 | 6/29     | DUE    |
| 063-pe-comprehensive-countdown-w2 | 6/29   | DUE    |
```

**投入手順（ローカル必須）**:
1. `npm run x-schedule-guard -- --queue --max-per-day 2` で緑を確認
2. `npx tsx .claude/skills/social/publish-x/publish-x.ts <NNN> --tweets 1-<本数> <日時×本数>`
3. `npm run x-sync-status` で queued 昇格を実査（偽成功検証）

---

## ドキュメント棚卸し（handoff 退避候補）

`npm run check-doc-lifecycle --json` 結果（staleDays=14 以上で表示）:

### active handoff 候補（1 件）

| handoff | 経過 | tracked | 完了シグナル | 推奨 |
|---|---|---|---|---|
| `2026-06-24-civil1-textbook-figures.md` | 2 日（orphan） | なし | commits 6 件 | ARCHIVE 前に backlog 抽出 |

- `docs/handoffs/2026-06-24-civil1-textbook-figures.md` は 2 日経過・orphan フラグ。「施工管理・法規編 難所 10 図の手動差し替え」が残作業として記載されている。`docs/todo/backlog.md` への抽出が先決。

---

## 課題・ブロッカー

1. **EXP-003 / EXP-004 の 3 週連続未消化**: 実験の計測・判定が毎週後回し。制作スプリントとのスケジューリング競合が根本原因。W27 の月曜朝に 30 分枠を確保して close する。
2. **モバイル LCP テンプレ負債（53 違反、LCP 4-6s）**: 単体修正では追いつかない。EXP-005 として テンプレ 1 施策（`docs/[...slug]/` の画像 lazyOnload→priority 制御）を起票して一括測定する。
3. **X アカウント凍結**: 予約投稿は準備済みだが投入をローカルで行う必要あり。go-live 6/29 の 062/063 は今週末に必須。
4. **pe-construction キーワード重複方針**: ユーザー判断待ち継続中。

---

## 学び

- キャラクター SSOT 化と angle-reel の両方を 1 週で完成させた。設計（CHARACTER-SPEC + manifest）を先行させたため実装が速かった。
- ガイド記事の 3,000 字ゲート（`check-guide-length`）を CI 配線することで品質規律が機械化できた。
- IG リール/カルーセル取り違えを投稿型判定で防止する仕組みを追加。「バグ→是正→ゲート」の改善ループが機能した。

---

## 来週への申し送り

1. **EXP-003 / EXP-004 を必ず close**（W27 冒頭に時間を確保すること）
2. **X 予約投稿 062/063 をローカルで投入**（go-live 6/29、今週末に必須）
3. **EXP-005 起票**: docs テンプレの LCP 改善実験を experiments.json に追加
4. **distill-proofread-learnings --since "7d"** を実行（2 週連続未実施）
5. **docs/todo/backlog.md に「1 級テキスト 難所 10 図の手動差し替え」を起票**し、handoff を archive 退避
6. pe-construction キーワード重複方針をユーザーに決定を促す
7. 試験 7/13 まで 17 日 — R8 予想問題集の直前 SNS プッシュを計画（note 導線フラット維持）
