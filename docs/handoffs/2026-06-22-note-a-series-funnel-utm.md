# ハンドオフ: 建設部門A系統note記事のサイト送客動線（UTM化＋B動線）＋note反映

> [!note]
> **作成**: 2026-06-22 / **ブランチ**: `develop`（全コミット **ローカル止まり・未push・未deploy**）
> **目的**: 技術士建設部門A系統note記事（公開済み6本）→サイトの送客リンクをインライン＋UTM化し、B系統「論点キーワード集」への deep-dive 動線も追加。最後に note.com 公開記事へブラウザ反映する。

## 背景（経緯）

- 発端は別件: 書籍OCR `docs/textbook/技術士（建設部門）/論文対策キーワード/01_社会資本整備.md`（逐語OCRの内部SSOT。READMEガードレールにより**逐語転載せず派生記事へ**）の内容がサイトに反映済みか確認。
- 派生記事＝B系統 `.local/r2/posts/pe-construction/*-ronbun-keyword/`（サイト公開・note は意図的 hold）。
- 過程で **第6次社会資本整備重点計画の陳腐化**（=令和8年1月16日 閣議決定済みを「骨子案/これから」と誤記）を発見し是正。
- さらに note 公開のA系統「〜の論点」6本から**サイトへの動線がUTML無し・生URL**だった問題を是正中。

## A系統（note公開）↔ B系統（サイト）の関係

- **A系統「〜の論点」**＝書き方ガイド（note公開・無料・送客）。
- **B系統「〜の論点キーワード」**＝知識網羅版（サイト公開 `published:true`・note未公開）。
- 両者は直交。A(書き方)→B(知識の引き出し)で深掘りさせる設計。テーマ名は1:1でない。

## 完了済み（4コミット・develop ローカル）

| commit | 内容 |
|---|---|
| `de7302c8f` | サイト01記事(shakai-shihon)に第6次4目標・インフラ経営・バリアフリーを反映 |
| `240bab005` | サイト3記事(datsutanso/iji-kanri/chiiki-dukuri)の「骨子案」陳腐化を是正 |
| `4a3355c8d` | サイト01記事を深掘り(PFIメリット5点・国土形成計画の回廊ネットワーク) |
| `0696bbf8d` | note下書き2本(社会資本整備/持続可能な地域づくり)の同陳腐化を是正 |
| `c73b3350b` | **A系統6本のサイト送客14リンクをインライン＋UTM化**＋規約追記 |
| `596cfc876` | **A系統6本にB系統(論点キーワード集)への deep-dive 動線6本を追加** |
| `e053ed848` | **UTM規約を生成側・SSOTに固定（逆戻り防止）**: note-link-injector にUTM仕様(ルール8)＋自己検証、02_チャネル動線設計に生URL→カード化注意、note-funnel-architecture に相互リンク |

> [!info]
> 数値・制度はWebSearchで一次情報照合済み（第6次=R8.1.16閣議決定〜令和12年度・4重点目標）。文字化け0・pre-commit全通過・`check-sns-urls`でB系統URL本番実在を検証済み。

## UTM規約（真実源: docs/project/03_SNS/02_チャネル動線設計.md に追記済み）

- note→サイトリンク: `utm_source=note&utm_medium=inline&utm_campaign=<記事slug>&utm_content=<送客先>`
- 記事slug: 防災=`pe-bousai` / 担い手=`pe-ninaite` / GX=`pe-gx` / 老朽化=`pe-roukyuuka` / 国土形成=`pe-kokudo` / 建設DX=`pe-dx`
- 送客先: `essay-guide` / `exam-themes` / `r8-revision` / `kw-*`(B系統)
- **note のリンクカードはUTML付きだと生成不安定**→サイト送客はインライン(テキスト)リンクで張る。カードはnote内部CTA(有料マガジン/もくじ)限定でUTML無し。両立が要るなら `public/_redirects` のクリーンURL→302方式。

## 残作業＝note.com 公開記事へのブラウザ反映（未着手）

> [!warning]
> Chrome拡張(claude-in-chrome)が**未接続**のため未実行。`list_connected_browsers` が空。computer-use経由のブラウザは tier「read」で編集不可。**Claude for Chrome 拡張をChromeで有効化＋note.comログイン**してから着手すること。SoT(ローカルmd)は確定済みなので、各 article.md を**コピー元**にすれば機械的に反映できる。

各記事を編集 → サイトリンクを下記md確定版に差し替え（UTML付与・生URLはアンカー文言化・B動線1本追加）:

| note記事 | note URL | コピー元(確定版) |
|---|---|---|
| 防災・国土強靱化 | https://note.com/dobokunote/n/n696fbce4da9f | docs/note/技術士建設部門/防災・国土強靱化の論点/article.md |
| 担い手確保・生産性向上 | https://note.com/dobokunote/n/n7d3872f81e0a | docs/note/技術士建設部門/担い手確保と生産性向上の論点/article.md |
| カーボンニュートラル・GX | https://note.com/dobokunote/n/na5c037797084 | docs/note/技術士建設部門/カーボンニュートラルとGXの論点/article.md |
| インフラ老朽化・維持管理 | https://note.com/dobokunote/n/n93924bcacec3 | docs/note/技術士建設部門/インフラ老朽化と維持管理の論点/article.md |
| 国土形成・地域づくり | https://note.com/dobokunote/n/ne217917f3f45 | docs/note/技術士建設部門/国土形成と地域づくりの論点/article.md |
| 建設DX・i-Construction | https://note.com/dobokunote/n/n03ff3e6203ef | docs/note/技術士建設部門/建設DXとi-Constructionの論点/article.md |

反映後の確認: note実機で①サイトリンクがクリック可能②UTML付き③B論点キーワード集リンクが表示、を目視。

## スコープ外・要判断のフォローアップ

> [!note]
> **他7記事に同じ生URL問題**: 勉強法・書き分け・スケジュール・難易度・道路/河川海岸/都市計画の論文キーワード（例: docs/note/技術士建設部門/建設部門二次の勉強法/article.md:56）。同手順で一括是正可能だが未着手。やるか要判断。
> **note公開2本(B系統)の第6次是正済み**: 但しこの2本(社会資本整備/持続可能な地域づくりの論点キーワード)はnote未公開のためnote反映不要。

> [!tip]
> **生成側ドリフトは固定済み（commit e053ed848）**: note-link-injector・02_チャネル動線設計・note-funnel-architecture を更新済み。これで他節/他資格へ展開しても規約どおり再生産される。展開候補は ①建設部門の残り7記事（生URL→inline+UTM＋B動線）②総監(pe-comprehensive-management)のnote→サイトリンクのUTM化。規約が固まったので着手して安全。

