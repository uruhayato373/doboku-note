# X(旧Twitter) 投稿ポリシー（多資格・エージェント分業）

X 投稿の真実源。文字数ルール・試験別テンプレ/タグ・投稿型・5 軸ルーブリック・偽成功検証を集約する。
IG の各 policy（`ig-carousel-policy.md` 等）とパラレルな位置づけで、Generator（`x-post-writer`）と
Evaluator（`x-post-qa`）が共通参照する。

> 設計原則: **資格別にエージェント/スキルを増やさない**。媒体（X）× 機能（Generator/Evaluator）で分業し、
> 試験（総監 / 1級土木 / 2級土木 …）は `exam` パラメータで横断する（IG と同じ思想）。

## 1. 戦略上の位置づけ

- X は**受験生コミュニティへの即効性チャネル**。フォロワー獲得の本質は**良質なリプライ運用**（戦略 v5 §7: 1 日 10 件、宣伝なしの補足・励まし）。
- 自動投稿よりも「**ネタの半自動生成（writer）＋手動の投稿・リプライ**」が現実的。`x-post-writer` は下書き（`tweets.md`）を量産し、投稿タイミングとリプライは人が担う。
- 真実源の戦略は `docs/project/03_SNS/01_SNS集客戦略.md` の X 節。

## 2. 文字数ルール（最重要・全試験共通）

X は **280 weighted chars 以下**。超過すると `publish-x`（Playwright）予約投稿時に X 側で reject される。

| 要素 | 重み |
|---|---|
| 日本語・絵文字・全角記号 | 2 /字 |
| 英数字・半角記号・スペース・改行 | 1 /字 |
| URL（実長によらず） | 23 固定 |
| 上限 | 280 |

→ 純日本語なら **本文 ≒ 117 字 + URL 1 本**が目安。

検証コマンド（`tweets.md` 変更後は commit 前に必須・違反で exit 1）:

```bash
node scripts/check-x-length.mjs                 # 全ドラフト
node scripts/check-x-length.mjs --draft 040     # 単一
node scripts/check-x-length.mjs --over          # 違反のみ
```

> 既知の落とし穴: `check-x-length` は Windows で空振りした事例あり（[[measurement-incidents]] 系）。違反ゼロ表示を鵜呑みにせず、weighted 計算を目視確認する。

## 3. ディレクトリ / ファイル

```
docs/sns/x/
├── draft/<NNN>-<exam>-<topic>/      ← 試験を slug に含める（多資格識別）
│   ├── tweets.md                     ← 280 weighted 以下の投稿群
│   └── img/tweet-NN-<slug>.png       ← create-x-card 生成（任意）
├── published/                        ← 投稿済みアーカイブ
└── README.md                         ← テンプレ規約（本 policy へのリンク）
```

- ドラフト slug に試験識別子を含める（例 `040-civil1-引っかけ集`, `041-civil2-1問1答`, `042-pe-キーワード解説`）。総監は歴史的経緯で識別子なしの既存ドラフトが残るが、新規は付ける。

## 4. 試験別ベースタグ（1〜3 個原則）

ハッシュタグは **1〜3 個が最適**（4 個以上はエンゲージメント低下。IG/note の 20+ とは別系統）。
各ツイートに**ベースタグ＋必要なら 1 個の論点タグ**まで。

| 試験 (`exam`) | ベースタグ | 備考 |
|---|---|---|
| `pe-comprehensive`（総監） | `#技術士` `#総監` | `#技術士総監` は外した（2026-05-29）。`#総合技術監理部門` は重く要点限定 |
| `pe-construction`（技術士建設部門） | `#技術士` `#建設部門` | 2026-06-09 追加。論点で `#技術士二次試験` 等を 1 個追加可。`#技術士建設部門` は重め |
| `civil-1`（1級土木） | `#1級土木施工管理技士` `#施工管理技士` | 論点で `#施工管理` 等を 1 個追加可 |
| `civil-2`（2級土木） | `#2級土木施工管理技士` `#施工管理技士` | 同上 |

> タグの真実源は本表。過去の運用は [[feedback_x_base_hashtags]] / [[feedback_x_hashtag_count]]。

## 5. 投稿型（試験別の使い分け）

| 型 | 内容 | 主な試験 | ネタ源 |
|---|---|---|---|
| キーワード解説 | 用語を 1 ツイートで要約＋サイト誘導 | 総監（キーワードページが厚い） | `.local/r2/posts/{category}/{slug}/article.mdx` |
| 過去問 1 問 1 答 | 1 問の主題＋正答の論点（ネタバレ最小）＋サイト誘導 | 1級 / 2級（過去問が主資産） | `src/config/{civil-1,civil-2}-exam-questions.json`（IG パックと同素材） |
| 引っかけ集 | 頻出の誤答パターンを 1〜3 行で | 全試験 | 過去問 optionExplanations の誤答（`correct:false`） |
| 暗記フレーズ集 | 語呂・対比の暗記促進 | 全試験 | キーワード/過去問 |
| マガジン宣伝 | note 有料マガジンの導線（施工経験記述等） | 1級 / 2級 | `note-magazines.ts`（価格は本文直書き禁止 → [[feedback_no_price_in_mdx_body]]） |

- 過去問型は **正答そのものの全文ネタバレを避け**、「論点」を提示してサイトへ誘導する（IG reels caption と同方針）。
- 1級2級は過去問データ（`*-exam-questions.json`）が主資産。`packEligible` でなくても X 1 問単位なら使える（表・図問題は本文化が難しいので避ける）。

## 6. URL / UTM

- 投稿内 URL は 1 本まで（23 weighted）。
- UTM 統一フォーマットは `docs/project/03_SNS/02_チャネル動線設計.md` 準拠（`utm_source=x`）。
- リンクは短縮 URL を使い、weighted 23 固定の利点を活かす。
- **`/docs/{slug}` は本番フラット slug ＝「カテゴリ-ディレクトリ」を必ず使う**（最重要・404 防止）。ページの**ディレクトリ名だけ**で組むと 404 になる。
  - 誤: `/docs/primary-r03-kouki` → 正: `/docs/civil-construction-2-primary-r03-kouki`
  - 誤: `/docs/keyword-2026`（総監/土木で分岐）→ 正: `/docs/pe-comprehensive-management-keyword-2026` 等
  - slug の真実源は `src/config/doc-meta-index.json` の `docs` キー。執筆時はここに存在する slug かを必ず照合する。
- **検証の仕組み化（2026-06-08 新設）**: `node scripts/check-sns-urls.mjs` が `docs/sns/**` の `/docs/` リンクを doc-meta-index と突合し、本番に無い slug を検出する。pre-commit に `--staged` で組込済み（broken があるとコミット不可）。背景: 2026-06 に X 投稿 149 件のリンク切れ（560+ impressions ロス）が発生 → 接頭辞欠落が原因。

## 7. サマリカード画像（create-x-card）

`scripts/gen-x-card.mjs` が `tweets.md` から 1200×675 カードを生成する。**試験別に色・ヘッダを切替**：

| 試験 | ヘッダラベル | 色（帯・フッター） |
|---|---|---|
| 総監 | 「総監キーワード解説 #N」＋管理分野バッジ | 管理分野別（経済性=青/安全=赤/品質=緑/情報=金/人的=紫） |
| 1級土木 | 「1級土木 過去問 #N」 | 試験色 青（`exam-palette` civil-1） |
| 2級土木 | 「2級土木 過去問 #N」 | 試験色 緑（`exam-palette` civil-2） |

- 色の真実源は `docs/design-system/note-cover-tokens.json` の `exams`（`exam-palette.mjs` 経由）。総監の管理分野色のみ従来維持。
- カードは任意（テキスト投稿でも可）。画像添付はエンゲージメントを上げるが必須ではない。

## 8. 5 軸ルーブリック（`x-post-qa` 採点）

各軸 0〜3 点、合格ライン平均 ≥ 2.0。

1. **文字数遵守**: 全ツイート 280 weighted 以下（`check-x-length` で 0 違反）。
2. **論点の的確さ**: 過去問型は正答全文ネタバレでなく論点提示。キーワード型は定義の核を外さない。誇張・捏造なし。
3. **タグ適切性**: 試験別ベースタグ準拠・1〜3 個・無関係タグなし。
4. **導線整合**: URL 1 本・UTM 正・サイト/note 誘導が自然。
5. **偽成功検証**: 投稿後に予約キューを**実体検証**（§9）。

## 9. 偽成功検証（publish-x）

`publish-x` の「予約投稿完了」ログは**偽成功があり得る**（確定クリック不発バグの履歴）。
報告前に **X 予約キューを仮想スクロールで全件ダンプして実体検証**する（[[feedback_publish_x_false_success]]）。
`x-post-qa` はこの実査を採点項目に含める。

## 10. リプライ運用（フォロワー獲得の本質）

- 受験生ツイートに 1 日 10 件、**宣伝なしの補足・励まし**（戦略 v5 §7「フォロワーゼロから 1 年戦略」）。
- これはエージェント化せず人が担う領域。writer はあくまで**投稿ネタの供給**に徹する。

---

## 参照

- 戦略: `docs/project/03_SNS/01_SNS集客戦略.md`（X 節）/ `02_チャネル動線設計.md`（UTM）
- 連携スキル: `social-post`（X 投稿テキスト生成）/ `create-x-card`（カード画像）/ `publish-x`（予約投稿）
- エージェント: `x-post-writer`（Generator）/ `x-post-qa`（Evaluator）
- IG 対応物: `ig-carousel-policy.md`・`ig-reels-policy.md`（パラレル設計の参考）
