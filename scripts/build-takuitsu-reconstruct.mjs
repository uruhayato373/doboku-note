// 択一過去問を「年度別」ではなく「論点別」に再構成した教材ソースを生成する試作
// ジェネレータ。1 ソースから note 用（Markdown / 印刷 HTML）と Kindle 用（EPUB）を出す。
//
// 生の年度別過去問（サイトで無料公開中・無料代替も飽和）との差別化として、
//   1) 同一テーマの択一を H26〜R07 で横断集約（出題パターンが体で分かる）
//   2) テーマ冒頭に「論点まとめ」= 正しい知識(○解説)を体系化（暗記特化）
//   3) 同一趣旨の反復問題を圧縮（編集された教材としての価値）
// を付与する。入力は build-time 済みの構造化全問 JSON。
//
// 使い方:
//   node scripts/build-takuitsu-reconstruct.mjs --theme anzen [--format both]
//     --format md | epub | both（既定 both）
//     --outDir <dir>（既定 .tmp/takuitsu-<theme>）
//
// 出力:
//   <outDir>/article.md   note 貼付用 SoT（Markdown）
//   <outDir>/print.html   印刷用 HTML（Chrome で PDF 保存 → note PDF 販売用）
//   <outDir>/<theme>.epub Kindle 入稿用 EPUB（KDP にアップロード）
//
// 図版に依存する設問（「下図」等を含む body）は、JSON に画像が無いため自動除外する。

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeEpub, xhtmlDoc, xesc, xinline } from './lib/epub-writer.mjs'

const REPO = resolve(import.meta.dirname, '..')

// ---- 著者・出版者・出典クレジット（src/config/author.ts と整合）-----------
const AUTHOR = 'doboku-note'
const PUBLISHER = 'doboku-note'
// 1級/2級土木は試験実施機関のクレジット表示で過去問を使用する
const CREDIT_BODY =
  '一般財団法人 全国建設研修センターが実施する土木施工管理技術検定（第一次検定）の過去問題を出典としています。問題文の著作権は同センターに帰属します。解答・解説および論点別の編集・再構成は著者によるものです。'
const DISCLAIMER =
  '本書は正確を期して作成していますが、内容を保証するものではありません。法令・基準は改正されることがあるため、受験にあたっては必ず最新の一次情報をご確認ください。'

// ---- テーマ定義（試作は安全管理1本。追加時はここに足す）------------------
//
// THEMES[key] スキーマ:
//   include : 設問の「見出し文（lead＝body の最初の行。選択肢や穴埋め本文を
//             含まない主題文）」に対する一次フィルタ regex。ヒットした問題を
//             候補集合に入れる（広く取ってよい）。
//   exclude : include にヒットしたが実際はテーマ外（見出し文に主題語を含む
//             が別分野の設問）の問題を弾く regex。
//             candidate = include.test(lead) && !(exclude && exclude.test(lead))
//   parts   : （任意）出題パート（'A'|'B'）の許可リスト。lead 文言が同一で
//             regex では区別できない設問（例: A問題「鉄筋の継手」＝専門土木の
//             施工技術 vs B問題「鉄筋の継手」＝品質管理の検査）を試験構成で
//             切り分けるときだけ指定する。未指定なら全パート対象。
//             例: 「建設機械の選定に関する次の記述」は見出しに「建設機械」を
//             含むが、論点は経済性・調達であって安全管理ではないため除外。
//   subtopics: 章分け。各要素 { key, label, re } の re は lead（見出し文）
//             に対して上から順に判定し、最初にマッチした章へ割り付ける。
//             選択肢・穴埋め本文までは見ない＝他分野の語や法令引用文が
//             選択肢に混入して誤った章に配属されるのを防ぐ（例: 「ずい道等の
//             建設...を除く」という選択肢を含む安全衛生管理体制の設問が
//             ずい道章に吸われる、届出の設問が選択肢の「足場」語で
//             足場章に吸われる、等）。最後の要素は catch-all（re: /.*/）に
//             して受け皿章にする。
//
// 判定はすべて lead（body.split('\n')[0]）に対して行う。設問文が「下記の
// 文章中の（イ）〜（ニ）に当てはまる語句の組合せ」等の穴埋め・組合せ形式の
// 場合、選択肢や空欄前後の説明文が body に直接埋め込まれるため、body 全体を
// 判定対象にすると無関係な語が拾われる（例: 原価管理の設問文中に「品質・
// 工程・安全・環境」という語句が出るだけで安全管理に誤分類される）。
const THEMES = {
  anzen: {
    key: 'anzen',
    label: '安全管理',
    examLabel: '1級土木施工管理技士 第1次検定',
    examOrg: '全国建設研修センター',
    src: 'src/config/civil-1-exam-questions.json',
    include:
      /安全|墜落|足場|労働災害|酸素欠乏|クレーン|玉掛け|型枠支保工|型わく支保工|土止め|土留め|明り|地山|崩壊|建設機械|埋設物|架空線|感電|有機溶剤|粉じん|保護具|ずい道.*(安全|換気)|作業主任者|安全衛生|健康管理|健康診断|疾病予防|関係機関への届出|計画の届出|届出又は報告|統括安全衛生責任者/,
    // 労働安全衛生法令に基づく「安全管理」ではない問題（土質調査・機械の
    // 構造/経済性/調達・工程/原価/品質管理・施工計画・プレキャスト接合・
    // 土工の施工技術等）を見出し文から除外する。いずれも include の語を
    // 見出しに含むが、論点自体は安全管理ではない。
    exclude:
      /土の原位置試験|建設発生土を工作物の埋戻し|建設機械(の(最近の動向|経費|組合せ|貸与|選定)|に関する)|建設機械用エンジン|施工計画における建設機械|施工計画作成の留意事項|工程管理に関する|工事原価管理|工事の原価管理|プレキャストコンクリート構造物の施工におけるプレキャスト部材の接合|安全確保及び環境保全の施工計画|仮設工事計画立案の留意事項|(急傾斜地崩壊防止工|急傾斜地の崩壊防止工)(?!.{0,20}(労働安全衛生|事業者が))|(土留め工|土留め支保工|土留め壁)の(施工|特徴)|各種土留め|下水道の開削工法における土留め工/,
    subtopics: [
      { key: 'scaffold', label: '足場・墜落・高所作業', re: /足場|墜落|高さ|安全帯|要求性能墜落制止|手すり|作業床|親綱/ },
      { key: 'excavation', label: '明り掘削・土止め支保工', re: /掘削|土止め|土留め|明り|地山|崩壊|のり面|法面/ },
      { key: 'formwork', label: '型枠支保工', re: /型枠支保工|型わく支保工/ },
      { key: 'crane', label: '移動式クレーン・玉掛け', re: /クレーン|玉掛け|つり上げ|定格荷重|ジブ/ },
      { key: 'machine', label: '車両系建設機械・締固め機械', re: /車両系建設機械|建設機械|締固め機械|アタッチメント|ブルドーザ|バックホゥ|解体用機械/ },
      { key: 'utility', label: '埋設物・架空線の防護', re: /埋設物|架空線/ },
      { key: 'health', label: '酸欠・有害物・保護具・健康管理', re: /酸素欠乏|有機溶剤|粉じん|騒音|振動|有害|石綿|アスベスト|健康管理|健康診断|疾病予防|保護具/ },
      { key: 'org', label: '安全衛生管理体制・作業主任者・教育・届出', re: /安全衛生管理体制|統括安全衛生責任者|元方事業者|特定元方事業者|作業主任者|技能講習|届出|報告|計画の届出|注文者|安全衛生教育|教育/ },
      // 感電・電気設備は出題数が少なく単独章に満たないため、工事現場の
      // 危険防止（労働災害防止対策全般）の受け皿章に統合する。
      { key: 'general_hazard', label: '感電・電気設備／工事現場の危険防止・労働災害防止対策', re: /.*/ }, // 受け皿
    ],
  },
  hoki: {
    key: 'hoki',
    label: '法規',
    examLabel: '1級土木施工管理技士 第1次検定',
    examOrg: '全国建設研修センター',
    src: 'src/config/civil-1-exam-questions.json',
    // 法規（A問題 No.50〜61 相当・年度により幅は変動）9法令の条文知識問題。
    // 「労働安全衛生法」は include に含めない（exclude で明示除外）。労働安全
    // 衛生法令に基づく設問（作業主任者の選任要否・統括安全衛生責任者・解体
    // 作業の危険防止・計画の届出・足場/型枠支保工/明り掘削等の実務措置）は
    // 全件 anzen（A-01 安全管理）の include にも一致し、実測で 100% 重複する
    // （lead ベースの突合で確認済み）。同一問題が A-01/A-02 の 2 冊に重複
    // 収録される商品構成を避けるため、労働安全衛生法は A-01 側の専管論点と
    // し、法規では扱わない。
    // 「廃棄物の処理及び清掃に関する法律」（産業廃棄物管理票＝マニフェスト
    // 制度・最終処分場）と「資源の有効な利用の促進に関する法律」（建設発生
    // 土の有効利用）は毎年 B 問題で出題される法規論点（ほぼ毎年1問）だが
    // anzen 側の include（安全・労働災害等）には一致しないため両テーマ非
    // 収録になっていた。lead 突合で確認のうえ本テーマへ追加する。
    include:
      /労働基準法|建設業法|技術者制度|監理技術者|主任技術者|元請負人|下請負人|施工体制台帳|建設業の許可|請負契約|公共工事標準請負契約約款|道路法|車両制限令|特殊な車両の通行|河川法|河川管理者|建築基準法|仮設建築物|仮設現場事務所|仮設の現場事務所|火薬類取締法|火薬類|騒音規制法|振動規制法|港則法|港長|廃棄物の処理及び清掃に関する法律|産業廃棄物|資源の有効な利用の促進に関する法律/,
    // 労働安全衛生法（令）に基づく実務措置の設問は anzen 側の専管（上記
    // 理由）。「特殊な車両」は車両制限令だが「特殊な車両系建設機械」等の
    // 誤爆は include の語彙自体が road 系に閉じているため発生しない。
    exclude: /労働安全衛生法/,
    subtopics: [
      { key: 'labor', label: '労働基準法（労働契約・賃金・労働時間・災害補償）', re: /労働基準法/ },
      {
        key: 'construction_business',
        label: '建設業法（技術者制度・元請下請・契約約款）',
        re: /建設業法|技術者制度|監理技術者|主任技術者|元請負人|下請負人|施工体制台帳|建設業の許可|請負契約|公共工事標準請負契約約款/,
      },
      { key: 'road', label: '道路法（道路占用・車両制限令）', re: /道路法|車両制限令|特殊な車両の通行/ },
      { key: 'river', label: '河川法（河川区域内の行為許可）', re: /河川法|河川管理者/ },
      { key: 'building', label: '建築基準法（仮設建築物の制限緩和）', re: /建築基準法|仮設建築物|仮設現場事務所|仮設の現場事務所/ },
      { key: 'explosive', label: '火薬類取締法（火薬類の取扱い・消費）', re: /火薬類取締法|火薬類/ },
      { key: 'noise', label: '騒音規制法（特定建設作業）', re: /騒音規制法/ },
      { key: 'vibration', label: '振動規制法（特定建設作業）', re: /振動規制法/ },
      { key: 'port', label: '港則法（港内の航行・工事の許可）', re: /港則法|港長/ },
      // 廃棄物処理法・資源有効利用促進法は他に受け皿となる論点が無いため
      // 最終要素として catch-all を兼ねる。
      { key: 'waste', label: '廃棄物処理法・資源有効利用促進法', re: /.*/ }, // 受け皿
    ],
  },
  sekokeikaku: {
    key: 'sekokeikaku',
    label: '施工計画',
    examLabel: '1級土木施工管理技士 第1次検定',
    examOrg: '全国建設研修センター',
    src: 'src/config/civil-1-exam-questions.json',
    // 施工計画の立案（事前調査・仮設工事計画・建設機械の選定/組合せ・原価
    // 管理・関係機関への届出）を対象とする。
    // 「工程管理」（ネットワーク式工程表・バーチャート・バナナ曲線等）は
    // 戦略SSOT（08_Kindle出版戦略.md）で A-06 が別テーマとして独立予定の
    // ため、本テーマの include には入れない（実測で工程管理系は lead に
    // 「工程」「ネットワーク」「バーチャート」等を含み、施工計画作成/事前
    // 調査/仮設/建設機械/原価の語とは重複しないため regex 上も分離できる）。
    // 「品質・工程・原価」のトレードオフ設問（h27-b-11 等）は lead が
    // 「工程管理を行う上で」から始まるため A-06 側に譲る。
    include:
      /施工計画(の作成|の立案|作成|立案|における建設機械|に関する)|事前調査|仮設工事(計画)?|建設機械(の(最近の動向|経費|組合せ|貸与|選定)|に関する|用エンジン)|工事の原価管理|工事原価管理|原価管理|実行予算|施工管理のサイクル|調達計画|施工管理体制|土木工事の施工に際し行う届出や許可/,
    // 施工体制台帳・施工計画書の作成手続は建設業法（A-02 法規）の専管。
    // 労働安全衛生法令に基づく実務措置（土止め・型枠支保工・クレーン等）
    // は A-01 安全管理の専管。品質管理（管理図等、lead に「工程」の語を
    // 含むだけで施工計画の論点ではない）・工程管理（ネットワーク式工程表・
    // バーチャート・バナナ曲線・「品質・工程・原価」のトレードオフ、A-06
    // 予定）は本テーマ対象外として除外する。
    exclude:
      /施工体制台帳|施工計画書の作成(?!.{0,10}留意)|品質管理における管理図|工程管理|ネットワーク式工程表|バーチャート|バナナ曲線|品質・工程・原価/,
    subtopics: [
      { key: 'planning', label: '施工計画の作成・立案', re: /施工計画(の作成|の立案|作成|立案)/ },
      { key: 'survey', label: '事前調査', re: /事前調査/ },
      { key: 'temporary', label: '仮設工事計画', re: /仮設工事/ },
      {
        key: 'machine',
        label: '建設機械の選定・組合せ・経済性',
        re: /建設機械|機械の選定/,
      },
      { key: 'cost', label: '原価管理・実行予算・経済性', re: /原価管理|実行予算/ },
      // 施工管理の基本（PDCA）・調達計画・施工管理体制・関係機関への届出は
      // それぞれ出題数が少なく単独章に満たないため、受け皿に統合する。
      { key: 'planning_other', label: '施工管理の基本（PDCA）・調達計画・施工管理体制・届出ほか', re: /.*/ }, // 受け皿
    ],
  },
  kankyo: {
    key: 'kankyo',
    label: '環境管理',
    examLabel: '1級土木施工管理技士 第1次検定',
    examOrg: '全国建設研修センター',
    src: 'src/config/civil-1-exam-questions.json',
    // 施工段階の環境保全対策（騒音・振動対策、建設リサイクル法・建設副産物
    // の有効利用、建設発生土の利用、水質汚濁・土壌汚染対策、地盤沈下対策等）
    // を対象とする。
    // 「騒音規制法」「振動規制法」「廃棄物の処理及び清掃に関する法律
    // （廃棄物処理法）」「資源の有効な利用の促進に関する法律」の**条文知識**
    // （特定建設作業の該当性・届出事項・マニフェスト制度・最終処分場の基準
    // 等）は A-02 法規（hoki）側の専管論点で、lead 突合で 100% 重複する
    // （実測 36 問）。本テーマでは「施工面の対策」（〜対策・〜の利用・
    // 〜の留意点）のみを扱い、法令条文問題は exclude で明示的に除外する。
    // 「粉じん障害の防止…じん肺法及び粉じん障害防止規則」（h27-b-24）は
    // 労働衛生管理の論点で A-01 安全管理（anzen）の health 章に専管させる。
    // 「工事の安全確保及び環境保全の施工計画立案時における留意事項」
    // （r05-b-22）は施工計画の複合トレードオフ設問で A-05 施工計画
    // （sekokeikaku）の planning 章に専管させる（lead に「施工計画立案」を
    // 含み既に収録済み）。
    include:
      /環境保全|騒音|振動|建設リサイクル|建設工事に係る資材の再資源化|建設副産物|建設発生土|産業廃棄物|マニフェスト|水質汚濁|土壌汚染|汚染土壌|地盤沈下|濁水|近接施工|情報化施工と環境負荷低減/,
    exclude:
      /騒音規制法|振動規制法|廃棄物の処理及び清掃に関する法(令|律)|資源の有効な利用の促進に関する法律|産業廃棄物管理票|じん肺法|安全確保及び環境保全の施工計画/,
    subtopics: [
      {
        key: 'recycle',
        label: '建設リサイクル法・建設副産物の有効利用',
        re: /建設リサイクル法|建設工事に係る資材の再資源化|建設副産物/,
      },
      { key: 'soil', label: '建設発生土の利用', re: /建設発生土/ },
      { key: 'noise_vib', label: '騒音・振動対策（施工面）', re: /騒音|振動/ },
      { key: 'water_soil', label: '水質汚濁・濁水・土壌汚染対策', re: /水質汚濁|濁水|土壌汚染|汚染土壌/ },
      // 環境保全対策全般（薬液注入工事・シールド工事の地盤沈下対策等）は
      // 出題数が少なく単独章に満たないため受け皿に統合する。
      { key: 'general', label: '環境保全対策・地盤沈下対策ほか', re: /.*/ }, // 受け皿
    ],
  },
  hinshitsu: {
    key: 'hinshitsu',
    label: '品質管理',
    examLabel: '1級土木施工管理技士 第1次検定',
    examOrg: '全国建設研修センター',
    src: 'src/config/civil-1-exam-questions.json',
    // B問題（施工管理法）に限定する。A問題の「鉄筋の加工・組立」（h26-a-11
    // 等）は lead が B問題の検査設問と同一文言だが、論点は専門土木の施工
    // 技術であり品質管理（検査・管理手法）ではない。regex では区別できない
    // ため parts で切り分ける。
    parts: ['B'],
    // 施工管理法（B問題）の「品質管理」パートを対象とする: 品質管理の基本
    // （PDCA・品質特性・品質マネジメントシステム・ヒストグラム・管理図）/
    // 土工（盛土の締固め）の品質管理/道路舗装の品質管理/レディーミクスト
    // コンクリートの受入れ検査・コンクリートの施工品質管理/鉄筋・非破壊
    // 検査。図版依存（ヒストグラム・管理図の実図を読ませる設問）は実測で
    // 0 件（lead 判定後の候補 60 問はいずれも文章 or ①〜④/(イ)〜(ニ)の
    // 組合せ形式で図は不要）。
    include:
      /品質管理|品質マネジメント|品質特性|ヒストグラム|管理図|レディーミクストコンクリート|受入れ検査|非破壊検査|非破壊試験|微破壊|締固め管理|鉄筋の(継手|ガス圧接|加工|組立)|機械式鉄筋継手|鉄筋の各種継手|強度(を)?推定|鉄筋位置|健全度/,
    // 見出しに「品質」を含むが論点が品質管理（施工管理法）ではない設問を
    // 除外する。実測で誤爆した4パターン:
    //  - 「軟弱地盤対策工法の品質管理」（h26-a-05）: A問題・専門土木の
    //    工法選定/施工技術の設問（防塵対策・撹拌回数管理等）で、施工管理法
    //    の品質管理論点（検査・規格値・管理図等）ではない。
    //  - 「重力式コンクリートダムで各部位のダムコンクリートの配合区分と
    //    必要な品質」（r02-a-34, r05-a-34）: A問題・材料/配合設計の設問。
    //  - 「コンクリート用細骨材の品質」（r04-a-06, r07-a-11）「コンクリート
    //    の品質」（r04-a-07）: A問題・コンクリート材料工学の設問で、施工
    //    管理法の品質管理（検査・管理図等の管理手法）ではない。
    //  - 「工程管理を行う上で品質・工程・原価に関する」（h27-b-11・r04-b-27
    //    ・r06-b-26・r07-b-26）: 主論点は工程管理側のトレードオフ設問。
    //    sekokeikaku の exclude と同じ理由で A-06（工程管理）に譲る
    //    （sekokeikaku 側も同一理由で対象外としている）。
    exclude:
      /軟弱地盤対策工法|重力式コンクリートダム|コンクリート用細骨材の品質|^コンクリートの品質に関する|工程管理を行う上で/,
    subtopics: [
      {
        key: 'basic',
        label: '品質管理の基本・品質マネジメント・ヒストグラム/管理図',
        re: /^品質管理に関する|^品質マネジメント|品質管理における品質特性|品質管理における管理図|ヒストグラムと管理図|品質管理の測定値をプロットした|土木工事の品質管理図|品質管理に関する下記|土木工事の品質管理に関する|建設工事の品質管理における「工種」/,
      },
      { key: 'soil', label: '盛土（土工）の品質管理・情報化施工の締固め管理', re: /盛土|締固め管理/ },
      { key: 'pavement', label: '道路舗装の品質管理（路床・路盤・アスファルト）', re: /舗装|路床や路盤/ },
      {
        key: 'concrete',
        label: 'レディーミクストコンクリートの受入検査・コンクリートの品質管理',
        re: /レディーミクストコンクリート|コンクリートの施工(における|の)品質管理/,
      },
      // 鉄筋の継手・圧接・組立検査、非破壊検査（コンクリート構造物の強度・
      // 鉄筋位置推定・健全度）は個々の出題数が少ないため受け皿章として統合する。
      { key: 'ndt', label: '鉄筋の継手・加工組立の検査・非破壊検査ほか', re: /.*/ }, // 受け皿
    ],
  },
  koutei: {
    key: 'koutei',
    label: '工程管理',
    examLabel: '1級土木施工管理技士 第1次検定',
    examOrg: '全国建設研修センター',
    src: 'src/config/civil-1-exam-questions.json',
    // 施工管理法（B問題）の「工程管理」パートを対象とする: 工程管理の基本・
    // 日程計画/作業手順・「品質・工程・原価」トレードオフ（sekokeikaku・
    // hinshitsu 設計時に主論点側として本テーマへ譲る裁定済み: h27-b-11,
    // r04-b-27, r06-b-26, r07-b-26）/各種工程表の種類と特徴（バーチャート・
    // ガントチャート・座標式・斜線式）/ネットワーク式工程表・クリティカル
    // パス計算/工程管理曲線（バナナ曲線）・出来高管理。
    // 図版依存（「下図のネットワーク式工程表」等、実図読取りが前提の設問）
    // は実測で 48 候補中 13 件（ネットワーク式工程表の計算問題が中心）。
    // FIGURE_RE により自動除外される。
    include:
      /工程|ネットワーク|バーチャート|ガントチャート|座標式|斜線式|出来高|バナナ曲線|クリティカルパス/,
    // 「品質管理における管理図に関する次の記述のうち，工程が安定している
    // 状態を示しているものはどれか。」（h28-b-25）は見出しの主題が「品質
    // 管理における管理図」であり、「工程」の語は選択肢由来の管理図の判定
    // 基準（工程が安定 = 品質管理論点）に過ぎず工程管理の論点ではない。
    // A-05 品質管理（hinshitsu）の basic 章の専管論点として除外する
    // （実測突合: hinshitsu 側は現行 regex では未収録＝拾い漏れだが、本
    // テーマで拾うべきではないため exclude で明示除外する。是正は
    // hinshitsu 側の担当で本タスクでは行わない）。
    exclude: /品質管理における管理図/,
    subtopics: [
      { key: 'network', label: 'ネットワーク式工程表・クリティカルパス', re: /ネットワーク/ },
      {
        key: 'chart_types',
        label: '各種工程表の種類と特徴（バーチャート・ガントチャート・座標式・斜線式）',
        re: /工程表(の種類|に用いられる各工程表|に用いられる[^。]*工程表|の特(徴|長))|各工程表の特徴|バーチャート|横線式工程表/,
      },
      { key: 'curve', label: '工程管理曲線（バナナ曲線）・出来高管理', re: /バナナ曲線|工程曲線|出来高/ },
      // 工程管理の基本・日程計画・作業手順・「品質・工程・原価」トレード
      // オフは出題パターンが多岐で単独章に切り出すほどの塊にならないため
      // 受け皿章として統合する。
      { key: 'basic', label: '工程管理の基本・日程計画・品質工程原価', re: /.*/ }, // 受け皿
    ],
  },
}

function parseArgs(argv) {
  const a = { theme: 'anzen', outDir: null, format: 'both' }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--theme') a.theme = argv[++i]
    else if (argv[i] === '--outDir') a.outDir = argv[++i]
    else if (argv[i] === '--format') a.format = argv[++i]
  }
  return a
}

const YEAR_LABEL = (y) => (y.startsWith('h') ? `H${y.slice(1)}` : `R${y.slice(1)}`)

// 元 JSON（サイト MDX 派生）に残る HTML 数値エンティティを実文字へ復号し、
// 穴埋め空欄の記号（▆ / ｜　　｜）を ［　　］ に正規化する。
// 例: &#x2460;→① / &#x2586;→▆→［　　］。放置すると Kindle で
// 「&#x2586;」という生文字列が見えてしまう。
const normalizeText = (s) =>
  (s || '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&sup2;/g, '²')
    .replace(/&sup3;/g, '³')
    .replace(/▆+/g, '［　　］')
    // ラベル付き穴埋め（｜　(イ)　｜ 等）はラベルを保持したまま角括弧化する
    .replace(/｜(　*\((?:イ|ロ|ハ|ニ)\)　*)｜/g, '［$1］')
    .replace(/｜　+｜/g, '［　　］')

const normalizeQuestion = (q) => ({
  ...q,
  body: normalizeText(q.body),
  options: (q.options || []).map((o) => ({ ...o, text: normalizeText(o.text) })),
  optionExplanations: (q.optionExplanations || []).map((e) => ({ ...e, text: normalizeText(e.text) })),
})

// 設問の見出し文（主題文）。body の最初の行を指す。穴埋め・組合せ形式の
// 設問は選択肢や空欄前後の説明文が body に直接埋め込まれるため、
// include/exclude/subtopics の判定はすべてこの lead に対して行う
// （body 全体を対象にすると無関係な語で他分野の設問を拾ってしまう）。
const lead = (body) => (body || '').split('\n')[0]

// 図版に依存する設問（画像なしでは成立しない）を検出
const FIGURE_RE = /下図|次図|次の図|下記の図|上図|図のように|図に示す|右図|左図|<img[\s>]/

// 正規化（重複検出・論点まとめの dedupe 用）
const norm = (s) =>
  (s || '')
    .replace(/\s+/g, '')
    .replace(/[，、．。･・()（）「」『』【】［］\[\]"'`*＊]/g, '')
    .replace(/[0-9０-９]+/g, '#')

function assignSubtopic(theme, q) {
  const hay = lead(q.body)
  for (const st of theme.subtopics) if (st.re.test(hay)) return st.key
  return theme.subtopics[theme.subtopics.length - 1].key
}

// 論点まとめ: ○解説（正しい知識）を集約し、近重複を圧縮して箇条書き化
function buildRonten(questions) {
  const seen = new Set()
  const bullets = []
  for (const q of questions) {
    for (const e of q.optionExplanations || []) {
      if (!e.correct) continue
      let t = (e.text || '').trim()
      if (t.length < 12) continue
      t = t.replace(/\s+/g, '').replace(/[。.]$/, '')
      const k = norm(t).slice(0, 28)
      if (seen.has(k)) continue
      seen.add(k)
      bullets.push(t)
    }
  }
  return bullets
}

const correctPoint = (q) => {
  const ce = (q.optionExplanations || []).find((e) => e.num === q.correct)
  return ce ? ce.text.replace(/\s+/g, '').replace(/[。.]$/, '') : ''
}

// ---- モデル構築（チャネル非依存の中間表現）--------------------------------
function buildModel(theme, questions) {
  const usable = questions.filter((q) => !FIGURE_RE.test(q.body))
  const figureSkipped = questions.length - usable.length

  const buckets = new Map(theme.subtopics.map((s) => [s.key, []]))
  for (const q of usable) buckets.get(assignSubtopic(theme, q)).push(q)

  let dupCompressed = 0
  let rendered = 0
  const chapters = []
  let n = 0
  for (const st of theme.subtopics) {
    const arr = buckets.get(st.key)
    if (!arr.length) continue
    arr.sort((a, b) => (a.year < b.year ? -1 : a.year > b.year ? 1 : a.no - b.no))

    const usedBody = new Map()
    const items = []
    for (const q of arr) {
      const bk = norm(q.body)
      if (usedBody.has(bk)) {
        usedBody.get(bk).dupYears.push(YEAR_LABEL(q.year))
        dupCompressed++
        continue
      }
      const item = { q, dupYears: [] }
      usedBody.set(bk, item)
      items.push(item)
      rendered++
    }
    n++
    chapters.push({
      n,
      key: st.key,
      label: st.label,
      ronten: buildRonten(arr).slice(0, 18),
      items,
    })
  }
  return {
    theme,
    title: `${theme.examLabel} 択一・論点別トレーニング`,
    subtitle: theme.label,
    chapters,
    stats: { extracted: questions.length, figureSkipped, dupCompressed, rendered },
  }
}

// =====================================================================
// Markdown / 印刷 HTML レンダラ（note 用）
// =====================================================================
function renderMarkdown(model) {
  const t = model.theme
  const fm = [
    '---',
    `title: "${model.title} ― ${model.subtitle}"`,
    'notePricing: paid',
    'noteSeries: "1級土木 択一・論点別トレーニング"',
    'published: false',
    '---',
    '',
  ].join('\n')

  const out = [fm, `# ${model.title} ― ${model.subtitle}`, '']
  out.push(
    [
      `本書は ${t.examLabel}「${t.label}」の択一過去問（H26〜R07）を、`,
      '**年度別ではなく論点別**に解体・再構成した暗記特化教材です。同じ論点の問題を',
      '年度をまたいで連続演習することで「どこが繰り返し問われるか」が体で分かります。',
      '各論点の冒頭に、過去問の正答選択肢から抽出した**「論点まとめ（覚える正しい知識）」**を',
      '配置しました。生の年度別過去問では得られない、横断・体系化された一冊です。',
    ].join('\n'),
  )
  out.push('')
  out.push(`> ${CREDIT_BODY}`)
  out.push('')

  for (const ch of model.chapters) {
    out.push(`## ${ch.n}. ${ch.label}`, '')
    if (ch.ronten.length) {
      out.push('### 論点まとめ（覚える正しい知識）', '')
      for (const b of ch.ronten) out.push(`- ${b}`)
      out.push('')
    }
    out.push(`### 一問一答（${ch.items.length} 問・H26〜R07）`, '')
    for (const { q, dupYears } of ch.items) {
      const tag = `${YEAR_LABEL(q.year)} ${q.part}-${String(q.no).padStart(2, '0')}`
      out.push(`**［${tag}］** ${q.body}`, '')
      out.push((q.options || []).map((o) => `${o.num}. ${o.text}`).join('\n'), '')
      out.push(`**正答 ${q.correct}** ― ${correctPoint(q)}`)
      if (dupYears.length) out.push('', `> 同趣旨で再出題: ${dupYears.join(' / ')}`)
      out.push('', '---', '')
    }
  }
  return out.join('\n')
}

const PRINT_CSS = `
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family:"Yu Gothic","YuGothic","Meiryo",sans-serif;
    font-size:10pt; line-height:1.7; color:#1a1a1a; margin:0; }
  h1 { font-size:16pt; line-height:1.45; border-bottom:2px solid #b5651d;
    padding-bottom:8px; margin:0 0 16px; color:#7a3e0c; }
  h2 { font-size:13pt; background:#fbf0e4; border-left:5px solid #b5651d;
    padding:6px 10px; margin:0 0 12px; color:#7a3e0c;
    break-before:page; page-break-before:always; }
  h2:first-of-type { break-before:auto; page-break-before:auto; }
  h3 { font-size:11.5pt; color:#7a3e0c; border-bottom:1px solid #e2cdb8;
    padding-bottom:3px; margin:18px 0 9px; }
  p { margin:0 0 7px; }
  strong { font-weight:700; color:#14202b; }
  ul { margin:0 0 11px; padding-left:1.3em; }
  li { margin-bottom:4px; }
  blockquote { margin:4px 0 8px; padding:2px 10px; border-left:3px solid #d9b48f;
    background:#fbf6f0; color:#555; font-size:9pt; }
  hr { border:none; border-top:1px solid #e0d3c4; margin:12px 0; }
`

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

function mdToHtml(md) {
  const lines = md.split('\n')
  const html = []
  let para = []
  let list = []
  const flushP = () => {
    if (para.length) { html.push(`<p>${para.map(inline).join('<br/>')}</p>`); para = [] }
  }
  const flushList = () => {
    if (list.length) { html.push(`<ul>${list.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`); list = [] }
  }
  const flush = () => { flushP(); flushList() }
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) flush()
    else if (/^### /.test(line)) { flush(); html.push(`<h3>${inline(line.slice(4))}</h3>`) }
    else if (/^## /.test(line)) { flush(); html.push(`<h2>${inline(line.slice(3))}</h2>`) }
    else if (/^# /.test(line)) { flush(); html.push(`<h1>${inline(line.slice(2))}</h1>`) }
    else if (/^---$/.test(line)) { flush(); html.push('<hr/>') }
    else if (/^> /.test(line)) { flush(); html.push(`<blockquote>${inline(line.slice(2))}</blockquote>`) }
    else if (/^- /.test(line)) { flushP(); list.push(line.slice(2)) }
    else { flushList(); para.push(line) }
  }
  flush()
  return html.join('\n')
}

function renderPrintHtml(md, title) {
  const body = mdToHtml(md.replace(/^---[\s\S]*?---\n/, ''))
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`
}

// =====================================================================
// EPUB レンダラ（Kindle / KDP 用・リフロー）
// EPUB 組立（container/nav/ncx/opf/zip）は scripts/lib/epub-writer.mjs に共通化。
// ここではテーマ固有のページ（扉・出典・使い方・各章 XHTML）と CSS を組み立てる。
// =====================================================================
const EPUB_CSS = `
body { font-family: serif; line-height: 1.7; margin: 0 4%; }
h1 { font-size: 1.5em; line-height: 1.4; margin: 1em 0 0.8em;
  border-bottom: 3px solid #b5651d; padding-bottom: 0.3em; color: #7a3e0c; }
h2 { font-size: 1.2em; margin: 1.4em 0 0.6em; padding: 0.3em 0.5em;
  background: #fbf0e4; border-left: 4px solid #b5651d; color: #7a3e0c; }
p { margin: 0 0 0.6em; }
ul { margin: 0 0 1em; padding-left: 1.2em; }
li { margin-bottom: 0.4em; }
ol.opts { margin: 0.4em 0 0.6em; padding-left: 1.4em; }
ol.opts li { margin-bottom: 0.45em; }
.qbody { margin-top: 0.6em; }
.chapnav { font-size: 0.8em; color: #8a6a4a; border-bottom: 1px solid #e2cdb8;
  padding-bottom: 0.3em; margin: 0 0 0.8em; }
.qhead { border-left: 6px solid #7a3e0c; background: #fbf0e4;
  padding: 0.35em 0.6em; margin: 0.2em 0 0.9em; }
.qno { font-size: 1.3em; font-weight: bold; color: #7a3e0c; }
.qtag { font-size: 0.85em; color: #8a6a4a; margin-left: 1em; }
.turn { font-size: 0.85em; color: #7a3e0c; text-align: right; margin-top: 1.6em; }
.ansband { background: #2f7a3e; color: #ffffff; font-weight: bold;
  font-size: 1.15em; padding: 0.3em 0.7em; margin: 0.2em 0 0.9em; }
.ronten { border: 1px solid #d9b48f; background: #fbf6f0;
  padding: 0.7em 0.9em; margin: 0 0 1.2em; }
.ronten ul { margin: 0; }
ul.expl { list-style: none; margin: 0.8em 0 1em; padding-left: 0; }
ul.expl li { margin-bottom: 0.7em; padding-left: 1.6em; text-indent: -1.6em; }
.ok { font-weight: bold; color: #2f7a3e; }
.ng { font-weight: bold; color: #a33333; }
.dup { font-size: 0.85em; color: #666; }
.cover-title { text-align: center; margin-top: 25%; }
.cover-title h1 { border: none; font-size: 1.9em; color: #7a3e0c; }
.cover-title .sub { font-size: 1.3em; margin-top: 0.5em; }
.cover-title .author { margin-top: 3em; font-size: 1.1em; }
.front { margin-top: 2em; }
.front h1 { border-bottom: none; }
.credit { font-size: 0.9em; color: #444; line-height: 1.9; }
.back a { color: #1d5a8a; }
.back .linkbox { border: 1px solid #d9b48f; background: #fbf6f0;
  padding: 0.7em 0.9em; margin: 0.6em 0 1.1em; }
.back .linkbox p { margin: 0 0 0.3em; }
.back .url { font-size: 0.9em; }
hr { border: none; border-top: 1px solid #ddd; margin: 1em 0; }
`

// 章扉: 章タイトル + 論点まとめ（覚える正しい知識・囲み罫で教材感を出す）
function chapterIntroXhtml(ch) {
  const parts = [`<h1>${ch.n}. ${xesc(ch.label)}</h1>`]
  if (ch.ronten.length) {
    parts.push('<h2>論点まとめ（覚える正しい知識）</h2>')
    parts.push(`<div class="ronten"><ul>${ch.ronten.map((b) => `<li>${xinline(b)}</li>`).join('')}</ul></div>`)
  }
  parts.push(`<p>この論点の一問一答は ${ch.items.length} 問（H26〜R07）。次のページから、1問ごとに「問題 → ページをめくって正答・解説」の順に進みます。</p>`)
  return xhtmlDoc(`${ch.n}. ${ch.label}`, parts.join('\n'))
}

const qTag = (q) => `${YEAR_LABEL(q.year)} ${q.part}-${String(q.no).padStart(2, '0')}`

// 問題ページ（1問=1ファイル。長い設問はリフローで複数ページに自然に流れる）
function questionXhtml(ch, item, idx) {
  const { q } = item
  const opts = [...(q.options || [])]
    .sort((a, b) => a.num - b.num)
    .map((o) => `<li>${xinline(o.text)}</li>`)
    .join('')
  const parts = [
    `<p class="chapnav">${ch.n}. ${xesc(ch.label)}（問 ${idx + 1}/${ch.items.length}）</p>`,
    `<div class="qhead"><span class="qno">問 ${idx + 1}</span><span class="qtag">［${xesc(qTag(q))}］</span></div>`,
    `<p class="qbody">${xinline(q.body)}</p>`,
    `<ol class="opts">${opts}</ol>`,
    '<p class="turn">正答・解説は次のページ ▶</p>',
  ]
  return xhtmlDoc(`問 ${idx + 1}［${qTag(q)}］`, parts.join('\n'))
}

// 解答ページ（改ページはファイル境界で保証される）
// 正答に加え、全選択肢の正誤理由（○=適当/×=誤り）を列挙する。
// 解説が元データに無い選択肢はスキップ（創作しない）。
function answerXhtml(ch, item, idx) {
  const { q, dupYears } = item
  const parts = [
    `<p class="chapnav">${ch.n}. ${xesc(ch.label)}（問 ${idx + 1}/${ch.items.length}）　［${xesc(qTag(q))}］</p>`,
    `<p class="ansband">正答　${q.correct}</p>`,
  ]
  const expls = [...(q.optionExplanations || [])]
    .filter((e) => e.text && e.text.trim())
    .sort((a, b) => a.num - b.num)
  if (expls.length) {
    parts.push('<ul class="expl">')
    for (const e of expls) {
      const mark = e.correct ? '<span class="ok">○</span>' : '<span class="ng">×</span>'
      parts.push(`<li>${mark} <strong>${e.num}.</strong> ${xinline(e.text)}</li>`)
    }
    parts.push('</ul>')
  }
  if (dupYears.length) parts.push(`<p class="dup">同趣旨で再出題: ${xesc(dupYears.join(' / '))}</p>`)
  return xhtmlDoc(`正答 問 ${idx + 1}［${qTag(q)}］`, parts.join('\n'))
}

function renderEpub(model, outDir) {
  const t = model.theme

  // 前付け
  const titlePage = xhtmlDoc(model.title,
    `<div class="cover-title"><h1>${xesc(model.title)}</h1>
<p class="sub">― ${xesc(model.subtitle)} ―</p>
<p class="author">${xesc(AUTHOR)}</p></div>`)
  const creditPage = xhtmlDoc('出典・免責',
    `<div class="front"><h1>出典・免責</h1>
<p class="credit"><strong>出典</strong><br/>${xesc(CREDIT_BODY)}</p>
<p class="credit"><strong>免責</strong><br/>${xesc(DISCLAIMER)}</p>
<p class="credit"><strong>著者</strong>　${xesc(AUTHOR)}<br/>
<strong>発行</strong>　${xesc(PUBLISHER)}</p></div>`)
  const introPage = xhtmlDoc('本書の使い方',
    `<div class="front"><h1>本書の使い方</h1>
<p>本書は ${xesc(t.examLabel)}「${xesc(t.label)}」の択一過去問（H26〜R07）を、<strong>年度別ではなく論点別</strong>に解体・再構成した暗記特化教材です。</p>
<p>同じ論点の問題を年度をまたいで連続演習することで「どこが繰り返し問われるか」が体で分かります。各論点の冒頭には、過去問の正答選択肢から抽出した<strong>「論点まとめ（覚える正しい知識）」</strong>を配置しました。生の年度別過去問では得られない、横断・体系化された一冊です。</p>
<p>1問ごとに「問題 → ページをめくって正答・解説」の順に進みます。正答・解説ページでは、各選択肢の記述が適当なものを<strong>○</strong>、誤っているものを<strong>×</strong>で示しています。</p>
<p>図版を要する設問は本書では割愛し、文章で完結する設問のみを収録しています。</p></div>`)

  // 1問=1ファイル + 解答=1ファイル。ファイル境界は Kindle が必ず改ページするので、
  // 「問題 → めくって正答・解説」の読書体験を CSS 改ページに頼らず保証する。
  // 問題/解答ページは inToc: false（目次には章扉だけを並べる）。
  const pages = [
    { id: 'p-title', href: 'p-title.xhtml', label: '扉', content: titlePage },
    { id: 'p-credit', href: 'p-credit.xhtml', label: '出典・免責', content: creditPage },
    { id: 'p-intro', href: 'p-intro.xhtml', label: '本書の使い方', content: introPage },
  ]
  for (const ch of model.chapters) {
    const nn = String(ch.n).padStart(2, '0')
    pages.push({
      id: `chap-${nn}`,
      href: `chap-${nn}.xhtml`,
      label: `${ch.n}. ${ch.label}`,
      content: chapterIntroXhtml(ch),
    })
    ch.items.forEach((item, i) => {
      const qq = `c${nn}-q${String(i + 1).padStart(3, '0')}`
      pages.push({
        id: qq, href: `${qq}.xhtml`, label: `問 ${i + 1}`, inToc: false,
        content: questionXhtml(ch, item, i),
      })
      pages.push({
        id: `${qq}a`, href: `${qq}a.xhtml`, label: `正答 ${i + 1}`, inToc: false,
        content: answerXhtml(ch, item, i),
      })
    })
  }

  // 巻末: 学習導線（サイト・note）と著者プロフィール
  // XHTML 属性内なので & は &amp; にエスケープする（生 & は epubcheck FATAL）
  const utm = `?utm_source=kindle&amp;utm_medium=ebook&amp;utm_campaign=takuitsu-${t.key}`
  const nextPage = xhtmlDoc('学習をさらに進めたい方へ',
    `<div class="front back"><h1>学習をさらに進めたい方へ</h1>
<p>本書で「${xesc(t.label)}」の論点を固めたら、次の一手にお使いください。</p>
<div class="linkbox"><p><strong>年度別の全問解説（無料）</strong></p>
<p>試験対策サイト「doboku-note」で、第1次検定の年度別過去問解説と学習ガイドを無料公開しています。</p>
<p class="url"><a href="https://doboku-note.com/${utm}">https://doboku-note.com</a></p></div>
<div class="linkbox"><p><strong>第2次検定対策（note）</strong></p>
<p>施工経験記述の完成答案集・学科記述のテーマ別対策など、第2次検定の教材を note で公開しています。</p>
<p class="url"><a href="https://note.com/dobokunote/m/md29a34906314">1級土木 二次検定まるごとパック（経験記述＋学科記述＋直前暗記）</a></p>
<p class="url"><a href="https://note.com/dobokunote">note マガジン一覧（dobokunote）</a></p></div>
<p>本シリーズ（科目別・論点別過去問）は、法規・施工計画などの科目を順次刊行予定です。</p></div>`)
  const authorPage = xhtmlDoc('doboku-note について',
    `<div class="front back"><h1>doboku-note について</h1>
<p><strong>doboku-note</strong> は、土木・建設系資格の試験対策サイトです。1級土木施工管理技士・技術士などの過去問解説と学習コンテンツを公開しています。</p>
<p>運営者は元・地方自治体の土木職（発注者の立場で公共土木工事に携わる）。技術士第二次試験（総合技術監理部門）合格。実務と受験の両面から教材を制作しています。</p>
<p class="url"><a href="https://doboku-note.com/${utm}">https://doboku-note.com</a></p></div>`)
  pages.push({ id: 'p-next', href: 'p-next.xhtml', label: '学習をさらに進めたい方へ', content: nextPage })
  pages.push({ id: 'p-author', href: 'p-author.xhtml', label: '著者プロフィール', content: authorPage })

  return writeEpub(
    {
      meta: {
        title: `${model.title} ― ${model.subtitle}`,
        author: AUTHOR,
        publisher: PUBLISHER,
        description: `${t.examLabel}「${t.label}」の択一過去問（H26〜R07）を論点別に再構成した暗記特化教材。`,
        rights: CREDIT_BODY,
      },
      css: EPUB_CSS,
      pages,
    },
    { outDir, fileName: `${t.key}.epub` },
  )
}

// =====================================================================
// 合本（A-00）: 全6テーマを部立てで1冊に結合した EPUB を出す。
// 章番号は全体通し。テーマ間の収録重複は THEMES 設計時に id 突合で 0 を
// 確認済み（各テーマの専管ルールで排他）。学習順（施工計画→工程→安全→
// 品質→環境→法規）で並べる。
const GOUBON = {
  key: 'goubon',
  label: '全科目合本',
  order: ['sekokeikaku', 'koutei', 'anzen', 'hinshitsu', 'kankyo', 'hoki'],
  examLabel: '1級土木施工管理技士 第1次検定',
}

function renderGoubonEpub(models, outDir) {
  const title = `${GOUBON.examLabel} 択一・論点別トレーニング 全科目合本`
  const totalQ = models.reduce((s, m) => s + m.stats.rendered, 0)

  const titlePage = xhtmlDoc(title,
    `<div class="cover-title"><h1>${xesc(`${GOUBON.examLabel} 択一・論点別トレーニング`)}</h1>
<p class="sub">― 全科目合本（${models.map((m) => m.theme.label).join('・')}） ―</p>
<p class="author">${xesc(AUTHOR)}</p></div>`)
  const creditPage = xhtmlDoc('出典・免責',
    `<div class="front"><h1>出典・免責</h1>
<p class="credit"><strong>出典</strong><br/>${xesc(CREDIT_BODY)}</p>
<p class="credit"><strong>免責</strong><br/>${xesc(DISCLAIMER)}</p>
<p class="credit"><strong>著者</strong>　${xesc(AUTHOR)}<br/>
<strong>発行</strong>　${xesc(PUBLISHER)}</p></div>`)
  const introPage = xhtmlDoc('本書の使い方',
    `<div class="front"><h1>本書の使い方</h1>
<p>本書は ${xesc(GOUBON.examLabel)}の択一過去問（H26〜R07）を、<strong>年度別ではなく論点別</strong>に解体・再構成した暗記特化教材の<strong>全科目合本</strong>です。${models.map((m) => `「${xesc(m.theme.label)}」`).join('')}の6科目・全${totalQ}問を1冊に収録しています。</p>
<p>同じ論点の問題を年度をまたいで連続演習することで「どこが繰り返し問われるか」が体で分かります。各論点の冒頭には、過去問の正答選択肢から抽出した<strong>「論点まとめ（覚える正しい知識）」</strong>を配置しました。</p>
<p>1問ごとに「問題 → ページをめくって正答・解説」の順に進みます。正答・解説ページでは、各選択肢の記述が適当なものを<strong>○</strong>、誤っているものを<strong>×</strong>で示しています。</p>
<p>図版を要する設問は本書では割愛し、文章で完結する設問のみを収録しています。</p></div>`)

  const pages = [
    { id: 'p-title', href: 'p-title.xhtml', label: '扉', content: titlePage },
    { id: 'p-credit', href: 'p-credit.xhtml', label: '出典・免責', content: creditPage },
    { id: 'p-intro', href: 'p-intro.xhtml', label: '本書の使い方', content: introPage },
  ]

  // 章番号を全体通しに振り直してから各部を組み立てる
  let n = 0
  models.forEach((model, pi) => {
    const pn = pi + 1
    const partPage = xhtmlDoc(`第${pn}部 ${model.theme.label}`,
      `<div class="cover-title"><h1>第${pn}部　${xesc(model.theme.label)}</h1>
<p class="sub">${model.chapters.length} 論点・${model.stats.rendered} 問（H26〜R07）</p></div>`)
    pages.push({ id: `part-${pn}`, href: `part-${pn}.xhtml`, label: `第${pn}部 ${model.theme.label}`, content: partPage })
    for (const ch of model.chapters) {
      ch.n = ++n
      const nn = String(ch.n).padStart(2, '0')
      pages.push({
        id: `chap-${nn}`,
        href: `chap-${nn}.xhtml`,
        label: `${ch.n}. ${ch.label}`,
        content: chapterIntroXhtml(ch),
      })
      ch.items.forEach((item, i) => {
        const qq = `c${nn}-q${String(i + 1).padStart(3, '0')}`
        pages.push({ id: qq, href: `${qq}.xhtml`, label: `問 ${i + 1}`, inToc: false, content: questionXhtml(ch, item, i) })
        pages.push({ id: `${qq}a`, href: `${qq}a.xhtml`, label: `正答 ${i + 1}`, inToc: false, content: answerXhtml(ch, item, i) })
      })
    }
  })

  const utm = `?utm_source=kindle&amp;utm_medium=ebook&amp;utm_campaign=takuitsu-goubon`
  const nextPage = xhtmlDoc('学習をさらに進めたい方へ',
    `<div class="front back"><h1>学習をさらに進めたい方へ</h1>
<p>本書で第1次検定の論点を固めたら、次の一手にお使いください。</p>
<div class="linkbox"><p><strong>年度別の全問解説（無料）</strong></p>
<p>試験対策サイト「doboku-note」で、第1次検定の年度別過去問解説と学習ガイドを無料公開しています。</p>
<p class="url"><a href="https://doboku-note.com/${utm}">https://doboku-note.com</a></p></div>
<div class="linkbox"><p><strong>第2次検定対策（note）</strong></p>
<p>施工経験記述の完成答案集・学科記述のテーマ別対策など、第2次検定の教材を note で公開しています。</p>
<p class="url"><a href="https://note.com/dobokunote/m/md29a34906314">1級土木 二次検定まるごとパック（経験記述＋学科記述＋直前暗記）</a></p>
<p class="url"><a href="https://note.com/dobokunote">note マガジン一覧（dobokunote）</a></p></div>
<p>本シリーズは科目別の分冊（安全管理・法規・施工計画・環境管理・品質管理・工程管理）でも刊行しています。</p></div>`)
  const authorPage = xhtmlDoc('doboku-note について',
    `<div class="front back"><h1>doboku-note について</h1>
<p><strong>doboku-note</strong> は、土木・建設系資格の試験対策サイトです。1級土木施工管理技士・技術士などの過去問解説と学習コンテンツを公開しています。</p>
<p>運営者は元・地方自治体の土木職（発注者の立場で公共土木工事に携わる）。技術士第二次試験（総合技術監理部門）合格。実務と受験の両面から教材を制作しています。</p>
<p class="url"><a href="https://doboku-note.com/${utm}">https://doboku-note.com</a></p></div>`)
  pages.push({ id: 'p-next', href: 'p-next.xhtml', label: '学習をさらに進めたい方へ', content: nextPage })
  pages.push({ id: 'p-author', href: 'p-author.xhtml', label: '著者プロフィール', content: authorPage })

  return writeEpub(
    {
      meta: {
        title,
        author: AUTHOR,
        publisher: PUBLISHER,
        description: `${GOUBON.examLabel}の択一過去問（H26〜R07）を論点別に再構成した暗記特化教材の全科目合本（6科目・全${totalQ}問）。`,
        rights: CREDIT_BODY,
      },
      css: EPUB_CSS,
      pages,
    },
    { outDir, fileName: 'goubon.epub' },
  )
}

async function buildGoubon(args) {
  const outDir = resolve(REPO, args.outDir || '.tmp/takuitsu-goubon')
  mkdirSync(outDir, { recursive: true })
  const models = []
  for (const key of GOUBON.order) {
    const theme = THEMES[key]
    const data = JSON.parse(readFileSync(resolve(REPO, theme.src), 'utf8'))
    const all = []
    for (const y of data.years) for (const q of y.questions) all.push(normalizeQuestion({ ...q, year: y.year }))
    const questions = all.filter((q) => {
      if (theme.parts && !theme.parts.includes(q.part)) return false
      const head = lead(q.body)
      return theme.include.test(head) && !(theme.exclude && theme.exclude.test(head))
    })
    models.push(buildModel(theme, questions))
  }
  const epub = renderGoubonEpub(models, outDir)
  console.log('テーマ: 全科目合本')
  for (const m of models) console.log(`  ${m.theme.label}: 収録 ${m.stats.rendered} 問・${m.chapters.length} 論点`)
  console.log(`合計 収録 ${models.reduce((s, m) => s + m.stats.rendered, 0)} 問・${models.reduce((s, m) => s + m.chapters.length, 0)} 論点`)
  console.log(`出力先: ${outDir}`)
  console.log(`  - ${epub.split('/').pop()}`)
}

// =====================================================================
async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.theme === 'goubon') return buildGoubon(args)
  const theme = THEMES[args.theme]
  if (!theme) throw new Error(`未知のテーマ: ${args.theme}（${Object.keys(THEMES).join(',')}）`)

  const data = JSON.parse(readFileSync(resolve(REPO, theme.src), 'utf8'))
  const all = []
  for (const y of data.years) for (const q of y.questions) all.push(normalizeQuestion({ ...q, year: y.year }))
  const questions = all.filter((q) => {
    if (theme.parts && !theme.parts.includes(q.part)) return false
    const head = lead(q.body)
    return theme.include.test(head) && !(theme.exclude && theme.exclude.test(head))
  })

  const outDir = resolve(REPO, args.outDir || `.tmp/takuitsu-${theme.key}`)
  mkdirSync(outDir, { recursive: true })

  const model = buildModel(theme, questions)
  const title = `${model.title} ― ${model.subtitle}`

  const outs = []
  if (args.format === 'md' || args.format === 'both') {
    const md = renderMarkdown(model)
    writeFileSync(join(outDir, 'article.md'), md, 'utf8')
    writeFileSync(join(outDir, 'print.html'), renderPrintHtml(md, title), 'utf8')
    outs.push('article.md', 'print.html')
  }
  if (args.format === 'epub' || args.format === 'both') {
    const epub = renderEpub(model, outDir)
    outs.push(epub.split('/').pop())
  }

  const s = model.stats
  console.log(`テーマ: ${theme.label}`)
  console.log(`抽出 ${s.extracted} 問 → 図版依存 ${s.figureSkipped} 問除外 / 同趣旨 ${s.dupCompressed} 問圧縮 → 収録 ${s.rendered} 問`)
  console.log(`章: ${model.chapters.length} 論点`)
  console.log(`出力先: ${outDir}`)
  for (const o of outs) console.log(`  - ${o}`)
}

// THEMES/分類ロジックを頻度集計等で再利用するための export（import 時は副作用なし）
export { THEMES, assignSubtopic, lead, FIGURE_RE, normalizeQuestion }

// 直接実行時のみビルドを走らせる
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('ERROR:', e.message)
    process.exit(1)
  })
}
