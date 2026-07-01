# ハンドオフ｜サイトアクセスアップ×収益化 戦略分析（別PCで継続・深掘り用）

- 作成: 2026-07-01
- 目的: 「note有料マガジンは整備できた。次の収益化にサイトアクセスアップは必須か。どう進めるか」の議論を、**実データで検証した結果**を記録し、別PCで深掘り継続する。
- 状態: **データ検証済み・仮説を2回訂正・次アクション未着手**
- 関連: [note公開ハンドオフ](2026-07-01-civil2-koji-bank-note-publish.md) / [noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md) / [gsc-management.md](../reference/gsc-management.md) / [02_チャネル動線設計.md](../project/03_SNS/02_チャネル動線設計.md)

---

## 0. 出発点の問い

- 「土木施工管理も技術士（総監・建設部門）も**サイトアクセスは少ないのに月20万円を達成**した。更なる収益化にサイトアクセスアップは必須と考える。どう進めるか」
- 併せて「1級テキスト（施工管理・法規編等）のMD化完了後、サイト記事 or note有料記事として展開したい」も議論（→ §5に結論）。

---

## 1. 実データ（この議論で確認した事実）

すべて手元の CI/CD 供給スナップショットとローカルSoTから。**外部APIは叩いていない**（会社PCプロキシ制約・measurement-incidents.md 準拠）。

### 1-1. 売上（`.claude/state/sales/sales-log.json`・`npm run sales-summary`）
- **2026-06: 103件 ¥217,760**（2026-05: 16件 ¥33,220。ログ総計 119件 ¥250,980）
- 商品構成（6月の主力）:
  - **技術士 総監 記述式 ≈¥145k（約58%）**: essay-complete-pack ¥57,680(7件) / r8-essay-forecast ¥47,680(16件) / tankan-reading-guide ¥15,840(8件) / essay-core-pack ¥10,960(2件) / 模範論文各ペルソナ / tradeoff-5kanri
  - **技術士 建設部門 二次 ≈¥58k（約23%）**: bk-i-required / bk-tunnel / bk-urban-planning / bk-road / bk-geotechnical / bk-port-airport / bk-steel-concrete 等
  - **1級・2級土木施工管理 ≈¥0**（想定工事バンクは未公開、既存keiken magazineは低調）

### 1-2. サイト流入（`.claude/state/metrics/ga4/ga4-channel-*.json`・週6/18-24・日本・全チャネル）
| チャネル | activeUsers | 比率 |
|---|---|---|
| **Organic Search（Google/Bing/AI検索）** | 2,844 | **84%** |
| Direct | 271 | 8% |
| **Referral（note含む全参照元）** | 141 | **4%** |
| AI Assistant（ChatGPT/Copilot等） | 65 | 2% |
| Organic Social | 38 | 1% |
| Organic Video | 26 | 1% |
- 総計 ≈3,400 users/週（≈月1.3〜1.4万）。**サイトは"低アクセス"ではない**。前段で引用した「5クリック/日（GSC）」は過小/古い可能性が高い。
- 注: `ga4-channel-organic-*`（organicOnly:true・より厳しいフィルタ）では Organic 812。フィルタ差で数値が異なる＝別PCで定義を要確認。

### 1-3. 参照元の実体（`ga4-source-*.json`・5/3-16・やや古い）
- bing 252 / (direct) 101 / google 77 / **openai 45** / yahoo 25 / **note.com 23** / chatgpt.com 9 / copilot.com 7 / note 6 / youtube 4
- **note→サイトの流入は約23〜29ユーザー/2週＝ごく小さい**。検索（bing/google/yahoo）＋**AI検索（openai/chatgpt/copilot）**が上位。

### 1-4. サイト→note 送客（`ga4-cta-clicks-*.json`・イベント `note_cta_click`・5/28-6/24・日本）
- **合計 248 クリック / 60ページ**。試験別:
  - **技術士総監 129（52%）** / トップ 40（16%）/ 技術士建設部門 35（14%）/ 2級土木 30（12%）/ 1級土木 10（4%）
- 上位ページ: `/category/pe-comprehensive-management` 65 / `/`(トップ) 40 / `/docs/pe-construction-road-exam-themes` 14 / `/docs/pe-comprehensive-management-r8-essay-keyword-forecast` 12 / `/docs/civil-construction-2-secondary-experience-writing-examples` 8
- **CTAクリックの試験構成が売上構成とほぼ一致**（総監主・建設従・土木ほぼ0）。

---

## 2. 結論（データが示す収益回路）

```
❌ 仮説A（別PC議論の起点）: サイトは売上と独立・note-native で回っている
❌ 仮説B（別PC議論の起点）: note（発見）→ サイト → note（購入）のループ
✅ 実態:  検索エンジン（Google/Bing/AI）→ サイト（総監記事）→ note CTA → 購入
          （＋ note-native〔note内検索/SNS→note直〕も一部・これは測定不可）
```

- **サイト流入は84%がオーガニック検索**。noteからの環流は4%未満。→ 仮説B（note→サイト→note）は棄却。
- **総監が回っている理由＝総監のサイトSEOが成熟し検索上位化 → サイト記事がnoteへ送客**。noteの実力でなくサイトSEOの成果。
- **サイトは売上と独立ではない**（仮説A棄却）。サイト→note CTAの試験別分布が売上分布と一致＝サイトはファネルの主要送客源。

---

## 3. 議論中に訂正した見立て（別PCで蒸し返さないため記録）

| 当初の発言 | データによる訂正 |
|---|---|
| サイト流入は「5クリック/日」で極小 | GA4 全チャネルで Organic 2,844/週・総計3,400/週。過小だった |
| 売上は note-native でサイトと独立 | サイト→note CTA 248/4週・試験構成が売上と一致＝サイトは主要送客源 |
| note→サイト→note が回っている（ユーザー仮説B） | note referral は数%以下。実態は検索→サイト→note |

**教訓**: 売上データは「何が売れたか」しか示さない。「どこから来たか」はGA4のCTAクリック/チャネルで裏取りする（[[feedback_metrics_cicd_supplied]] のとおりCI/CD供給スナップショットで足りる）。

---

## 4. 測定できること/できないこと（別PCで前提にする）

| 測りたいもの | 可否 | 手段 |
|---|---|---|
| 購入者の"購入経路"帰属（note内/SNS/サイトの購入単位） | ❌ 不可 | noteの販売履歴は date/product/price のみ。noteは購入に流入元を付けない |
| サイト→note 送客（どのサイト記事がnoteに効くか） | ✅ 可 | GA4 `note_cta_click`（ページ別）。CI/CD供給・noteログイン不要 |
| サイトの流入元（検索/参照/AI/SNS） | ✅ 可 | GA4 channel/source・GSC |
| note内のview単位の流入元（粗い区分） | △ 手動 | note ログイン後の「アクセス状況」ダッシュボードのみ・購入非帰属 |
| note-native購入分の切り分け | △ 近似のみ | 「248 CTAクリック=サイト由来／残りの売上=note-native+SNS」でブラケット。厳密不可 |

---

## 5. 派生論点の結論：テキストMD → サイト or note

- **テキストMDの verbatim 公開は NG（サイトもnoteも）**。理由: (1)市販本スキャンで「公開しない（著作権）」と既決（`docs/textbook/１級土木施工管理技士/テキスト（施工管理・法規編）/README.md:4`）(2)体系解説はサイト無料の領域＝note化はカニバリ＋著作権の二重NG（Red Line #5・02_チャネル動線設計）。
- **正しいやり方**: テキストMD＝根拠SSOT → **原著としてサイト記事化**（既存 `.local/r2/posts/civil-construction-1/textbook-*` 34本が実践例＝逐語でなくfrontmatter+MDX+FAQs+再構成）。図は市販本図の再配布もNG＝自作SVG/CC/PDへ差替（image-policy.md）。
- **noteで売るのはテキストではない** — 自作の希少一次情報（想定工事バンク・完成答案・模範論文）。

---

## 6. 戦略の骨子（現時点の到達点）

1. **技術士（総監・建設）＝既に「検索→サイト→note」で回るエンジン**。次の¥を最速で増やすのは商品拡充＋note内発見性＋SNS→note（サイトSEOは既に効いている）。
2. **1級・2級土木＝同じ回路が未稼働の最大の伸びしろ**。サイト記事114本＋note商品（想定工事バンク等）は揃うが、検索流入・CTA送客・売上がほぼ0。**総監でできた「検索上位化→サイト→note」を土木へ移植**するのが次の収益の柱。
3. **サイトアクセスアップの本筋**（GSC 2026-06-22診断・gsc-management.md:97-104）: 個別ページのSEO微修正は効かない。効くのは**ドメイン権威性＋ロングテール原著コンテンツ＋内部リンク（技術リファレンス被リンクループ）**。title/description微修正は換金性ゼロ＝やらない。
4. **新チャネル**: AI検索（ChatGPT/Copilot/openai）が実流入で出現。AI引用を意識したコンテンツ設計も今後の論点。

---

## 7. 別PCで深掘りする論点・次アクション候補

- [ ] **勝ち記事の型抽出**: GA4 `ga4-page-*` ×`ga4-cta-clicks-*` で「検索流入が多く→CTA送客も多い」総監記事を特定し、構造（見出し・CTA位置・内部リンク・FAQ）をテンプレ化 → 土木へ移植。
- [ ] **土木SEOビルド計画**: 既存 `textbook-*`(34) × テキスト13章のカバレッジ・ギャップ表 → 未カバー節を原著記事化（civil-textbook-rewriter）＋図自作 → ロングテール。
- [ ] **土木のサイト→note導線整備**: 総監で効くCTA/UTMの型を土木全記事へ。想定工事バンク公開後にCTA先を接続。
- [ ] **売上×イベント相関**: sales-log の日付 × SNS投稿日/note公開日 で note-native分をブラケット（厳密attributionの代替）。
- [ ] **note内発見性の検証**: 別PCのnoteログインで「アクセス状況」の流入元（note内検索/SNS/外部）を手動確認し、note-native分の当たりをつける。
- [ ] **AI検索対策**: openai/chatgpt/copilot 流入の実態と、AI引用されやすい構造（明確な定義・箇条書き・出典）の検討。
- [ ] **競合分析の反映**: `docs/project/01_戦略/09_note競合分析2026.md` を読み込み戦略に接続。

---

## 8. データの見場所（別PCで再現するために）

- 売上: `.claude/state/sales/sales-log.json`（`npm run sales-summary`）
- GA4: `.claude/state/metrics/ga4/`（`ga4-channel-*`＝チャネル/`ga4-source-*`＝参照元/`ga4-cta-clicks-*`＝サイト→note送客/`ga4-page-*`＝ページ別/`ga4-date-*`＝日次）
- GSC: `.claude/state/metrics/gsc/`・[gsc-management.md](../reference/gsc-management.md)
- 戦略SSOT: [03_事業戦略](../project/01_戦略/03_事業戦略.md)/[04_収益化戦略](../project/01_戦略/04_収益化戦略.md)/[02_チャネル動線設計](../project/03_SNS/02_チャネル動線設計.md)/[note-funnel-architecture](../reference/note-funnel-architecture.md)
- 集計は python -X utf8 で sales-log/GA4 json を月次・試験別に aggregate（本ハンドオフの数値はこの方法で算出）。

> [!note] 鮮度の注意
> ga4-source は5月、ga4-channel/cta-clicks は6月のスナップショット。別PCで継続する際は `.claude/state/metrics/ga4/` の最新ファイルで数値を更新してから議論する。方向（検索→サイト→note・土木未稼働）は複数スナップショットで頑健。
