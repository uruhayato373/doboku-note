---
title: スキル ナビゲーションガイド
---

# スキル ナビゲーションガイド

アクティブなスキルを **用途別** に素早く探すための早引き。  
作成手順 → `skills-design-guide.md`。下の「カテゴリ別クイックリファレンス」は `npm run build-capability-index` の生成物（手で直さない。変更の経緯は git の履歴）

SKILL.md の frontmatter description は毎セッションの一覧に常駐するため、1 文＋Use when（目安 120 字）に絞る（DN-0933）。担当外・安全弁の詳細は本文に置く。

参考書籍の原本・画像・OCRを扱うときは `/asset-route` と [保存方針](./asset-storage-policy.md) §1-1を参照する。正本PDFは1箇所、文字起こしは各原資料内 `ocr/`。`/pdf-to-mdx --scanned` は既存book bundleの `pages/` を再利用し、新規OCR/cropは `record-reference-book-artifacts` で来歴を登録する。

SNSの人物・見出しを改修するときは [SNS画像ポリシー §0・§0.1](./sns-image-policy.md) を起点にする。Instagram の旧過去問パック生成スキルは退役済みで、新規投稿は [投稿素材 README](../../../content/sns/instagram/README.md) に従って個別に制作・台帳登録する。YouTube Shorts の制作は現行の動画パック経路で進める。既存予約・公開状態は publish-ig-bs／publish-x と、運営者が回す `verify-ig-status` で実体と照合する。 Xの継続監視は publish-x の `check-x-queue-health` 手順を使う。通常動画の共有合成器はPNGの色形式を揃えて冒頭欠落を防ぎ、画像と字幕をWAV実尺へ同期し、全場面画像は `media promote` で登録する。ポーズ選びは管理画面 `/gallery/characters` と [キャラクター素材ポリシー](./character-asset-policy.md) を参照する。

---

## カテゴリ別クイックリファレンス

<!-- generated:skills:start（npm run build-capability-index が書く。手で直さない） -->
スキル 99 本（`.claude/skills/*/SKILL.md` の frontmatter から生成）。

### コンテンツ制作（authoring）

| スキル | 領域 | 説明 |
|---|---|---|
| `/cce-essay-cycle` | product | コンクリート主任技士 小論文の出題履歴・傾向記事・令和形式の模範答案・PDF/ココナラ展開を、history / draft / product の各工程へ振り分ける統括。Use when user asks to [主任技士 小論文, 小論文テーマ別答案, 新年度追記, /cce-essay-cycle]. |
| `/civil-keiken-magazine` | product | 1級・2級土木 施工経験記述の note 有料マガジン用フル模範答案を writer→qa で生成・採点する（年度別・テーマ別・予想問題）。Use when user asks to [施工経験記述マガジン, 模範答案を作成, /civil-keiken-magazine]. |
| `/create-svg` | site | MDX記事に埋め込むSVG図版を作成する。モバイル視認性を最優先にした デザイントークン・レイアウトパターン・viewBox制約を適用。 Use when user asks to [SVGを作成, 図を作成, フロー図を作成, /create-svg]. |
| `/illustrate-concept` | site | MDX 記事の概念図を、Web 画像検索で素材の有無を先に調べ、合意を得た概念だけ複数 SVG で一括生成する。Use when user asks to [概念図の検討, 図の着想, SVGの素案作成, /illustrate-concept]. |
| `/improve-article` | site | 単一記事を QA の5軸評価→修正方針の提示と承認→修正→再評価で合格ラインまで回すオーケストレータ（--mode verify で PDF 照合 QA）。Use when user asks to [品質を高めて, 記事を改善, QA通して直して, PDF検証, /improve-article]. |
| `/keyword-page` | site | 総合技術監理キーワードページの作成・校正。既存の空ページを試験対策コンテンツとして仕上げる。 Use when user asks to [キーワードページ作成, キーワード記事, keyword page, /keyword-page]. |
| `/notebooklm-research` | material | NotebookLM CLI の横断クエリで総監キーワードページを引用根拠つきに深掘りしてリライトする。Use when user asks to [NotebookLMで調べて, 深掘り調査, 引用根拠でリライト, /notebooklm-research]. |
| `/pe-essay-cycle` | product | 技術士総合技術監理部門 記述式（模範論文・記述式ページ・note 有料記事・年度予想）の作成→添削→修正→企画→公開を各スキルへ振り分ける統括。Use when user asks to [総監記述式の作業, 模範論文を作りたい, 模範論文の添削, 記述式の予想問題, /pe-essay-cycle]. |
| `/pe-essay-draft` | product | 技術士総監 記述式の模範論文を年度・属性・設問からドラフトする（--mode revise で添削レポートを反映）。Use when user asks to [模範論文を作成, 記述式答案を書く, /pe-essay-draft]. |
| `/pe-secondary-yosou` | product | 技術士第二次試験 建設部門 選択科目の予想問題＋フル模範解答を1科目分、生成→事実照合→構造採点→梱包→登録→commit まで仕上げる統括。Use when user asks to [建設部門の予想問題を仕上げて, {科目}の予想問題集, /pe-secondary-yosou]. |
| `/visual-research` | material | NotebookLM と参照URL（--ref）から概念構造と視覚パターンを得て、SVG 概念図を生成し MDX に挿入する。Use when user asks to [参照URL から SVG, NotebookLM で図を作成, 概念図を深掘り生成, /visual-research]. |

### 変換（conversion）

| スキル | 領域 | 説明 |
|---|---|---|
| `/exam-questions-import` | site | 過去問集 PDF を MDX に変換する（--exam で試験別テンプレ。問題番号・選択肢・解説・正解の構造化）。Use when user asks to [過去問インポート, 問題集変換, 過去問取込, /exam-questions-import]. |
| `/kdp-publish` | product | ビルド済み Kindle 本（EPUB＋表紙）を Amazon KDP へ入稿して下書き保存し、承認後に出版する（kdp-operator が本棚突合と catalog 更新）。Use when user asks to [KDP出版, KDP提出, KDP公開, KDP状態同期, /kdp-publish]. |
| `/kindle-build` | product | Kindle(KDP) 入稿用 EPUB を書籍IDから生成し、epubcheck と kindle-book-qa で検証する（表紙・KDP 入稿は対象外）。Use when user asks to [Kindle本を作って, EPUBを生成, KDP入稿ファイル, /kindle-build]. |
| `/magazine-to-pdf` | product | note マガジンの article.md を「問題文＋解答」中心の A4 PDF に変換する（note 専用 CTA 等は除外）。Use when user asks to [マガジンをPDF, 模範論文PDF, 解答をPDF, /magazine-to-pdf]. |
| `/ogp-create` | site | doboku-note サイト OGP 画像（1200×630 PNG）を共通テンプレ T06 で生成する。Use when user asks to [OGP作成, OGP生成, サムネ作成, /ogp-create]. |
| `/ogp-design-explore` | site | OGP 画像の新しいデザイン方向を aidesigner / Canva MCP で試作する意匠の試作専用スキル（量産は /ogp-create・クレジット消費のため都度判断）。Use when user asks to [OGPデザイン検討, OGP意匠の素案, /ogp-design-explore]. |
| `/past-exam-archive` | material | 公式過去問の原本 PDF を年度在庫台帳に沿って取得し、Drive vault へ退避・全バイト照合・登録する。Use when user asks to [過去問の取得, 過去問PDFの保存, 新年度の過去問, /past-exam-archive]. |
| `/pdf-to-mdx` | material | PDF / 画像から MDX を生成する統合変換（--exam で試験別テンプレ、--scanned でスキャン書籍の機械 OCR）。Use when user asks to [PDFをMDXに, PDF変換, 過去問取込, 書籍OCR, /pdf-to-mdx]. |
| `/standards-table-rebuild` | site | 共通仕様書の章記事で版面のまま残った表を、原本ページ画像と照合して表の JSON に組み直す（writer で組み直し→qa で承認）。Use when user asks to [表を組み直す, 共通仕様書の表, 原本照合で表を直す, /standards-table-rebuild]. |

### 品質管理（quality）

| スキル | 領域 | 説明 |
|---|---|---|
| `/audit-exam-mapping` | site | 総監の過去問⇄キーワード紐づけを exam-keyword-mapping-auditor で設問ごとに semantic 監査し、集約・段階反映する。Use when user asks to [過去問紐づけ監査, exam-keyword 精度向上, /audit-exam-mapping]. |
| `/build-exam-notebook` | material | 総監の1次択一過去問 MDX を NotebookLM の専用 notebook に source として投入する（変換→作成→upload→検証）。Use when user asks to [過去問 notebook 構築, NotebookLM 過去問投入, /build-exam-notebook]. |
| `/check-mdx` | site | MDX の構文・frontmatter・リンク・SVG・法令引用・関連キーワード・過去問解説等を10 rule で検査する（pre-commit でも使用）。Use when user asks to [MDX検査, lint MDX, 構文チェック, リンクチェック, /check-mdx]. |
| `/check-seo-meta` | site | build 済み out/ の全正規 URL の title・description・canonical・og:url・robots・JSON-LD・SSR の欠落/不一致を検査する。Use when user asks to [SEO meta 監査, OGP 検証, /check-seo-meta]. |
| `/civil-figure-rework` | site | 1級土木 過去問1次ページの図クロップを extractor→auditor のループで再生成する（1ページ単位で commit）。Use when user asks to [過去問図再抽出, 図クロップ改善, テキスト写り込み修正, /civil-figure-rework]. |
| `/consolidate-duplicate-keyword` | site | 総監キーワード集で同一概念が複数スラグにあるものを、1ページへ統合する7フェーズの作業書。Use when user asks to [重複キーワード 統合, 統合手順, /consolidate-duplicate-keyword]. |
| `/exam-backlinks` | site | 過去問⇔キーワードの紐付け状態の確認・再生成・品質改善（カバー率レポート・JSON再ビルド）。Use when user asks to [過去問 キーワード 紐付け, バックリンク確認, カバー率, /exam-backlinks]. |
| `/figure-quality-loop` | site | 記事図クロップの品質を、機械検出→目視判定→再クロップ→再検査→台帳記録で1周回すループ（/loop 向け）。単発は /figure-recrop。Use when user asks to [図クロップの品質ループ, 切れた図を直す, /figure-quality-loop]. |
| `/figure-recrop` | site | 記事に埋め込み済みの図画像を目視でタイト再クロップし、写り込んだ答え・本文テキストを除く（provenance の needs=recrop が対象）。Use when user asks to [図の写り込みを除く, 図を再クロップ, 答え漏らし図の是正, /figure-recrop]. |
| `/keiken-charcount` | product | 1級・2級土木 施工経験記述マガジン模範答案の各設問を、解答欄の字数しきい値で機械チェックして OVER を出す。Use when user asks to [経験記述の字数確認, 解答欄に収まるか, 字数オーバー検出, /keiken-charcount]. |
| `/keiken-tensaku` | product | 1級・2級土木 施工経験記述の顧客対応ドラフト（添削・骨子 --mode kosshi・診断 --mode shindan）を作り、返信文を QA で PASS させて運営者へ渡す。事実は捏造せず骨子・診断は文章を書き換えない。Use when user asks to [経験記述を添削, 骨子シートを作成, /keiken-tensaku]. |
| `/note-prepublish-review` | product | note 公開用ドラフトを公開前に、inline 検査と3並列エージェント（link-injector / figure-auditor / fact-checker）で統合チェックする。Use when user asks to [note 公開前レビュー, /note-prepublish-review]. |
| `/pe-essay-review` | product | 総監記述式の模範論文を、採点者・技術士OB・予備校講師の3視点で1〜10点評価し、致命的問題と修正提案を出す。Use when user asks to [模範論文レビュー, 論文評価, /pe-essay-review]. |
| `/pe-first-stage-audit` | site | 技術士第一次試験 pe-first-stage 全21ページの原典突合・正答照合・構造検査を行い、監査記録を state に書く。Use when user asks to [pe-first-stage監査, 技術士第一次試験QA, /audit-pe-first-stage]. |
| `/quality-cycle` | site | キーワードページ・教科書 MDX の品質サイクル（スコアリング→リライト→検証→人間レビュー）。--profile {cem\|civil-textbook} で切替。Use when user asks to [品質サイクル, スコアリング, リライト, /quality-cycle]. |
| `/review-mobile` | site | MDXコンテンツのモバイル視認性・可読性をレビューする。表の不適切な使用、数式の可読性、解説の冗長さを検出し修正案を提示する。 Use when user asks to [モバイルレビュー, 表示確認, 可読性チェック, /review-mobile]. |
| `/standards-visual-review` | site | 基準書（/standards）の章ページを撮影し、原本のページ画像と見比べる目視判定をエージェントに回して、台帳に記録し不合格を起票する。週次の点検で「判定待ち」が出たとき・章記事の生成器や表を直したあとに使う。 Use when user asks to [基準書の画面を確認, 共通仕様書の目視, スクショで確認, /standards-visual-review]. |
| `/verify-exam-coverage` | site | キーワードページに対し、登場する全過去問の論点が解説で足りているかを検証し、未カバー論点を提示して承認後に補強する。Use when user asks to [過去問カバー確認, 解説として十分か, /verify-exam-coverage]. |

### SNS 運用（social）

| スキル | 領域 | 説明 |
|---|---|---|
| `/audit-note-funnel` | product | note 導線の3層（L1 サイトマップ / L2 もくじ / L3 記事内 CTA）のドリフトをソース・ライブ両面で監査し、配線コマンドで修復する。Use when user says "note導線の見直し", "もくじ整備", "CTA配線", "ファネル監査". |
| `/create-pop-image` | product | 承認済みのキャラクターPOP意匠で、ココナラ商品画像・note表紙・SNSサムネイルを制作する（Kindle の表紙は担当外＝npm run kindle-pop-cover）。Use when user asks to [POP画像, キャッチーなサムネイル, 画像を展開, /create-pop-image]. |
| `/ig-carousel-restyle` | sns | 退役した Instagram 旧過去問パックの一括再生成手順。現行の新規投稿には使わない。 |
| `/ig-figure-pack` | sns | サイトSVGを、総監・1級土木・技術士建設部門・技術士一次の図解カルーセル下書き（表紙/図/要点/CTA）へ展開する。資格別ラベル・白背景・元図参照・各スライド目視を必須とし、投稿状態は既存SNS台帳で管理する。過去問クイズはig-post-createを使う。 |
| `/ig-post-create` | sns | 退役したInstagram旧A/B過去問パックの生成仕様。現行の新規投稿には使わず、content/sns/instagram/README.md の個別登録を使う。 |
| `/note-attach-pdf` | product | note 記事の本文末尾（有料記事は有料エリア内）に印刷用 PDF を添付するブラウザ CLI（既定 dry/probe・更新は --commit）。Use when user says "note記事にPDFを添付", "マガジンのPDFが未添付", "/note-attach-pdf". |
| `/note-edit-magazine` | product | note 有料マガジンの設定と収録記事の単品価格を、note掲載文.txt（単一SoT）の値へ反映するブラウザ CLI（初回は --dry-run・保存後に API 検証）。Use when user says "note マガジン編集", "note 価格変更", "マガジン設定更新". |
| `/note-hashtags` | product | note 公開用ドラフトからハッシュタグ（上限99個）を生成し hashtags.txt に保存する。Use when user asks to [note ハッシュタグ生成, note タグ作成, /note-hashtags]. |
| `/note-magazine-add` | product | 既存の note 記事を有料マガジンへ収録するブラウザ CLI（差分は API から自動算出・既定 dry-run・実追加は --commit）。Use when user says "マガジンに記事を追加", "完全パックに収録", "マガジン収録". |
| `/note-magazine-cover` | product | note 有料マガジンの見出し画像を _cover.png から設定するブラウザ CLI（既定 probe・保存は --commit）。Use when user says "noteマガジンのカバーを設定", "マガジン画像が未登録", "/note-magazine-cover". |
| `/note-magazine-create` | product | note 有料マガジンを note掲載文.txt 駆動で新規作成する（編集は note-edit-magazine）。Use when user says [noteマガジン作成, note有料マガジンを作る, /note-magazine-create]. |
| `/note-membership` | product | note メンバーシップ「土木セコカン合格ラボ」の会員限定配信・特典マガジン収録・プラン設定を note-membership-operator で実行する。Use when user asks to [メンバーシップ運用, 会員特典記事を配信, 会員プラン設定編集, /note-membership]. |
| `/note-publish` | product | note.com の有料記事を Playwright で下書き作成→境界検証→公開する Windows 決定的パブリッシャ。Use when user says "note記事公開", "note有料記事を投稿", "note自動公開". |
| `/pe-note-plan` | product | 技術士総監 記述式の note 有料記事・magazine の編集ロードマップ（次に出す記事・順序・価格・バンドル）を提案する企画スキル。Use when user asks to [note 有料記事の企画, note の次の一手, magazine の企画, /pe-note-plan]. |
| `/publish-ig-bs` | sns | Meta Business Suite を Playwright で操作し、Instagram カルーセル/リールを1パックずつ予約・即時投稿する（IG の唯一の経路・初回は --dry-run）。Use when user says "IG予約投稿", "リール予約". |
| `/publish-note` | product | browser-use CLI で note エディタを操作し、総監模範論文（有料）または建設部門の無料ファネル記事（--free）を下書き・予約・公開する。Use when user says "note投稿", "note公開", "note下書き作成". |
| `/publish-x` | sns | Playwright で content/sns/x/draft の tweets.md を1件ずつ X に投稿する（即時/予約・初回は --dry-run）。Use when user says "X投稿", "X予約投稿", "ツイート投稿". |
| `/social-post` | sns | 既存 MDX（過去問・キーワード）から note / X 向け投稿テキストを生成する。Use when user asks to [note 記事, note ドラフト, X 投稿, ツイート生成, /social-post]. |
| `/video-content` | sns | 動画パック（悩み・出典付き台本・storyboard・CTA）を video-script-writer で作り、機械ゲートと video-content-qa の採点後、承認待ちで止める。Use when user asks to [動画パックを作る, 動画台本を作る, /video-content]. |
| `/x-reply` | sns | 技術士・土木施工管理・コンクリートなど資格横断で X の返信候補を集め（Yahoo!リアルタイム検索を 120 時間分さかのぼり、X のフォロー中・おすすめ・検索を内蔵ブラウザで読む）、相手の最新の投稿を確認して下書きを作り、人が 1 件ずつ承認したものを送る（EXP-059・DN-1037）。Use when user says "返信候補", "X の返信", "次の返信". 無人では送らない。 |
| `/x-repost` | sns | X の高エンゲージな技術士・土木ツイートを検索し、x-repost-curator で選別・コメント生成して引用リポストする（discover→curate→exec）。Use when user says "Xリポスト", "引用リポスト", "x-repost". |

### 開発（dev）

| スキル | 領域 | 説明 |
|---|---|---|
| `/asset-route` | ops | Git 外アセットの置き場を「誰が使うか」で決める（サイト配信→public R2・CI→private R2・人/手元→Drive vault）。Use when user asks to [アセットの置き場, R2 か Drive か, 退避先を決める, asset-route]. |
| `/create-skill` | ops | 新しいスキルの作成ガイドを提供する。Use when user asks to [スキルを作りたい, 新しいスキル, /create-skill]. |
| `/deploy` | ops | develop→mainブランチ経由でCloudflare Pagesにデプロイする。Use when user asks to [デプロイ, 本番反映, /deploy]. |
| `/diff-r2` | ops | ローカル `content/site/` と Cloudflare R2 バケット `doboku-note`（prefix `posts/`）の 差分を双方向でレポートする。Use when user asks to [r2の差分, r2とローカルの比較, diff r2, r2 同期確認]. |
| `/doc-declutter` | ops | ドキュメント肥大化を外部実体の確認後に棚卸しする（完了 handoff 抽出削除・trim・統廃合。判定は doc-curator）。Use when user asks to [ドキュメント棚卸し, handoff 整理, /doc-declutter]. |
| `/doc-sync` | ops | コード・スキル・設定の変更 diff を起点に、関連ドキュメントの旧仕様化を doc-sync-auditor で監査し、承認後に直す。Use when user asks to [ドキュメント同期, 仕様ズレ確認, ドキュメント更新もれ, /doc-sync]. |
| `/monitor` | ops | Monitor toolでバックグラウンド監視を起動する（dev/mojibake/ci/build/r2/frontmatter/health/mdx-validation）。 Use when user asks to [監視, モニター, monitor, /monitor]. |
| `/playwright-auth` | ops | Windows・MacのPlaywright認証profileを診断・初回ログイン・状態確認・安全移行する |
| `/review` | ops | 対象ファイルの種類を判定し、適切なレビュースキルを実行して結果を集約する統一入口。Use when user asks to [レビュー, /review, レビューして, 確認して, チェックして]. |
| `/simplify` | ops | 変更中のコード（git diff）の再利用漏れ・過剰設計・無関係な編集・非効率を列挙し、承認の上で最小差分で直す。Use when user asks to [シンプル化, リファクタ, 冗長を削って, /simplify]. |
| `/sync-r2-images` | ops | R2上の画像をローカルに同期する。Use when user asks to [画像が見えない, R2画像を同期, /sync-r2-images]. |

### 分析（analytics）

| スキル | 領域 | 説明 |
|---|---|---|
| `/fetch-gsc-data` | site | Google Search Console の検索パフォーマンスデータを取得する（複数ディメンション・ページング対応）。Use when user asks to [GSCデータ取得, 検索クエリ分析, page×query, /fetch-gsc-data]. |
| `/psi-audit` | site | PageSpeed Insights で代表ページを計測し、Core Web Vitals のしきい値違反を performance-auditor に出させる。Use when user asks to [PSI 計測, 速度監査, /psi-audit]. |

### 計測（metrics）

| スキル | 領域 | 説明 |
|---|---|---|
| `/record-sales` | product | note 販売履歴テキストを sales-recorder で正規化して data/note/sales.json に記録し、月次集計を表示する。Use when user asks to [売上記録, 販売履歴を記録, note 売上, /record-sales]. |

### 戦略・管理（management）

| スキル | 領域 | 説明 |
|---|---|---|
| `/backlog-sweep` | plan | backlog.md からタスクを1〜2件選んで実査・実行・検証し、完了したら削除する1サイクル（--audit は backlog-curator による台帳監査）。Use when user asks to [バックログを消化して, sweep を回して, バックログを棚卸しして, /backlog-sweep]. |
| `/coconala-analytics` | product | ココナラ「サービス・ブログ分析」の収集済み記録（kpi.json・analytics.json）を読んで報告し、鮮度・欠測を検査する（読み取り専用・数値は累計）。Use when user asks to [ココナラの数字を見る, 閲覧数を確認, /coconala-analytics]. |
| `/coconala-blog` | product | ココナラブログ記事の企画・執筆（coconala-blog-writer）・採点（coconala-blog-qa）・下書き投入・ライブ実査を回す。Use when user asks to [ココナラブログを書く, ココナラブログを公開, ブログで送客, /coconala-blog]. |
| `/coconala-order` | product | ココナラ受注1件を受領から納品文面ドラフトまで通す（coconala-operator。土木は /keiken-tensaku、PDF は送付文）。送信は運営者。Use when user asks to [ココナラで受注した, ココナラの納品文面を作って, 添削依頼が来た, /coconala-order]. |
| `/coconala-publish` | product | ココナラ出品の新規出品・内容修正・受付休止/再開/アーカイブを Playwright で行う（既定は下書き・実公開は --commit）。Use when user asks to [ココナラに出品, ココナラ出品を修正, ココナラを休止, 出品を再開, /coconala-publish]. |
| `/coconala-status` | product | ココナラ出品の状態を読み取り専用で照合し（受注 orders.json・カタログ・sales.json・KPI のドリフト）、撤退ラインを判定する。Use when user asks to [ココナラの状態を確認, ココナラKPIを記録, 撤退ライン判定, /coconala-status]. |
| `/competitor-review` | strategy | note / X / Instagram / ココナラの競合を四半期に再取得し、ドリフト検出→competitor-analyst の評価→承認後に SSOT へ反映する。Use when user asks to [競合を再調査, 競合レビュー, 競合分析を更新, /competitor-review]. |
| `/critical-review` | strategy | 設計書・計画書・戦略文書を批判的に評価して改善点を提示する。Use when user asks to [批判的レビュー, クリティカルレビュー, /critical-review]. |
| `/distill-proofread-learnings` | ops | 直近の校正作業の差分と指示から、content-principles・スキル・memory に反映すべき新ルールを抽出し、承認を待たずに反映するメタスキル。Use when user asks to [校正スキル改善, 校正ルール更新, 校正の学習, /distill-proofread-learnings]. |
| `/google-search-growth` | site | GSC/GA4 の収集済み CSV・API データ・sitemap・生成 HTML を URL 単位で突合し、index coverage・検索 performance・技術 SEO を統合診断する。Use when user asks to [検索流入改善, /google-search-growth]. |
| `/gsc-review` | site | 週次 GSC index coverage を gsc-index-auditor で診断し、gsc-management.md の観測・判断ログへ判断つきで追記する。Use when user asks to [GSC月次レビュー, index coverage確認, インデックス率, /gsc-review]. |
| `/knowledge` | ops | 過去の失敗・設計判断・バグ解決の教訓をナレッジベースに参照・追記する。 Use when user asks to [ナレッジ参照, 失敗から学ぶ, 教訓を記録, 過去の判断を調べる, /knowledge, ナレッジを追加]. |
| `/monetization-strategy` | product | 収益化戦略のブレインストーミングと施策ロードマップを生成する。 Use when user asks to [収益化, マネタイズ戦略, /monetization-strategy, 稼ぎ方を考えたい, 月X万円達成するには, AdSense以外の収益源, 有料記事戦略]. |
| `/monthly-review` | strategy | 資格別の集客・学習・note/ココナラ販売・運営負担を前月実測で振り返り、重点と目標、次の改善を記録する。Use when user asks to [月次レビュー, 前月の振り返り, 月次事業レビュー, /monthly-review]. |
| `/nsm-experiment` | strategy | NSM 改善の実験ライフサイクル（propose→start→measure→close）を experiments.json で管理する。Use when user asks to [NSM 実験, 仮説検証, 実験提案, 効果測定, 残作業確認, /nsm-experiment]. |
| `/plan-weekly` | plan | todo の annual/monthly/weekly と git log から今週のタスクを優先順位付きで決め、weekly.md を更新する（todo-planner を1回起動）。Use when user asks to [今週のタスクを決めて, 今週何をすべきか, /plan-weekly]. |
| `/routines` | ops | クラウドルーティンを一覧・監査する（重複・残骸 one-shot・平文シークレット・cron 衝突・無効）。新規作成前の重複確認にも使う。Use when user asks to [ルーティン一覧, ルーティン監査, routine 重複チェック, /routines]. |
| `/seo-growth-review` | site | SEO を技術・index coverage・performance・検索意図の4面で束ね、機械結果を audit-only Evaluator へ配って統合レポートにする（修正はしない）。Use when user asks to [SEO総合レビュー, /seo-growth-review]. |
| `/weekly-improve` | strategy | 週次の計測→改善サイクル（GSC/GA4 取得→metrics-analyzer→/nsm-experiment→pending 再計測）を1コマンドで回す軽量オーケストレータ。Use when user asks to [週次改善, 改善ループ, 今週の改善候補, /weekly-improve]. |
| `/weekly-review` | strategy | 前週の成果・KPI・学びを振り返るレビューを生成する。Use when user asks to [週次レビュー, 先週の振り返り, /weekly-review]. |

### UI/UX（ui）

| スキル | 領域 | 説明 |
|---|---|---|
| `/design-review` | site | デザインシステム準拠を7カテゴリで統合レビューする（.tsx は --visual で Playwright 視覚検証も実行）。Use when user asks to [デザインレビュー, UI確認, 視覚検証, /design-review]. |
| `/site-visual-review` | site | サイトの代表ページを全部の画面幅で撮り、レイアウト・読みやすさ・商品導線（note・アフィリエイト・ココナラ）を機械の検査とエージェントの目視で判定し、不合格を直して撮り直すサイクル。 Use when user asks to [画面幅ごとに確認, スクショで UI を点検, レスポンシブ確認, 導線の見え方を確認, /site-visual-review]. |

### アフィリエイト運用（ads）

| スキル | 領域 | 説明 |
|---|---|---|
| `/a8-report` | affiliate | A8.net 成果レポートの収集済み記録を読み、doboku-note 分のサイト別・プログラム別・期間別から EPC 判定の分母を分析する。Use when user says "A8レポート", "EPCを更新", "a8-report". |
| `/affiliate-apply` | affiliate | もしも / afb で提携申請を実行する（dry-run 既定・--commit は毎回ユーザーの明示許可）。A8 は /scout-asp の担当。Use when user says "提携申請", "アフィリを申請", "もしもで申請", "affiliate-apply". |
| `/affiliate-status` | affiliate | A8 / もしも / afb の提携状態をカタログと最終照合日から読み取り専用で報告する（取得できなかった ASP は「提携なし」でなく unknown）。Use when user says "アフィリ提携状況", "提携状態を確認", "affiliate-status". |
| `/scout-asp` | affiliate | A8.net の提携状況確認・未提携案件の検索・申請・承認昇格・広告コード取得を Playwright で行う（転職スコープ）。Use when user says "A8確認", "申請済みアフィリを見る", "A8案件を探す", "A8提携状況", "scout-asp". |
<!-- generated:skills:end -->

## 用途別ガイド（今やること別）

### note 記事を公開前に仕上げたい

1. `/note-prepublish-review` — 公開前チェックゲート（inline + 3 エージェント並列）
2. `/note-hashtags {slug}` — ハッシュタグ 99 個を生成（選択科目: `--article II1-1` 等でファイル別出力 → `hashtags-II1-1.txt`）
3. `npm run note-reflow -- --dry <file>` — 段落長点検・一括リフロー（>120 字を文境界で短く・語句不変、`content-principles.md §14-e`）

### キーワード品質を上げたい

1. `/quality-cycle --profile cem --mode auto-loop` — 全件スコアリング → 低スコア自動リライト → 再評価（閉ループ）
2. `/audit-exam-mapping` — 紐づけ精度の一括 semantic 監査

### SNS 投稿を量産したい（v7: IG 一次 → YT 派生）

1. `/ig-post-create --exam {pack-id}` — Instagram カルーセル/Reels PNG（一次制作）
2. `/publish-ig-bs post {pack|reels-pp/q<N>} [--reel] --schedule …` — IG カルーセル/リールを Business Suite で**予約投稿**（即時は `--now`。Graph API 経路は 2026-06-17 全廃）
3. `npm run shorts-factory` — 動画パックから YouTube Shorts を作る（手順は video-factory.md「ショートの工程」）
   - 共有合成ライブラリの通常動画は、各静止画を音声の実尺へ揃えてから連結する。時刻同期の実機検査は `RUN_FFMPEG_INTEGRATION=1 node --test tests/longform-timing.integration.test.mjs`（ffmpeg＋libassが必要）。

**IG ハイライト整備**（戦略 v7.1、`node` スクリプト）:
- `node .claude/scripts/instagram/build-highlight-materials.mjs --all` — 6 ハイライト × 32 PNG 一括生成（モダンシック意匠、ジャンル別カラー）
- `node .claude/scripts/lint-stories-titles.mjs` — title 字数 lint（auto-fit 4 段階判定）
- 執筆・採点のエージェントと設計の文書は、SNS の保留に合わせて 2026-10-25 に外した（git の履歴にある）

**SNS 計測・公開状態照合**（「投稿 → 計測 → 改善」ループ。計測は CI 供給が正・ローカル creds 不要）:
- SNS 流入 breakdown: `fetch-metrics.yml`（金 06:00 JST）が `npm run fetch-ga4-data -- --dimension sourceMedium --sns-only` を回し `ga4.source-medium-sns` を蓄積。週次スナップショット（`weekly-metrics/`）にも SNS 流入（source 別 WoW）が入る
- 週次レビュー: `/weekly-review` の **Agent F**（SNS 流入・投稿実績）＋ `metrics-analyzer` の **Pattern 6 SNS-Source-Shift**（急落/新規成長 source を surface）
- X UTM ゲート: `npm run check-x-utm`（pre-commit・X 送客リンクに `utm_source=x`/`utm_medium=social` 必須）
- YT 公開照合: 2026-10-25 に SNS の保留に合わせて CI の毎日の照合（`registry-reconcile.yml`）を外した。いまは手元の `npm run check-video-publication` だけ
- IG 公開照合: 運営者が `verify-ig-status`（`/ig-reconcile` スキルは 2026-10-25 に外した）

### PDF を MDX に変換したい

1. `/pdf-to-mdx --exam {cem|civil-construction-1|general}` — テキスト・図版含む変換
2. `/exam-questions-import --exam {civil-primary|civil-secondary|pe-primary}` — 過去問集

### 建設部門 2次 note 模範解答を生成したい

1. `pe-secondary-exam-writer` エージェントに `year` / `subject` / `exam_type` / `magazine_id` を渡す
2. 運営者が article.md をレビューして note 投稿（noteUrl を frontmatter に記入）
3. 詳細: `content/note/技術士建設部門/noteコンテンツ計画.md`、エージェント: `.claude/agents/pe-secondary-exam-writer.md`

### 総監 記述式 模範論文（note 有料）を生成したい

1. `cem-essay-writer` エージェントに `type`（`persona`/`r8yosou`/`setsumon3`/`crosstradeoff`）/ `magazine` / `slug` を渡す → `cem-essay-qa` で5軸採点（不合格は writer へ修正指示で再走）
2. 工程・評価軸・公開ゲートの SoT＝`.claude/knowledge/reference/note-essay-review-checklist.md`（Step 0〜6f がランブック）。配線・公開後 URL 反映・commit は親
3. **サイトの r0X-essay-{attr} ページは別物** → `/pe-essay-draft`（Generator）→ `/pe-essay-review`（Evaluator）

### Kindle EPUB（KDP 出版）を生成したい

1. **Aシリーズ（1級土木 択一・論点別）**: `node scripts/build-takuitsu-reconstruct.mjs --theme {key} --format epub`
   - `--theme` キー（全 THEMES 定義済み・2026-07-08）: `anzen`（安全管理）/`hoki`（法規）/`sekokeikaku`（施工計画）/`kankyo`（環境管理）/`hinshitsu`（品質管理）/`koutei`（工程管理）/`goubon`（全科目合本・EPUB のみ生成）
   - 出力先: `.tmp/takuitsu-{key}/{key}.epub`（gitignore）。表紙は `scripts/kindle-covers/`（spec 駆動）
   - Kindle Previewer 確認後、KDP（[kdp.amazon.co.jp](https://kdp.amazon.co.jp)）にアップロード
   - 書籍ID→コマンドの解決表・KDP実運用メモの真実源 → `.claude/skills/kindle-build/SKILL.md`
2. **B/D/Eシリーズ（択一・合本）**: `node scripts/build-pe1-kindle.mjs --spec scripts/kindle-specs/{id}.json`
3. **C/Fシリーズ（記述式・模範解答/論文）**: `node scripts/build-essay-kindle.mjs --spec scripts/kindle-specs/{id}.json`
4. 非公開前付け → `content/kindle/books/{id}/front-matter.md`（`kindle-book-composer` 管理）
5. 戦略全体・ラインナップ一覧 → `content/kindle/strategy.md`

### マガジン記事を紙用 PDF にしたい

1. `/magazine-to-pdf --spec scripts/pdf-specs/{name}.json [--desktop]` — spec 済みマガジンを「問題文＋解答」PDF に再生成
2. 新規マガジン（spec 無し）は `magazine-pdf-builder` エージェントに spec 作成から委譲（A/B案など複数解答は両方収録）

### 週次 PDCA を回したい

1. `/weekly-improve` — 計測データから改善候補を自動抽出・実験登録（performance）
2. `/weekly-review` → `/plan-weekly` — 振り返りと翌週の週間計画（weekly.md）の更新

### GSC のインデックス状況（登録/未登録）を管理したい

1. 月次 CI（`index-coverage.yml`）が URL Inspection を取得済みの前提（無ければ `gh workflow run index-coverage.yml`）
2. `/gsc-review` — `gsc-index-auditor` が indexed_ratio・原因バケット（権威性/技術/hygiene）を診断
3. `.claude/knowledge/reference/gsc-management.md` の観測・判断ログへ判断を追記（真実源）。performance 側は `/weekly-improve` と直交

### コードを変更してデプロイしたい

1. `npm run dev` — 開発サーバー起動（ポート 3020）
2. `/review` — 変更のレビュー
3. `/deploy` — Cloudflare Pages デプロイ

---

## Phase 2 待機スキル（現在未稼働）

| スキル | 着手条件 |
|---|---|
| `/keyword-gap` | Web 月収 ¥15k 達成後 |
| `/exam-demand` | Web 月収 ¥15k 達成後 |
| `/discover-exam-season` | Web 月収 ¥15k 達成後 |
| `/plan-affiliate` | Web 月収 ¥15k 達成後 |
| `/register-affiliate-banner` | Web 月収 ¥15k 達成後 |
| `/audit-ads` | Web 月収 ¥15k 達成後 |
