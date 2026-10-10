/**
 * dataset-schemas-config-business.mjs — 設定（config/）の型（zod）。dataset-schemas.mjs が export * で束ね、台帳（datasets.mjs）の schema が名前で引く。
 * 型を足す約束は dataset-schemas.mjs の先頭。部品は dataset-schema-parts.mjs。
 *
 * 事業・試験・商品の設定（人が手で書く正本）。基本は .strict()（誤記の欄を止める）。メモ・説明用の欄（_doc・_note など）は
 * 実データどおり書き、読み手が自由な欄として扱う塊だけ record／catchall にする。ファイル間の整合（資格 id の実在・商品 id の実在）は
 * 既存の check-*（check-exam-calendar・check-qualification-market・check-magazine-membership ほか）に残し、型は形と 1 ファイル内の不変条件だけを持つ。
 */
import { z } from 'zod';
import { jstDate, month, yen, flag, uniqueBy, BUSINESS_CHANNELS } from './dataset-schema-parts.mjs';

/** 資格・ファミリー・テーマなどの id（英小文字・数字・ハイフン） */
const QID = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, '英小文字・数字・ハイフンだけ');
const text = z.string().min(1);
const url = z.url();
const strList = z.array(text);

// ---- 事業方針（config/business-direction.json） ----------------------------------------------

const DIRECTION_STAGES = ['集客', '学習', '送客', '販売', '運営', '品質'];
const DIRECTION_CHANNELS = BUSINESS_CHANNELS;
const DIRECTION_UNITS = ['人', '回', '件', '円', '分', '人日'];

/** 事業方針（重点資格・北極星・指標の定義・レビュー周期）。判定（資格 id の重複・appliesTo の実在）は scripts/lib/business-direction.mjs の direction() が見る */
export const ConfigBusinessDirection = z
  .object({
    schemaVersion: z.literal(1),
    effectiveDate: jstDate('方針の発効日'),
    objective: text.describe('事業の目的'),
    positioning: text.describe('提供価値の 1 文'),
    qualifications: z
      .array(
        z
          .object({
            id: QID.describe('資格 id（qualification-registry.json）'),
            audience: text.describe('想定する受験者'),
            promise: text.describe('学習者に約束する体験'),
            journey: strList.min(1).describe('学習段階の並び'),
            offer: text.describe('提供する商品・サービス'),
          })
          .strict(),
      )
      .min(1)
      .describe('重点資格。名前は qualification-registry.json から引き、ここに写さない'),
    northStar: z
      .object({
        current: z.string().min(1).describe('事業の頂点指標の id（metrics[].id）'),
        role: text,
        candidate: text.describe('将来の頂点指標の候補'),
        readiness: text.describe('候補へ置き換える条件'),
      })
      .strict(),
    review: z
      .object({
        weekly: text.describe('週次レビューの対象期間'),
        monthly: text.describe('月次レビューの対象期間'),
        timezone: z.literal('Asia/Tokyo'),
      })
      .strict(),
    metrics: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z][A-Za-z0-9]*$/, 'camelCase'),
            stage: z.enum(DIRECTION_STAGES).describe('ファネルの段階'),
            label: text,
            unit: z.enum(DIRECTION_UNITS),
            definition: text.describe('指標の定義（何を数え、何と区別するか）'),
            channel: z.enum(DIRECTION_CHANNELS).describe('取得元'),
            appliesTo: z.array(z.string().min(1)).min(1).optional().describe('計測する範囲（all か資格 id）。無ければ全資格が対象'),
          })
          .strict(),
      )
      .min(1),
    rules: strList.min(1).describe('事業判断の規則（数や順位を成果にしない等）'),
  })
  .strict()
  .meta({ title: '事業方針' });

// ---- 出題形式（config/exam-formats.json） ----------------------------------------------------

/** 照合記録。self は主担当が公式原文を読んで照合・agent は調査担当の読み取りだけ */
const verification = z
  .object({
    checkedAt: jstDate('照合日'),
    checkedBy: z.enum(['self', 'agent']),
    unresolved: strList.describe('こちらが確認できていない事項'),
    pending: strList.describe('公式が未発表の事項'),
    notPublished: strList.describe('公式が公表していない事項'),
    viaArchive: strList.optional().describe('公式から削除済みでアーカイブ経由で確認した事項'),
  })
  .strict();

const FORMAT_TYPES = ['mcq', 'written', 'experience', 'essay', 'oral', 'practical'];
const STAGE_KEYS = ['first', 'second', 'written', 'oral', 'practical'];
const PAST_EXAM_LEVELS = ['public', 'partial', 'none', 'unknown'];
const vocab = (keys) => z.object(Object.fromEntries(keys.map((k) => [k, text]))).strict();

/** 試験区分・出題形式・過去問の公開範囲。語彙（formatTypes・stageKeys・pastExamLevels）と資格 id の照合・公開を主張する区分の出典 URL は check-exam-calendar（qualification-registry.mjs）が見る */
export const ConfigExamFormats = z
  .object({
    schemaVersion: z.literal(1),
    verifiedAt: jstDate('最終照合日'),
    policy: text,
    formatTypes: vocab(FORMAT_TYPES).describe('答案の形式の語彙（stages[].types の値）'),
    _formatTypes: text,
    stageKeys: vocab(STAGE_KEYS).describe('試験区分の語彙（stages[].key の値）'),
    pastExamLevels: vocab(PAST_EXAM_LEVELS).describe('過去問の公開範囲の語彙'),
    exams: z.record(
      QID,
      z
        .object({
          stages: z
            .array(
              z
                .object({
                  key: z.enum(STAGE_KEYS),
                  label: text,
                  shortLabel: text.optional(),
                  types: z.array(z.enum(FORMAT_TYPES)).min(1),
                  detail: text,
                })
                .strict(),
            )
            .min(1)
            .describe('試験区分。商品ラインナップ（product-lineup.mjs）もここから区分を読む'),
          pastExams: z
            .object({
              questions: z.enum(PAST_EXAM_LEVELS).describe('問題の公開範囲'),
              answers: z.enum(PAST_EXAM_LEVELS).describe('解答の公開範囲'),
              note: text,
              source: z.union([z.literal(''), url]).describe('公開を確かめた公式 URL（公開・一部公開と書くときは必須。判定は check-exam-calendar）'),
            })
            .strict(),
          verification,
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: '出題形式' });

// ---- 受験者数・合格率（config/exam-stats.json） -----------------------------------------------

const personCount = z.number().int().min(0).nullable();
/** 統計の 1 行（区分・部門・全体）。未公表の欄は null。合格率は対受験者の % で、倍率は competitionRatio へ（合格率と合格者÷受験者の一致は check-exam-calendar が見る） */
const statRow = z
  .object({
    label: text.optional(),
    examId: QID.optional().describe('部門別表の行が指す資格 id'),
    applicants: personCount.optional().describe('受験申込者（人）'),
    plannedExaminees: personCount.optional().describe('結果表の受検予定者数（申込者数とは別の公表値）'),
    examinees: personCount.optional().describe('受験者（人）'),
    passers: personCount.optional().describe('合格者（人）'),
    writtenPassers: personCount.optional().describe('筆記合格者（人・技術士第二次）'),
    passRate: z.number().min(0).max(100).nullable().optional().describe('対受験者合格率（%）。採用試験は null'),
    competitionRatio: z.number().min(0).optional().describe('倍率（採用試験）'),
    competitionRatioBasis: text.optional().describe('倍率の分母・分子の定義'),
  })
  .strict();
const statStages = z.record(text, statRow).describe('区分別の行（キーは first・second・firstEarly・firstLate・final など）');
const fiscalYear = z.number().int().min(2000);
const PE_STAGES = ['final', 'written'];

const statLatest = z
  .object({
    year: z.string().regex(/^[RH]\d+$/, '和暦（R7 など）'),
    fiscalYear,
    stage: z.enum(PE_STAGES).optional().describe('技術士第二次: final=筆記+口頭の最終合格・written=筆記のみ'),
    stages: statStages.optional(),
    annualTotalExaminees: personCount.optional().describe('のべ受検者数（2 級土木）'),
    applicants: personCount.optional(),
    examinees: personCount.optional(),
    passers: personCount.optional(),
    writtenPassers: personCount.optional(),
    passRate: z.number().min(0).max(100).nullable().optional(),
    note: text.optional(),
    divisions: z.record(text, statRow).optional().describe('技術部門別の行（技術士第一次）'),
    source: url.optional().describe('この年度だけの出典'),
  })
  .strict();

const statHistoryRow = z
  .object({
    year: z.string().regex(/^[RH]\d+$/, '和暦（R6 など）'),
    fiscalYear,
    annualTotalExaminees: personCount.optional(),
    stages: statStages.optional(),
    applicants: personCount.optional(),
    examinees: personCount.optional(),
    passers: personCount.optional(),
    passRate: z.number().min(0).max(100).nullable().optional(),
    divisions: z.record(text, statRow).optional(),
    source: url.optional(),
  })
  .strict();

const peYearTable = z
  .object({
    fiscalYear,
    stage: z.enum(PE_STAGES),
    stageLabel: text,
    totals: z.object({ all21: statRow, excludingCem20: statRow }).strict().describe('全 21 部門と、総合技術監理を除く 20 部門の合計'),
    source: url.optional(),
    divisions: z.record(text, statRow).describe('技術部門ごとの行（キーは部門名）'),
  })
  .strict();

/** 受験者数・合格者数・合格率の正本。未確認の資格は latest を null にして note に理由を書く（判定は check-exam-calendar） */
export const ConfigExamStats = z
  .object({
    schemaVersion: z.literal(1),
    verifiedAt: jstDate('最終照合日'),
    policy: text,
    conventions: z.record(text, text).describe('数え方の約束（合格率の分母・段階・単位・未確認の扱い）'),
    peSecondaryDivisions: z
      .object({
        label: text,
        issuer: text,
        sources: z.record(text, url),
        note: text,
      })
      .catchall(peYearTable)
      .describe('技術士第二次の技術部門別の表。年度のキー（R6・R7 ...）ごとに表を持つ'),
    exams: z.record(
      QID,
      z
        .object({
          label: text,
          issuer: text,
          source: url.describe('公式の発表ページ'),
          latest: statLatest.nullable().describe('直近の年度の数値。公式が公表していない資格は null（理由は note）'),
          history: z
            .union([z.array(statHistoryRow), z.record(z.string().regex(/^\d{4}$/), statRow)])
            .optional()
            .describe('過去の年度。配列（年度の行）か、西暦をキーにした辞書'),
          note: text.optional(),
          sources: z.record(text, url).optional().describe('区分別の出典'),
          divisionRef: z.string().regex(/^[A-Za-z]+\.\S+$/, '表.部門名（peSecondaryDivisions.建設 など）').optional().describe('部門別の表の行を指す。同じ年度・段階の値は表と一致する（check-exam-calendar）'),
          verification,
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: '受験者数・合格率' });

// ---- 市場スキャン（config/market-scan.json） --------------------------------------------------

const positiveInt = z.number().int().min(1);

/** 資格ごとの市場（競合の混み具合）を取る検索語と閾値。資格 id の実在・見送り以外の全資格に検索語がある・閾値の大小は check-qualification-market が見る */
export const ConfigMarketScan = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    results: z.object({ youtube: positiveInt, note: positiveInt }).strict().describe('検索 1 回で見る上位の件数'),
    _titleMatch: text,
    _density: text,
    density: z
      .object({
        bands: z.object({ low: positiveInt, mid: positiveInt, high: positiveInt }).strict().describe('強い売り手の数の区切り（low ≤ mid ≤ high）'),
        youtube: z.object({ strongViews: positiveInt.describe('強いとみなす動画の再生数') }).strict(),
        coconala: z.object({ strongReviews: positiveInt.describe('強いとみなすサービスの評価件数') }).strict(),
      })
      .strict(),
    queries: z.record(
      QID,
      z
        .object({
          keywords: strList.min(1).describe('YouTube・note で検索する語'),
          titleMatch: text.optional().describe('その資格のものとみなすタイトルの正規表現（NFKC で半角にそろえて照合）'),
          coconala: strList.min(1).describe('ココナラで検索する語'),
        })
        .strict(),
    ),
  })
  .strict()
  .meta({ title: '市場スキャンの設定' });

// ---- 競合の追跡リスト（config/competitors.json） ---------------------------------------------

const competitorSlot = z
  .object({
    _note: text,
    competitors: z
      .array(
        z
          .object({
            handle: text.describe('取得元での識別子（note・X・Instagram はハンドル、ココナラはユーザー id、YouTube はチャンネル id）'),
            label: text,
            exams: z.array(QID).min(1).describe('競合する資格 id（qualification-registry.json）'),
            note: text.describe('性格（何者か・導線・同一主体）だけを書く。価格・件数・日付などの観測値は data/ の実測へ（tests/competitors-notes.test.mjs）'),
          })
          .strict(),
      )
      .superRefine(uniqueBy('handle')),
  })
  .strict();

/** 競合の追跡リスト。取得元（note・ココナラ・Instagram・X・YouTube）の枠ごとに handle・label・exams・note を持つ */
export const ConfigCompetitors = z
  .object({
    schemaVersion: z.literal(1),
    _note: text,
    note: competitorSlot,
    coconala: competitorSlot,
    instagram: competitorSlot,
    x: competitorSlot,
    youtube: competitorSlot,
  })
  .strict()
  .meta({ title: '競合の追跡リスト' });

// ---- 年間ロードマップ（config/annual-roadmap.json） -------------------------------------------

/** 年間ロードマップの設定。重点の中身はバックログのカード（[時期:]）が正本で、ここは期間と買い場の週数だけ */
export const ConfigAnnualRoadmap = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    description: text,
    period: z.object({ start: month.describe('表示の開始月（YYYY-MM）'), end: month.describe('表示の終了月（YYYY-MM）') }).strict(),
    buyWindowWeeks: positiveInt.describe('試験日の何週間前から買い場として塗るか（週）'),
    _buyWindowNote: text,
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.period.start > c.period.end) flag(ctx, ['period'], '開始月が終了月より後');
  })
  .meta({ title: '年間ロードマップの設定' });

// ---- 制作物のテーマ（config/content-themes.json） ---------------------------------------------

const themeRule = z
  .object({
    theme: QID.describe('テーマ id（資格 id・ファミリー id・topics の id）'),
    pathPrefix: text.optional().describe('制作物のパスの接頭辞'),
    utmCampaignPrefix: text.optional().describe('utmCampaign の接頭辞'),
    why: text.optional(),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (!r.pathPrefix && !r.utmCampaignPrefix) flag(ctx, [], 'pathPrefix か utmCampaignPrefix のどちらかが要る');
  });

/** 制作物のテーマの語彙と、チャネルごとの制作物をテーマへ写すルール（上から順に評価し最初の一致）。テーマの実在・区分の実在は buildThemes（content-theme.mjs）が見る */
export const ConfigContentThemes = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    topics: z.array(z.object({ id: QID, label: text }).strict()).superRefine(uniqueBy('id')).describe('資格以外の話題'),
    rules: z.record(text, z.array(themeRule).min(1)).describe('チャネル（note など）ごとの写し方'),
    splitByStage: z.array(QID).describe('試験区分ごとに分けるテーマ'),
    stageCommonLabel: text.describe('区分に決まらない制作物の名前'),
    stageRules: z.record(text, z.array(z.object({ pattern: text.describe('正規表現'), stage: text.describe('区分 id（exam-formats.json の stageKeys）') }).strict()).min(1)),
  })
  .strict()
  .meta({ title: '制作物のテーマ' });

// ---- note メンバーシップ（config/note-membership.json） ---------------------------------------

/** note メンバーシップのプランと価格の写し。retiredAt があるあいだ check-note-membership は突合せず SKIP する */
export const ConfigNoteMembership = z
  .object({
    schemaVersion: z.literal(1),
    _comment: text,
    updatedAt: jstDate('最終更新日'),
    retiredAt: jstDate('撤退した日').optional().describe('あれば撤退済み。再開するときは消して mirrors を宣言し直す'),
    plans: z
      .array(
        z
          .object({
            id: z.string().regex(/^[0-9a-f]{12}$/, 'note のプラン id（16 進 12 桁）'),
            key: z.string().regex(/^[a-z][a-z0-9-]*$/, 'mirrors の {key} が指す名前'),
            name: text,
            price: yen('月額会費'),
            limit: z.number().int().min(1).nullable().describe('定員。無制限は null'),
            published: z.boolean().describe('募集中か'),
            note: text.optional(),
            limitDecision: text.optional().describe('定員の判断の記録（unresolved なら未決）'),
          })
          .strict(),
      )
      .superRefine(uniqueBy('id'))
      .superRefine(uniqueBy('key')),
    mirrors: z
      .array(z.object({ file: text.describe('価格の写しがあるファイル（リポジトリ相対）'), must: text.describe('ファイルに含まれるべき文字列。{key} は plans[].key の価格に展開') }).strict())
      .describe('価格の写し。運用中は 1 件以上が要る（0 件は検査不成立）'),
  })
  .strict()
  .meta({ title: 'note メンバーシップ' });

// ---- マガジン収録の期待値（config/note-magazine-membership.json） ------------------------------

const docKey = z.object({ _doc: z.string() });
const magazinePack = z
  .object({
    labels: z.array(text).describe('この束ねに含める記事ラベル（noteMagazine）'),
    fromMagazines: z
      .record(text, z.union([z.literal('all'), z.number().int().min(1)]))
      .optional()
      .describe('別のマガジンを丸ごと（all）か一部（本数）同梱する'),
    reason: text,
    partialReason: text.optional().describe('一部だけ同梱する理由'),
    _history: text.optional(),
  })
  .strict();

/** マガジン収録の期待値。期待収録数 = Σ(紐づくラベルの公開記事数) + extras。三軸の突合は check-magazine-membership が見る */
export const ConfigNoteMagazineMembership = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    _why: text,
    _sections: text,
    labels: z.record(text, text).describe('記事ラベル（noteMagazine）→ マガジン id（src/lib/note-magazines.ts）'),
    packs: docKey.catchall(magazinePack).describe('複数ラベルを束ねる商品（キーはマガジン id）'),
    excluded: docKey.catchall(z.object({ reason: text }).strict()).describe('マガジンに対応しないことが正しいラベル（キーはラベル）'),
    extras: z.record(text, z.object({ count: z.number().int().min(0), reason: text }).strict()).describe('ラベル外から収録する本数の例外（キーはマガジン id）'),
  })
  .strict()
  .meta({ title: 'マガジン収録の期待値' });

// ---- 単品価格の一貫性ゲートの設定（config/note-price-consistency.json） --------------------------

/** 単品価格のずれを止める検査（check-note-price-consistency）の設定 */
export const ConfigNotePriceConsistency = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    _uniformSeries: text,
    uniformSeries: z.record(text, z.object({ price: yen('配下の全マガジンの単品価格'), reason: text }).strict()).describe('配下が同一価格であるべきシリーズ（キーは content/note/ からのパス）'),
    _allowMagazines: text,
    allowMagazines: z.record(text, text).describe('マガジン内に複数価格が同居してよい例外（キーは noteMagazine・値は理由）'),
  })
  .strict()
  .meta({ title: '単品価格の一貫性' });

// ---- note 記事の冒頭の標準（config/note-intro-standard.json） ----------------------------------

const introMagazine = z.object({ url, title: text, desc: text }).strict();
const introVariant = z
  .object({
    _doc: text,
    root: text.describe('対象記事のディレクトリ（リポジトリ相対）'),
    banner: text.describe('著者バナーの画像ファイル名'),
    include: strList.min(1).optional().describe('root 直下のうち対象にする記事（無ければ root 配下すべて）'),
    coconala: z
      .object({
        urls: z.array(url).min(1).describe('冒頭に並べるココナラのサービス'),
        lead: z.object({ default: text, ichiji: text.optional() }).strict().describe('案内文。ichiji は一次の記事向け'),
      })
      .strict(),
    magazines: z.record(text, introMagazine).describe('マガジン id → 導線の url・題名・説明'),
    entryLead: z.record(text, text).optional().describe('入口商品（rules[].entry）ごとの案内文。入口→上位パックの順に 1 つの案内として出す'),
    rules: z
      .array(
        z
          .object({
            match: z.string().describe('記事のパスに含まれる文字列。上から順に最初の一致（空文字は全記事に一致）'),
            home: z.string().nullable().describe('この記事が収録されているマガジン id（無ければ null）'),
            upper: z.string().nullable().describe('上位の束ね商品のマガジン id（無ければ null）'),
            entry: z.string().optional().describe('上位パックより先に案内する入口の商品のマガジン id（低価格先出し。upper と一緒に 1 つの案内にする）'),
            dq: z.boolean().describe('失格注意の段落を持つか'),
            coconalaLead: z.string().optional().describe('coconala.lead のキー（無ければ default）'),
            _why: text.optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((v, ctx) => {
    v.rules.forEach((r, i) => {
      for (const k of ['home', 'upper']) if (r[k] !== null && !(r[k] in v.magazines)) flag(ctx, ['rules', i, k], `magazines に無いマガジン id「${r[k]}」`);
      if (r.coconalaLead !== undefined && !(r.coconalaLead in v.coconala.lead)) flag(ctx, ['rules', i, 'coconalaLead'], `coconala.lead に無いキー「${r.coconalaLead}」`);
      if (r.entry !== undefined) {
        if (!(r.entry in v.magazines)) flag(ctx, ['rules', i, 'entry'], `magazines に無いマガジン id「${r.entry}」`);
        if (!v.entryLead || !(r.entry in v.entryLead)) flag(ctx, ['rules', i, 'entry'], `entryLead に「${r.entry}」の案内文が無い`);
        if (r.upper === null) flag(ctx, ['rules', i, 'entry'], '入口の商品（entry）は上位パック（upper）と組で使う');
        if (r.home !== null) flag(ctx, ['rules', i, 'entry'], '入口の商品（entry）は収録元マガジン（home）の無い記事にだけ使う');
      }
    });
  });

/** note 記事の冒頭（著者バナー・ココナラ・マガジン導線）の標準。資格ごとの型を variants に持つ */
export const ConfigNoteIntroStandard = z
  .object({ schemaVersion: z.literal(1), _doc: text, variants: z.record(text, introVariant).describe('型（civil1・civil2・civil-cross）ごとの標準') })
  .strict()
  .meta({ title: 'note 記事の冒頭の標準' });

// ---- note カバー（config/note-covers.json） ----------------------------------------------------

const coverText = z
  .object({ qualifier: text.describe('試験名の行'), magazineName: text.describe('マガジン名'), proof: text.describe('実績・範囲の行'), benefit: text.describe('得られるものの行') })
  .strict();

/** note カバーの設定。記事の上書き・退役／追加マガジン・分類の語彙とルール・マガジンの文言。字数の収まりは check-note-cover-fit が実測する */
export const ConfigNoteCovers = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    characterCovers: z
      .object({
        _doc: text,
        articleOverrides: z
          .record(text, z.object({ leadIn: text, headline: text, hi: text, hiSuffix: text, benefit: text }).strict())
          .describe('記事のカバー文言の上書き（キーは記事のパス）'),
        retiredMagazineIds: z.record(text, text).describe('カバー対象から外したマガジン id → 理由'),
        additionalMagazines: z
          .array(coverText.extend({ id: text.describe('マガジン id'), magazineDir: text.describe('マガジンのディレクトリ（リポジトリ相対）') }).strict())
          .superRefine(uniqueBy('id'))
          .describe('note-magazines.ts に無いが、カバーを作るマガジン'),
      })
      .strict(),
    categories: z
      .object({
        _doc: text,
        categories: z
          .array(z.object({ id: QID, label: text, description: text, styleHint: text }).strict())
          .min(1)
          .superRefine(uniqueBy('id'))
          .describe('カバー分類の語彙'),
        rules: z
          .record(
            text,
            z.array(
              z
                .object({ category: QID, pathPrefix: text.optional(), noteSeries: text.optional() })
                .strict()
                .superRefine((r, ctx) => {
                  if (!r.pathPrefix && !r.noteSeries) flag(ctx, [], 'pathPrefix か noteSeries のどちらかが要る');
                }),
            ),
          )
          .describe('チャネル（note）ごとの分類ルール。上から順に最初の一致'),
        defaults: z
          .object({
            themeIds: z.record(text, QID).describe('テーマ id → 分類（career・common）'),
            qualification: z.object({ free: QID, paid: QID }).strict().describe('資格の記事の無料・有料ごとの分類'),
          })
          .strict(),
      })
      .strict(),
    magazineText: z
      .object({ $comment: text })
      .catchall(coverText.extend({ examKey: text.describe('背景の写真プールの系列（brand-image-system）') }).strict())
      .describe('マガジンカバーの文言（キーはマガジンの短い識別子）'),
  })
  .strict()
  .meta({ title: 'note カバーの設定' });

// ---- ココナラのアカウント（config/coconala-account.json） ---------------------------------------

/** ココナラの出品アカウント。sellerName は Playwright 自動操作の account assert に使う */
export const ConfigCoconalaAccount = z
  .object({
    schemaVersion: z.literal(1),
    sellerName: z.string().describe('出品者名（マイページに含まれるか照合する。空ならログイン済みだけ確認）'),
    profileUrl: z.union([z.literal(''), url]).describe('プロフィール URL。出品後に埋める（出品済みなら非空: check-coconala-wiring）'),
    listedAt: jstDate('初めて出品した日').optional(),
    _note: text,
    profile: z
      .object({
        avatarImage: text.describe('アイコン画像（リポジトリ相対）'),
        coverImage: text.describe('カバー画像（リポジトリ相対）'),
        job: text.describe('職業欄'),
        appeal: text.describe('ひとこと'),
        schedule: text.describe('対応時間・不在の案内'),
        bio: text.describe('自己紹介の本文'),
      })
      .strict(),
  })
  .strict()
  .meta({ title: 'ココナラのアカウント' });

// ---- ココナラブログの偵察（config/coconala-blog.json） ------------------------------------------

/** ココナラブログ（記事型）の偵察対象と運用値。scripts/scout-coconala-blogs.mjs が読む */
export const ConfigCoconalaBlog = z
  .object({
    schemaVersion: z.literal(1),
    _note: text,
    cadenceDays: positiveInt.describe('偵察の間隔（日）'),
    queries: z
      .array(z.object({ q: text.describe('検索語'), exam: text.describe('対象の系統（civil・pe・pe-sokan）'), note: text.optional() }).strict())
      .superRefine(uniqueBy('q')),
    watchUsers: z
      .array(z.object({ id: z.string().regex(/^\d+$/, 'ココナラのユーザー id（数字）'), label: text, exams: strList.min(1), note: text.optional() }).strict())
      .superRefine(uniqueBy('id')),
    watchUsersTodo: text.optional().describe('まだ特定できていない追跡対象のメモ'),
  })
  .strict()
  .meta({ title: 'ココナラブログの偵察' });

// ---- KDP 入稿（config/kdp-memo.json） ----------------------------------------------------------

const AI_AMOUNT = ['NONE', 'FEW_AND_MINIMAL', 'FEW_AND_EXTENSIVE', 'MANY_AND_MINIMAL', 'MANY_AND_EXTENSIVE', 'PARTIAL_AND_MINIMAL', 'PARTIAL_AND_EXTENSIVE', 'ENTIRE_AND_MINIMAL', 'ENTIRE_AND_EXTENSIVE'];
const KDP_ACCESSIBILITY = ['unknown', 'not_readable', 'partially_readable', 'readable'];
const aiShape = z.object({ text: z.enum(AI_AMOUNT), images: z.enum(AI_AMOUNT), translations: z.enum(AI_AMOUNT), imageTool: text }).strict();
const aiDeclaration = aiShape.describe('AI 生成コンテンツの申告（量と編集度の語彙は kdp-common.mjs の AI_AMOUNT_LABELS）');

const kdpDefaults = z
  .object({
    _comment: text,
    accountEmail: z.email().nullable().describe('本棚 assert 用のアカウント。null なら照合しない'),
    author: text,
    authorKana: text,
    authorRomaji: text,
    label: text.describe('レーベル'),
    labelKana: text,
    labelRomaji: text,
    category: text.describe('カテゴリー（一覧表示用）'),
    issuer: text.describe('既定の出典元（spec.creditIssuer が無いとき）'),
    kdpSelect: z.boolean().describe('KDP セレクトに登録するか'),
    accessibility: z.enum(KDP_ACCESSIBILITY),
    aiDeclaration,
    categoryPaths: z
      .record(text, z.object({ dropdowns: strList.min(1).describe('カテゴリー選択の階層'), leaf: text, verified: z.boolean().describe('実機で掲載経路を確かめたか') }).strict())
      .describe('カテゴリー系統 → 掲載経路'),
    categoryAssign: z.record(text, strList.min(1)).describe('カテゴリー系統 → 本の id の接頭辞（全冊の登録漏れは check-kdp-category-coverage）'),
  })
  .strict()
  .superRefine((d, ctx) => {
    for (const track of Object.keys(d.categoryAssign)) if (!(track in d.categoryPaths)) flag(ctx, ['categoryAssign', track], `categoryPaths に無い系統「${track}」`);
  });

const kdpBook = z
  .object({
    titleKana: text,
    titleRomaji: text,
    subKana: text,
    subRomaji: text,
    series: text,
    seriesKana: text,
    seriesRomaji: text,
    volume: z.string().optional().describe('シリーズの巻（合本は空欄）'),
    kdp: z
      .object({
        kdpSelect: z.boolean().optional(),
        accessibility: z.enum(KDP_ACCESSIBILITY).optional(),
        aiDeclaration: aiShape.partial().optional(),
        categoryDropdowns: strList.min(1).optional(),
        categoryLeaf: text.optional(),
      })
      .strict()
      .optional()
      .describe('既定を上書きする出版申告・カテゴリー'),
    keywords: z.array(text).min(1).max(7).describe('検索キーワード（KDP は 7 つまで）'),
    description: text.describe('商品説明'),
    previewNote: text.describe('プレビューで確かめる点'),
    note: text.optional(),
  })
  .strict();

/** KDP 入稿の既定値と各本の固有値。題名・価格は scripts/kindle-specs/<id>.json が正本で、ここには読み・シリーズ・キーワード・説明を置く */
export const ConfigKdpMemo = z
  .object({
    schemaVersion: z.literal(1),
    _comment: text,
    defaults: kdpDefaults,
    books: z.record(z.string().regex(/^[a-z]-[A-Za-z0-9-]+$/, '本の id（a-01・c-I など）'), kdpBook),
  })
  .strict()
  .meta({ title: 'KDP 入稿の設定' });

// ---- 技術士 第二次 筆記の答案用紙（config/pe-answer-sheets.json） ----------------------------------

/** 技術士 第二次試験 筆記の答案用紙 1 枚の字数と、区分ごとの枚数。check-note-charlimits・essay-shisaku-charcount が読む */
export const ConfigPeAnswerSheets = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    charsPerSheet: positiveInt.describe('答案用紙 1 枚の字数'),
    targetRatio: z.number().gt(0).max(1).describe('上限のこの割合を超えたら警告する'),
    _targetRatio: text,
    sheets: z.record(QID, z.record(text, positiveInt)).describe('資格 id → 区分 → 枚数'),
    _sheets: text,
    sources: z.array(z.string().url()).min(1),
  })
  .strict()
  .meta({ title: '技術士の答案用紙' });

// ---- 経験記述の解答欄の字数上限（config/keiken-answer-sheet-limits.json） -------------------------

const LIMIT_KEYS = ['current2_q1', 'current2_q2', 'legacy3_q1', 'legacy3_q2', 'legacy3_q3', 'yosou'];
const limitEntry = z.object({ maxChars: positiveInt.describe('解答欄の字数上限'), label: text }).strict();

/** 1級・2級土木 第二次検定 問題 1（施工経験記述）の解答欄しきい値。キーは scripts/keiken-charcount.mjs が読む snake_case */
export const ConfigKeikenAnswerSheetLimits = z
  .object({
    schemaVersion: z.literal(1),
    _meta: z
      .object({
        purpose: text,
        borderline_tolerance: z.number().min(0).max(1).describe('maxChars の何割増しまでを borderline として許すか'),
        borderline_note: text,
        grade_detection: text,
        default_grade: text.describe('級が決まらないときの級（grades のキー）'),
        format_detection: text,
        char_count_rule: text,
      })
      .strict(),
    grades: z
      .record(
        text,
        z
          .object({
            qualification: QID.describe('資格 id'),
            char_per_line: positiveInt.describe('1 行の字数'),
            minimum_fill_ratio: z.number().min(0).max(1).describe('解答欄を埋めるべき割合'),
            provisional: z.boolean().describe('公式の行数が未確定の暫定値か'),
            basis: text,
            sources: z.record(text, text),
            limits: z.object(Object.fromEntries(LIMIT_KEYS.map((k) => [k, limitEntry]))).strict().describe('設問の形式ごとの上限（現行 2 テーマ・旧 3 項目・予想問題）'),
          })
          .strict(),
      )
      .describe('級別のしきい値（キーは civil-1・civil-2）'),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (!(c._meta.default_grade in c.grades)) flag(ctx, ['_meta', 'default_grade'], `grades に無い級「${c._meta.default_grade}」`);
  })
  .meta({ title: '経験記述の解答欄の字数上限' });

// ---- コンクリート主任技士 小論文の出題履歴（config/cce-essay-history.json） ------------------------

const cceRange = z.tuple([z.number().int().min(1), z.number().int().min(1)]).refine(([lo, hi]) => lo <= hi, '下限が上限より大きい');
/** 西暦から和暦（H24〜H30・R1〜）。1 ファイルの中で決まる */
const eraOf = (year) => (year >= 2019 ? `R${year - 2018}` : `H${year - 1988}`);

/** コンクリート主任技士 小論文の出題履歴・テーマ分類・模範答案の型。SSOT として check-cce-essay（scripts/lib/cce-essay.mjs）が使う */
export const ConfigCceEssayHistory = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    policy: text,
    verifiedAt: jstDate('最終照合日'),
    checkedBy: z.enum(['self', 'agent']),
    charsPerLine: z
      .object({ value: positiveInt.describe('1 行の字数'), confidence: z.enum(['high', 'medium', 'low']), note: text })
      .strict(),
    themes: z
      .record(QID, z.object({ label: text, aliases: strList.min(1).describe('同じテーマとみなす言い回し') }).strict())
      .describe('テーマ分類（キーは記事 frontmatter の cceEssayTheme）'),
    years: z
      .array(
        z
          .object({
            year: z.number().int().min(2000).describe('実施年度（西暦）'),
            era: z.string().regex(/^(H\d+|R\d+)$/).describe('和暦。year から決まる'),
            questionCount: positiveInt.describe('小論文の問題数'),
            choice: z.boolean().describe('テーマを選択する形式か'),
            options: z
              .array(z.object({ label: text, theme: QID.nullable().describe('themes のキー。テーマに分類しない選択肢（自由選択・問 1 の経験記述）は null'), kind: text.optional().describe('experience=経験記述の設問') }).strict())
              .min(1)
              .describe('出題テーマの選択肢。theme は themes のキー'),
            optionThemes: z.array(QID).optional().describe('options に載せない補助のテーマ'),
            items: z.array(z.object({ name: text.describe('設問項目'), lines: z.string().min(1).nullable().describe('行数（1・15-20 など）。出典で確認できなければ null') }).strict()).describe('設問の構成。出典が設問項目を示さない年度は空'),
            confidence: z.enum(['high', 'medium', 'low']).describe('high=書籍で確認・medium=複数出典・low=1 出典のみ'),
            sources: strList.min(1),
            note: text.optional(),
          })
          .strict(),
      )
      .min(1)
      .superRefine(uniqueBy('year')),
    answerModel: z
      .object({
        _doc: text,
        parts: z
          .array(
            z
              .object({
                key: z.string().regex(/^[a-z][a-zA-Z]*$/),
                heading: text.describe('模範答案の見出し'),
                chars: cceRange.describe('字数帯 [下限, 上限]'),
                scope: z.enum(['common', 'persona']).describe('common=全立場共通・persona=立場ごとに書き分ける'),
              })
              .strict(),
          )
          .min(1)
          .superRefine(uniqueBy('key')),
        totalChars: cceRange.describe('組み立てた答案全体の字数帯'),
        requiredH2: strList.min(1).describe('記事に必須の H2'),
        personaArticle: z
          .object({
            _doc: text,
            requiredH2: strList.min(1).describe('立場別記事（1立場×1テーマ）に必須の H2'),
            distinctParts: strList.min(1).describe('同じテーマの立場別記事どうしで文面が一致してはいけない parts の key'),
          })
          .strict()
          .optional()
          .describe('立場別記事（frontmatter cceEssayPersona）の型'),
        personas: strList.min(1).superRefine(uniqueBy((p) => p, '立場')).describe('書き分ける立場'),
      })
      .strict(),
  })
  .strict()
  .superRefine((c, ctx) => {
    c.years.forEach((y, i) => {
      if (y.era !== eraOf(y.year)) flag(ctx, ['years', i, 'era'], `${y.year} 年度の和暦は ${eraOf(y.year)}`);
      for (const t of [...y.options.map((o) => o.theme), ...(y.optionThemes ?? [])]) if (t !== null && !(t in c.themes)) flag(ctx, ['years', i], `themes に無いテーマ「${t}」`);
    });
    if (c.answerModel.parts.filter((p) => p.scope === 'persona').length !== 1) flag(ctx, ['answerModel', 'parts'], 'persona の部分はちょうど 1 つ（立場ごとに書き分ける設問）');
    const keys = new Set(c.answerModel.parts.map((p) => p.key));
    for (const k of c.answerModel.personaArticle?.distinctParts ?? []) if (!keys.has(k)) flag(ctx, ['answerModel', 'personaArticle', 'distinctParts'], `parts に無い key「${k}」`);
  })
  .meta({ title: 'コンクリート主任技士 小論文の出題履歴' });

// ---- サイト記事の機械品質ルール（config/content-rules.json） -------------------------------------

const RULE_ID = z.string().regex(/^\d+-\d+$/, 'ルール id（0-1 など）');
const SEVERITY = z.enum(['HIGH', 'MEDIUM', 'LOW']);
const ruleOverride = z.object({ enabled: z.literal(false).optional().describe('false でこのルールを無効化'), severity: SEVERITY.optional().describe('重大度の上書き') }).strict();

/** サイト記事（content/site/**）の機械品質ルールの重大度・適用範囲。.claude/scripts/lint-mdx-mobile.mjs・check-content-quality・管理画面が読む */
export const ConfigContentRules = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    _usage: text,
    defaults: z.record(RULE_ID, SEVERITY).describe('ルールの基準の重大度'),
    scopes: docKey.catchall(z.object({ applies: text.describe('適用条件'), note: text }).strict()).describe('各ルールの適用条件（記述的な対応表）。キーは defaults のルール id'),
    overrides: docKey
      .catchall(z.record(text, z.object({ _note: text.optional() }).catchall(ruleOverride)))
      .describe('資格（category）×種別（group か *）ごとの無効化・重大度の上書き。overrides[資格][種別][ルール id]'),
    fullScan: z.object({ _doc: text, rules: z.array(RULE_ID).min(1).superRefine(uniqueBy((r) => r, 'ルール')) }).strict().describe('週次 CI のラチェットが追跡するルール'),
    lengths: z.object({ _doc: text, guideMinChars: positiveInt.describe('ガイド記事の本文の下限（字）') }).strict().describe('本文の長さの下限'),
  })
  .strict()
  .superRefine((c, ctx) => {
    for (const id of Object.keys(c.scopes)) if (id !== '_doc' && !(id in c.defaults)) flag(ctx, ['scopes', id], `defaults に無いルール「${id}」`);
    c.fullScan.rules.forEach((id, i) => {
      if (!(id in c.defaults)) flag(ctx, ['fullScan', 'rules', i], `defaults に無いルール「${id}」`);
    });
    for (const [exam, groups] of Object.entries(c.overrides)) {
      if (exam === '_doc' || typeof groups !== 'object') continue;
      for (const [group, rules] of Object.entries(groups)) {
        for (const id of Object.keys(rules)) if (id !== '_note' && !(id in c.defaults)) flag(ctx, ['overrides', exam, group, id], `defaults に無いルール「${id}」`);
      }
    }
  })
  .meta({ title: '記事の機械品質ルール' });

// ---- 商品の正本（config/products.json・DN-0492） ----------------------------------------------

/** note-magazines.ts の 1 エントリ（キーの並びは保持する。id / published / noteUrl の順は読み手との契約） */
const productCatalogValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const productCatalog = z
  .object({ id: z.string(), published: z.boolean(), noteUrl: z.string() })
  .catchall(z.union([productCatalogValue, z.array(productCatalogValue), z.record(z.string(), productCatalogValue)]));

/** note の 1 商品（マガジン・パック・単品 SKU・会員） */
export const NoteProduct = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, '英小文字・数字・ハイフンだけ'),
    channel: z.literal('note'),
    qualification: z.string(),
    stage: z.string(),
    /** 系列: 経験記述・学科記述・横断・一次 など */
    series: z.enum(['keiken', 'gakka', 'cross', 'first', 'other']),
    /** 設計上の層 */
    tier: z.enum(['pack', 'magazine', 'single', 'membership']),
    persona: z.string().nullable().default(null),
    /** note-magazines.ts の該当エントリ（そのまま書き出す） */
    catalog: productCatalog,
    /**
     * note 上で収録すべき記事（リポジトリ相対の article.md パス）。原稿の noteId と結び付かない note 上の記事は
     * `note:<noteId>`（同じ題名の別 ID が収録されているなど。check-products が件数を出す）
     */
    members: z.array(z.string()).default([]),
    /** 丸ごと含む商品の id（パックが含むマガジン・単品） */
    includes: z.array(z.string()).default([]),
    /** 経緯のメモ（旧 note-magazines.ts のコメント） */
    memo: z.array(z.string()).default([]),
  })
  .strict();

/**
 * Kindle の 1 冊の行（scripts/kindle-published/catalog.json の books[] へそのまま書き出す）。
 * 型で宣言するのは先頭キーの id だけにして、ほかの欄は入力の並びのまま通す（生成物のキー順を変えない）
 */
const kindleBook = z
  .object({ id: z.string().min(1) })
  .catchall(z.unknown())
  .superRefine((b, ctx) => {
    if (b.priceJpy !== undefined && !(Number.isInteger(b.priceJpy) && b.priceJpy > 0)) flag(ctx, ['priceJpy'], 'priceJpy は正の整数（円）');
  });

/** Kindle の 1 冊（id は kindle-<書籍 id の小文字>） */
export const KindleProduct = z
  .object({
    id: z.string().regex(/^kindle-[a-z0-9-]+$/, 'kindle- ＋英小文字・数字・ハイフン'),
    channel: z.literal('kindle'),
    qualification: z.string(),
    stage: z.string(),
    series: z.enum(['keiken', 'gakka', 'cross', 'first', 'other']),
    tier: z.literal('book'),
    persona: z.string().nullable().default(null),
    /** catalog.json の books[] の並び（人が決めた順を保つ） */
    order: z.number().int().nonnegative(),
    catalog: kindleBook,
    members: z.array(z.string()).default([]),
    includes: z.array(z.string()).default([]),
    memo: z.array(z.string()).default([]),
  })
  .strict();

/**
 * ココナラの 1 サービスの行（src/lib/coconala-services.ts の SERVICES_RAW の生成ブロックへそのまま書き出す）。
 * 型で宣言するのは先頭キーの id だけにして、ほかの欄は入力の並びのまま通す（生成物の欄の順を変えない）
 */
const coconalaService = z
  .object({ id: z.string().min(1) })
  .catchall(z.unknown())
  .superRefine((s, ctx) => {
    if (!(Number.isInteger(s.priceYen) && s.priceYen > 0)) flag(ctx, ['priceYen'], 'priceYen は正の整数（円）。ココナラの価格の正本');
  });

/** ココナラの 1 サービス（id は catalog.id と同じ coconala-…） */
export const CoconalaProduct = z
  .object({
    id: z.string().regex(/^coconala-[a-z0-9-]+$/, 'coconala- ＋英小文字・数字・ハイフン'),
    channel: z.literal('coconala'),
    qualification: z.string(),
    stage: z.string(),
    series: z.enum(['keiken', 'gakka', 'cross', 'first', 'other']),
    tier: z.literal('service'),
    persona: z.string().nullable().default(null),
    /** SERVICES_RAW の並び（サイトの表示順を保つ） */
    order: z.number().int().nonnegative(),
    catalog: coconalaService,
    members: z.array(z.string()).default([]),
    includes: z.array(z.string()).default([]),
    /** 経緯のメモ（旧 coconala-services.ts のエントリのコメント） */
    memo: z.array(z.string()).default([]),
  })
  .strict();

/** 1 商品（読み書きの実装は scripts/lib/product-registry.mjs） */
export const Product = z.discriminatedUnion('channel', [NoteProduct, KindleProduct, CoconalaProduct]);

/** チャネルごとの生成物の付帯情報（商品の行に属さない欄） */
const productChannels = z
  .object({
    kindle: z
      .object({ catalogComment: text, catalogSchemaVersion: z.number().int(), updatedAt: text })
      .strict()
      .describe('scripts/kindle-published/catalog.json の先頭の欄（_comment・schemaVersion・updatedAt）'),
  })
  .partial()
  .strict();

/** 全チャネルの商品を 1 ファイルに集めた正本（並びは channel → id。書き換えは npm run product） */
export const ConfigProducts = z
  .object({
    schemaVersion: z.literal(1),
    _doc: text,
    channels: productChannels.optional(),
    products: z.array(Product).superRefine(uniqueBy('id', '商品 id')),
    /**
     * note の記事 1 本ごとの単品価格（円）。キーはリポジトリ相対の article.md パス。記事の frontmatter の price は
     * ここからの写し（npm run product -- gen が書く）。新しい記事の price は gen がここへ取り込む
     */
    articlePrices: z
      .record(z.string().regex(/^content\/note\/.+\/article(-[^/]+)?\.md$/, 'content/note/…/article.md'), z.number().int().nonnegative())
      .optional()
      .describe('note の記事ごとの単品価格（キーは記事のパス・値は円）'),
  })
  .strict()
  .meta({ title: '商品の正本' });
