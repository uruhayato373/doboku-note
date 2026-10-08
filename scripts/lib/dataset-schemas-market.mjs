/**
 * dataset-schemas-market.mjs — 競合・市場・SNS・ASP の取得記録 の型（zod）。dataset-schemas.mjs が export * で束ね、台帳（datasets.mjs）の schema が名前で引く。
 * 型を足す約束は dataset-schemas.mjs の先頭。部品は dataset-schema-parts.mjs。
 *
 * 競合の時系列（note・ココナラ・X・Instagram・YouTube）は同じ封筒（fetchedAt・drift・driftBasis・competitors）なので、
 * 封筒と共通の部品（price・drift・handle）をここで 1 回だけ書く（competitorSnapshot）。取得元ごとに違うのは 1 社の行と drift の語彙だけ。
 * 書き手: scripts/scout-{note,coconala,x,ig,youtube}-competitors.mjs・scout-coconala-blogs.mjs（競合）、x-own-metrics.mjs、youtube-own-metrics.mjs、
 * coconala-research.mjs（市場調査と要約）、scan-qualification-market.mjs、verify-note-status.mjs、
 * fetch-a8-ui-csv.mjs と .claude/skills/ads/scout-asp/scripts/a8-browser.ts（A8）。
 */
import { z } from 'zod';
import { utcTime, offsetTime, count, yen, orNull, flag, uniqueBy } from './dataset-schema-parts.mjs';

// ---- 競合の時系列（共通の部品）-----------------------------------------------------------------

const handleField = z.string().min(1).describe('追跡対象のハンドル（台帳 config.competitors の handle）');
const examsField = z.array(z.string().min(1)).describe('その競合が当たる資格 id（qualification-registry の id）');
const driftBasisField = z.string().nullable().describe('前回比の基準にした前回の記録（ファイル名か取得時刻）。比べる前回が無い（初回・部分実行）なら null');

const priceBandsField = z
  .object({ low: count('〜999 円の商品数'), mid: count('1,000〜2,999 円の商品数'), high: count('3,000〜11,999 円の商品数'), premium: count('12,000 円以上の商品数') })
  .strict()
  .describe('価格帯ごとの有料商品数');
const priceStatsField = z
  .object({
    min: orNull(yen('最安の有料商品'), '有料商品が無ければ null'),
    median: orNull(yen('有料商品の価格の中央値'), '有料商品が無ければ null'),
    max: orNull(yen('最高の有料商品（フラグシップ価格の代わり）'), '有料商品が無ければ null'),
    bands: priceBandsField,
  })
  .strict()
  .describe('価格（有料商品だけ）');

const driftRow = (types) =>
  z
    .object({
      handle: handleField,
      type: z.enum(types).describe('前回との違いの種類'),
      detail: z.string().describe('人が読む説明'),
      field: z.enum(['max', 'median']).optional().describe('価格の違いのとき、どの値か'),
      before: z.number().optional().describe('前回の値'),
      after: z.number().optional().describe('今回の値'),
    })
    .strict();

const profileNote = z.string().nullable().describe('台帳 config.competitors の note（性格だけ。観測値は書かない）');

/** 競合の時系列の封筒。row は 1 社の行・head は取得元ごとの頭の欄（platform・caveat 等） */
function competitorSnapshot({ head, driftTypes, row, title }) {
  return z
    .object({
      schemaVersion: z.literal(1),
      fetchedAt: utcTime('取得時刻'),
      ...head,
      driftBasis: driftBasisField,
      drift: z.array(driftRow(driftTypes)).describe('前回比の差分。比べる前回が無いときは空'),
      competitors: z.array(row).describe('追跡した社ごとの行（取得に失敗した社も行は残る）').superRefine(uniqueBy('handle', 'handle')),
    })
    .strict()
    .superRefine((s, ctx) => {
      if (s.driftBasis === null && s.drift.length > 0) flag(ctx, ['drift'], '前回の基準（driftBasis）が無いのに差分がある');
    })
    .meta({ title });
}

// ---- note の競合 -------------------------------------------------------------------------------

const NoteCompetitorRow = z
  .object({
    handle: handleField,
    label: z.string().nullable().describe('表示名'),
    exams: examsField,
    note: profileNote,
    profile: z
      .object({
        nickname: z.string().nullable(),
        followerCount: count('フォロワー数').nullable(),
        noteCount: count('記事数').nullable(),
        magazineCount: count('マガジン数').nullable(),
      })
      .strict()
      .nullable()
      .describe('プロフィール。取得できなければ null'),
    counts: z
      .object({
        magazinesTotal: count('取得したマガジン数'),
        magazinesPaid: count('うち有料'),
        notesSampled: count('サンプルした単品記事数（直近ページだけ）'),
        notesComplete: z.boolean().describe('単品記事を最後のページまで取れたか'),
        notesPaidInSample: count('サンプルのうち有料の単品記事'),
      })
      .strict(),
    price: priceStatsField,
    cadence: z
      .object({
        recent30: count('直近 30 日の投稿数（サンプル内）'),
        recent90: count('直近 90 日の投稿数（サンプル内）'),
        latestPublishAt: orNull(offsetTime('最新の投稿日時（note の API の値）'), '投稿を取れなければ null'),
        latestDaysAgo: z.number().int().nullable().describe('最新の投稿から何日か（予約投稿なら負になりうる）。投稿を取れなければ null'),
      })
      .strict(),
    hasMembership: z.boolean().describe('メンバーシップに繋がる記事・マガジンがあるか'),
    topLiked: z
      .array(z.object({ name: z.string(), likeCount: count('スキ数'), price: yen('価格') }).strict())
      .max(5)
      .describe('スキ数の多い単品記事の上位'),
    paidMagazines: z
      .array(
        z
          .object({
            key: z.string().min(1),
            name: z.string(),
            price: yen('マガジンの価格'),
            description: z.string().describe('説明の先頭 160 文字'),
            noteCount: count('収録記事数（--contents のときだけ）').optional(),
            notes: z.array(z.object({ key: z.string(), name: z.string(), price: yen('価格') }).strict()).optional().describe('収録記事（--contents のときだけ）'),
          })
          .strict(),
      )
      .describe('有料マガジンの全件'),
    paidNotesSample: z
      .array(
        z
          .object({
            key: z.string().min(1),
            name: z.string(),
            price: yen('価格'),
            likeCount: count('スキ数').nullable(),
            publishAt: orNull(offsetTime('公開日時（note の API の値）'), 'API が返さなければ null'),
          })
          .strict(),
      )
      .max(30)
      .describe('サンプル内の有料の単品記事（先頭 30 件まで）'),
  })
  .strict()
  .superRefine((c, ctx) => {
    const bands = Object.values(c.price.bands).reduce((a, b) => a + b, 0);
    if (bands !== c.counts.magazinesPaid + c.counts.notesPaidInSample) flag(ctx, ['price', 'bands'], `価格帯の合計 ${bands} が有料マガジン＋有料の単品記事と合わない`);
    if (c.paidMagazines.length !== c.counts.magazinesPaid) flag(ctx, ['paidMagazines'], `有料マガジンの行数 ${c.paidMagazines.length} が counts.magazinesPaid ${c.counts.magazinesPaid} と合わない`);
    if (c.paidNotesSample.length !== Math.min(30, c.counts.notesPaidInSample)) flag(ctx, ['paidNotesSample'], '有料の単品記事の行数が counts.notesPaidInSample（上限 30）と合わない');
    if (c.counts.magazinesPaid > c.counts.magazinesTotal) flag(ctx, ['counts', 'magazinesPaid'], '有料マガジンが取得したマガジンより多い');
    if (c.counts.notesPaidInSample > c.counts.notesSampled) flag(ctx, ['counts', 'notesPaidInSample'], '有料の単品記事がサンプルより多い');
    const { min, median, max } = c.price;
    if ((min === null) !== (bands === 0)) flag(ctx, ['price'], '有料商品の有無と価格（min）の null が合わない');
    if (min !== null && !(min <= median && median <= max)) flag(ctx, ['price'], '価格が min ≤ median ≤ max になっていない');
  });

/** note の競合クリエイターの時系列（data/note/competitors/<日付>.json）。取得は scripts/scout-note-competitors.mjs */
export const NoteCompetitors = competitorSnapshot({
  head: {
    notePagesPerCreator: z.number().int().min(1).describe('単品記事を何ページ取ったか（1 ページ 1 作者）'),
    withMagazineContents: z.boolean().describe('マガジンの収録記事まで取ったか（--contents）'),
    caveat: z.string().describe('取得の限界（有料本文は取れない・単品記事はサンプル）'),
  },
  driftTypes: ['new-entrant', 'dropped', 'price', 'new-product', 'removed', 'dormant', 'revived'],
  row: NoteCompetitorRow,
  title: 'note の競合クリエイター',
});

// ---- ココナラの競合 ----------------------------------------------------------------------------

const COCONALA_SEGMENTS = ['tensaku', 'daiko', 'shindan', 'soudan', 'kyozai', 'other'];
const coconalaSegment = z.enum(COCONALA_SEGMENTS).describe('出品の区分（タイトルとキャッチから機械分類。tensaku 添削・daiko 作成代行・shindan 診断・soudan 相談・kyozai 教材・other その他）');
const coconalaRating = z.number().min(0).max(5).nullable().describe('評価（5 点満点）。評価が無ければ null');
const coconalaReviews = count('評価件数').nullable().describe('評価件数。画面に無ければ null');

const CoconalaCompetitorRow = z
  .object({
    handle: handleField,
    label: z.string().nullable().describe('表示名'),
    exams: examsField,
    note: profileNote,
    profile: z.object({ nickname: z.string().nullable() }).strict(),
    counts: z.object({ services: count('出品数（検索由来の関連サービスだけ・全出品ではない）'), servicesSource: z.string().describe('出品の取得元の説明') }).strict(),
    price: priceStatsField,
    cadence: z.null().describe('ココナラは投稿日を公開しないので常に null'),
    platformExtra: z
      .object({
        totalSales: count('累計販売実績').nullable(),
        totalReviews: count('出品の評価件数の合計'),
        avgRating: z.number().min(0).max(5).nullable().describe('出品の評価の平均。出品が無ければ null'),
      })
      .strict(),
    services: z
      .array(
        z
          .object({
            title: z.string().nullable(),
            priceYen: yen('価格').nullable(),
            rating: coconalaRating,
            reviews: coconalaReviews,
            url: z.string().startsWith('https://coconala.com/services/'),
            segment: coconalaSegment,
          })
          .strict(),
      )
      .max(30)
      .describe('出品（先頭 30 件まで）'),
  })
  .strict()
  .superRefine((c, ctx) => {
    const { min, median, max } = c.price;
    if (min !== null && !(min <= median && median <= max)) flag(ctx, ['price'], '価格が min ≤ median ≤ max になっていない');
  });

/** ココナラの競合セラーの時系列（data/coconala/competitors/<日付>.json）。取得は scripts/scout-coconala-competitors.mjs */
export const CoconalaCompetitors = competitorSnapshot({
  head: { platform: z.literal('coconala'), caveat: z.string().describe('取得の限界') },
  driftTypes: ['new-entrant', 'dropped', 'price', 'new-product', 'removed', 'sales'],
  row: CoconalaCompetitorRow,
  title: 'ココナラの競合セラー',
});

// ---- X・Instagram の競合 -----------------------------------------------------------------------

/** 取得に成功した行だけが持つ欄が揃っているか（失敗した行は error を持ち、profile が null か無い） */
function requireOnSuccess(fields) {
  return (row, ctx) => {
    if (row.error !== undefined) {
      if (row.profile) flag(ctx, ['profile'], '取得に失敗した行（error あり）が profile を持っている');
      return;
    }
    if (!row.profile) flag(ctx, ['profile'], '取得に成功した行（error なし）に profile が無い');
    for (const f of fields) if (row[f] === undefined) flag(ctx, [f], `取得に成功した行（error なし）に ${f} が無い`);
  };
}

const XCompetitorRow = z
  .object({
    handle: handleField,
    label: z.string().nullable().describe('表示名'),
    exams: examsField.optional().describe('当たる資格 id（取得中に例外で落ちた行は持たない）'),
    note: profileNote.optional(),
    profile: z
      .object({ nickname: z.string().nullable(), screenName: z.string().nullable(), followerCount: count('フォロワー数').nullable() })
      .strict()
      .nullable()
      .optional()
      .describe('プロフィール。取得できなければ null（error の行）'),
    error: z.string().optional().describe('取得に失敗した理由（失敗した行だけ）'),
    counts: z.object({ tweetsTotal: count('総投稿数').nullable(), postsSampled: count('サンプルした投稿数') }).strict().optional(),
    cadence: z
      .object({ recent30: count('直近 30 日の投稿数（サンプル内）'), recent90: count('直近 90 日の投稿数（サンプル内）'), latestDaysAgo: count('最新の投稿から何日か').nullable() })
      .strict()
      .optional(),
    platformExtra: z
      .object({
        following: count('フォロー数').nullable(),
        verified: z.boolean(),
        avgEngagement: z.number().min(0).nullable().describe('サンプルの平均反応（いいね＋リポスト）。サンプルが無ければ null'),
        medianEngagement: z.number().min(0).nullable().describe('サンプルの反応の中央値。サンプルが無ければ null'),
        engagementRate: z.number().min(0).nullable().describe('平均反応 ÷ フォロワー（%）'),
        accountAgeYears: z.number().min(0).nullable().describe('アカウントの年齢（年）'),
      })
      .strict()
      .optional(),
    engagementLeaders: z
      .array(
        z
          .object({
            text: z.string().describe('本文の先頭 90 文字（丸写しはしない）'),
            likes: count('いいね').optional(),
            rts: count('リポスト').optional(),
            engagement: count('いいね＋リポスト'),
            vsAvg: z.number().min(0).nullable().describe('そのアカウントの平均比'),
          })
          .strict(),
      )
      .max(10)
      .optional()
      .describe('反応の大きい投稿の上位'),
  })
  .strict()
  .superRefine(requireOnSuccess(['counts', 'cadence', 'platformExtra', 'engagementLeaders']));

/** X の競合アカウントの時系列（data/x/competitors/<日付>.json）。取得は scripts/scout-x-competitors.mjs */
export const XCompetitors = competitorSnapshot({
  head: { platform: z.literal('x'), source: z.string().describe('取得元'), caveat: z.string().describe('取得の限界') },
  driftTypes: ['new-entrant', 'dropped', 'followers', 'posts', 'slowdown', 'revived'],
  row: XCompetitorRow,
  title: 'X の競合アカウント',
});

const IgCompetitorRow = z
  .object({
    handle: handleField,
    label: z.string().nullable().describe('表示名'),
    exams: examsField,
    note: profileNote,
    profile: z.object({ nickname: z.string().nullable(), followerCount: count('フォロワー数').nullable() }).strict().nullable().describe('プロフィール。取得できなければ null（error の行）'),
    error: z.string().optional().describe('取得に失敗した理由（失敗した行だけ）'),
    counts: z.object({ posts: count('投稿数').nullable() }).strict().optional(),
    cadence: z.null().optional().describe('未ログインでは投稿日時が取れないので null'),
    platformExtra: z.object({ following: count('フォロー数').nullable(), followerPerPost: z.number().min(0).nullable().describe('投稿あたりのフォロワー数') }).strict().optional(),
  })
  .strict()
  .superRefine(requireOnSuccess(['counts', 'cadence', 'platformExtra']));

/** Instagram の競合アカウントの時系列（data/instagram/competitors/<日付>.json）。取得は scripts/scout-ig-competitors.mjs */
export const InstagramCompetitors = competitorSnapshot({
  head: { platform: z.literal('ig'), source: z.string().describe('取得元'), caveat: z.string().describe('取得の限界') },
  driftTypes: ['new-entrant', 'dropped', 'followers', 'new-posts', 'removed-posts'],
  row: IgCompetitorRow,
  title: 'Instagram の競合アカウント',
});

// ---- ココナラブログの競合 -----------------------------------------------------------------------

const blogPost = z.object({ title: z.string().nullable(), url: z.url() }).strict();

/** ココナラブログの競合（data/coconala/blog-competitors/<日付>.json）。取得は scripts/scout-coconala-blogs.mjs（検索語ごと・見張るユーザーごと） */
export const CoconalaBlogCompetitors = z
  .object({
    schemaVersion: z.literal(1),
    fetchedAt: utcTime('取得時刻'),
    platform: z.literal('coconala-blog'),
    caveat: z.string().describe('取得の限界'),
    queries: z
      .array(
        z
          .object({
            q: z.string().min(1).describe('検索語'),
            exam: z.string().nullable().describe('資格 id（台帳 config.coconala-blog の exam）'),
            note: z.string().nullable().optional().describe('config の note（取得に失敗した行は持たない）'),
            ok: z.boolean().describe('ヒット数か上位記事のどちらかが取れたか'),
            error: z.string().optional().describe('取得に失敗した理由（例外の行だけ）'),
            totalHits: count('検索のヒット総数（部分一致でノイズを含む）').nullable(),
            collected: count('上位として取った記事数'),
            top: z
              .array(
                z
                  .object({
                    title: z.string().nullable(),
                    url: z.url(),
                    userId: z.string().nullable(),
                    postId: z.string().nullable(),
                    meta: z.array(z.string()).describe('カードの末尾 4 行（種別・カテゴリ・著者・日付が順不同で入る）'),
                  })
                  .strict(),
              )
              .describe('検索結果の上位記事'),
          })
          .strict()
          .superRefine((r, ctx) => {
            if (r.collected !== r.top.length) flag(ctx, ['collected'], `collected ${r.collected} が top の行数 ${r.top.length} と合わない`);
            if (r.error !== undefined && r.ok) flag(ctx, ['ok'], 'error がある行が ok になっている');
          }),
      )
      .superRefine(uniqueBy('q', '検索語')),
    users: z
      .array(
        z.looseObject({
          id: z.string().min(1).describe('ユーザー id（config の watchUsers）'),
          ok: z.boolean().describe('ページを読めたか（HTTP 200）'),
          status: z.number().int().nullable().optional().describe('HTTP ステータス（例外の行は持たない）'),
          error: z.string().optional(),
          postCount: count('ブログ一覧で見つけた記事数（posts は先頭 30 件まで）'),
          posts: z.array(blogPost).max(30),
        }),
      )
      .describe('見張るユーザー。label・exams・note は config の値がそのまま入る'),
    drift: z
      .array(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('hits'), q: z.string(), from: count('前回のヒット数'), to: count('今回のヒット数') }).strict(),
          z.object({ type: z.literal('posts'), user: z.string(), label: z.string().optional(), from: count('前回の記事数'), to: count('今回の記事数') }).strict(),
        ]),
      )
      .describe('前回比の差分（hits=検索のヒット数・posts=ユーザーの記事数）'),
    driftBasis: driftBasisField,
    scan: z.object({ target: count('取得対象（検索語＋ユーザー）'), ok: count('取得できた数'), failed: count('取得できなかった数') }).strict(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.scan.target !== s.queries.length + s.users.length) flag(ctx, ['scan', 'target'], `target ${s.scan.target} が検索語＋ユーザーの数と合わない`);
    if (s.scan.ok + s.scan.failed !== s.scan.target) flag(ctx, ['scan'], 'ok と failed の合計が target と合わない');
    const ok = s.queries.filter((q) => q.ok).length + s.users.filter((u) => u.ok).length;
    if (s.scan.ok !== ok) flag(ctx, ['scan', 'ok'], `ok ${s.scan.ok} が ok の行の数 ${ok} と合わない`);
    if (s.driftBasis === null && s.drift.length > 0) flag(ctx, ['drift'], '前回の基準（driftBasis）が無いのに差分がある');
  })
  .meta({ title: 'ココナラブログの競合' });

// ---- 自分の X 投稿 ------------------------------------------------------------------------------

/** 自分の X 投稿の反応（data/x/own-posts/<日付>.json）。取得は scripts/x-own-metrics.mjs */
export const XOwnPosts = z
  .object({
    schemaVersion: z.literal(1),
    handle: z.string().min(1).describe('投稿アカウントのハンドル'),
    fetchedAt: offsetTime('取得時刻（JST の +09:00 で書く。ファイル名の日付はこの日付）'),
    followers: count('フォロワー数').nullable().describe('フォロワー数。取れなければ null'),
    unavailableMetrics: z.array(z.enum(['impressions', 'replies', 'profileClicks'])).describe('取れない指標（取れないことを「反応なし」と読まないための明記）'),
    source: z.string().describe('取得元'),
    posts: z
      .array(
        z
          .object({
            id: z.string().min(1).describe('投稿 id'),
            text: z.string(),
            likes: count('いいね数'),
            rts: count('リポスト数'),
            postedAtJst: offsetTime('投稿日時（JST の +09:00）').nullable().describe('投稿日時（JST の +09:00）。時刻を読めなければ null'),
            date: z.iso.date().nullable().describe('投稿日（JST の YYYY-MM-DD）。時刻を読めなければ null'),
            hour: z.number().int().min(0).max(23).nullable().describe('投稿の時（JST）。時刻を読めなければ null'),
          })
          .strict()
          .superRefine((p, ctx) => {
            if (p.postedAtJst === null) {
              if (p.date !== null || p.hour !== null) flag(ctx, ['postedAtJst'], '投稿日時が null なのに date か hour がある');
              return;
            }
            if (p.date !== p.postedAtJst.slice(0, 10)) flag(ctx, ['date'], `date ${p.date} が投稿日時 ${p.postedAtJst} の日付と合わない`);
            if (p.hour !== Number(p.postedAtJst.slice(11, 13))) flag(ctx, ['hour'], `hour ${p.hour} が投稿日時 ${p.postedAtJst} の時と合わない`);
          }),
      )
      .min(1)
      .describe('取得した投稿（0 件の取得は記録しない）')
      .superRefine(uniqueBy('id', '投稿 id')),
  })
  .strict()
  .meta({ title: '自分の X 投稿の反応' });

// ---- note の公開状態の要約 ------------------------------------------------------------------------

const noteStatusRow = { rel: z.string().min(1).describe('記事ファイルのリポジトリ相対パス'), noteId: z.string().describe('note の記事 id（無ければ「(空)」）'), status: z.string().describe('frontmatter の noteStatus') };

/** note 記事の公開状態の要約（data/note/status.json）。取得は scripts/verify-note-status.mjs --snapshot（週次の CI） */
export const NoteStatusSnapshot = z
  .object({
    schemaVersion: z.literal(1),
    fetchedAt: utcTime('取得時刻'),
    tracked: count('noteStatus を運用している記事'),
    untracked: count('noteStatus を運用していない記事（対象外）'),
    noId: count('noteId がまだ無い記事'),
    fetchTargets: count('ライブの状態を取りに行った記事（tracked − noId）'),
    inspected: count('ライブの状態を取れた記事'),
    fetchFail: count('ライブの状態を取れなかった記事'),
    fetchFailRate: z.number().min(0).max(1).describe('取れなかった割合。対象が 0 件なら 1（検査不成立）'),
    notConclusive: z.boolean().describe('検査不成立か（対象が 0 件、または取得失敗が上限を超えた）'),
    drift: z.array(z.object({ ...noteStatusRow, live: z.literal('published').describe('ライブの状態') }).strict()).describe('ライブは公開済みなのに noteStatus が公開でない記事'),
    warn: z.array(z.object({ ...noteStatusRow, live: z.string().describe('ライブの状態（404・draft 等。noteId が無ければ no-id）') }).strict()).describe('noteStatus は公開と主張するがライブが公開でない記事'),
    noLive: z.array(z.object(noteStatusRow).strict()).describe('ライブの状態を取れなかった記事（throttle・通信失敗・予約が未ライブ）'),
    fixed: count('--fix で noteStatus を直した記事数'),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.fetchTargets !== s.tracked - s.noId) flag(ctx, ['fetchTargets'], `fetchTargets ${s.fetchTargets} が tracked − noId と合わない`);
    if (s.fetchFail !== s.noLive.length) flag(ctx, ['fetchFail'], `fetchFail ${s.fetchFail} が noLive の件数 ${s.noLive.length} と合わない`);
    if (s.inspected !== s.fetchTargets - s.fetchFail) flag(ctx, ['inspected'], `inspected ${s.inspected} が fetchTargets − fetchFail と合わない`);
    const rate = s.fetchTargets ? s.fetchFail / s.fetchTargets : 1;
    if (Math.abs(s.fetchFailRate - rate) > 1e-9) flag(ctx, ['fetchFailRate'], `fetchFailRate ${s.fetchFailRate} が fetchFail ÷ fetchTargets（${rate}）と合わない`);
    if (s.fetchTargets === 0 && !s.notConclusive) flag(ctx, ['notConclusive'], '対象が 0 件なのに検査成立になっている（検査ゼロを緑にしない）');
    if (s.fixed > s.drift.length) flag(ctx, ['fixed'], 'fixed が drift の件数より多い');
  })
  .meta({ title: 'note 記事の公開状態' });

// ---- ココナラの市場調査 -----------------------------------------------------------------------------

/** ココナラの市場調査の検索語の区分（coconala-research.mjs の classify の語彙と同じ） */
const researchSegment = coconalaSegment;

/** ココナラの市場調査（data/coconala/market-research.json）。取得は scripts/coconala-research.mjs（1 ページごとに書く＝途中経過のファイルも通る） */
export const CoconalaMarketResearch = z
  .object({
    schemaVersion: z.literal(2).describe('保存形の版。2 は出品を services に URL で 1 件ずつ持つ形（1 は語ごとに出品を重ねて持つ旧形で、読み込み時に 2 へ畳む）'),
    fetchedAt: utcTime('調査の開始時刻'),
    method: z.string().describe('取得方法'),
    note: z.string().describe('調査の性格（公開ページの read-only）'),
    queries: z
      .array(
        z
          .object({
            keyword: z.string().min(1).describe('検索語'),
            resolvedUrl: z.url().nullable().describe('実際に開いた URL。1 ページ目を読む前は null'),
            pageType: z.enum(['search', 'category']).nullable().describe('検索結果ページか、カテゴリページに飛ばされたか。1 ページ目を読む前は null'),
            totalHits: count('検索のヒット総数').nullable().describe('検索のヒット総数。読めなければ null'),
            pagesScanned: count('読み終えたページ数'),
            complete: z.boolean().describe('この語の取得が終わったか（false は途中経過）'),
          })
          .strict()
          .superRefine((q, ctx) => {
            if (q.complete && (q.resolvedUrl === null || q.pageType === null)) flag(ctx, ['complete'], '取得が終わった語なのに URL か pageType が無い');
          }),
      )
      .describe('検索語ごとの進み具合（出品は持たない）')
      .superRefine(uniqueBy('keyword', '検索語')),
    services: z
      .array(
        z
          .object({
            title: z.string().nullable(),
            catchphrase: z.string().nullable(),
            seller: z.string().nullable().describe('出品者名（読めなければ null）'),
            rating: coconalaRating,
            reviews: coconalaReviews,
            priceYen: yen('価格').nullable().describe('価格（円）。読めなければ null'),
            url: z.string().startsWith('https://coconala.com/services/').describe('出品の URL（行の主キー）'),
            segment: researchSegment,
            queries: z.array(z.string().min(1)).min(1).describe('この出品が見つかった検索語'),
            detail: z
              .looseObject({
                deliveryDays: z.string().nullable().optional(),
                totalSales: z.string().nullable().optional(),
                description: z.string().nullable().optional(),
                hasOptions: z.boolean().optional(),
                error: z.string().optional().describe('詳細ページを取れなかったとき'),
              })
              .optional()
              .describe('詳細ページを取ったときだけ持つ（レビュー数の多い上位だけ）'),
          })
          .strict(),
      )
      .describe('出品。URL で一意')
      .superRefine(uniqueBy('url', '出品の URL')),
    updatedAt: utcTime('最終更新時刻（1 ページごとのチェックポイントのたびに更新）'),
  })
  .strict()
  .superRefine((r, ctx) => {
    const keywords = new Set(r.queries.map((q) => q.keyword));
    r.services.forEach((s, i) => {
      for (const k of s.queries) if (!keywords.has(k)) flag(ctx, ['services', i, 'queries'], `検索語「${k}」が queries に無い`);
    });
  })
  .meta({ title: 'ココナラの市場調査（検索結果の出品）' });

const summaryPrice = z
  .object({ min: yen('最安'), median: yen('中央値'), mean: yen('平均'), max: yen('最高') })
  .strict()
  .nullable()
  .describe('価格（円）の分布。価格のある出品が無ければ null');

/** ココナラの市場調査の要約（data/coconala/market-summary.json）。market-research.json から coconala-research.mjs が導出する（派生物） */
export const CoconalaMarketSummary = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: utcTime('要約を作った時刻'),
    fetchedAt: utcTime('元の調査の開始時刻（market-research.json の fetchedAt）'),
    source: z.string().min(1).describe('元データのパス'),
    note: z.string(),
    keywords: z
      .array(
        z
          .object({
            keyword: z.string().min(1).describe('検索語'),
            totalHits: count('検索のヒット総数').nullable(),
            collected: count('取得した出品数'),
            priceYen: summaryPrice,
            segments: z.partialRecord(researchSegment, count('出品数')).describe('区分ごとの出品数（0 件の区分は持たない）'),
            topByReviews: z
              .array(
                z
                  .object({
                    title: z.string().nullable(),
                    seller: z.string().nullable(),
                    priceYen: yen('価格').nullable(),
                    rating: coconalaRating,
                    reviews: coconalaReviews,
                    segment: researchSegment,
                    url: z.string().startsWith('https://coconala.com/services/'),
                  })
                  .strict(),
              )
              .max(5)
              .describe('評価件数の多い出品の上位 5'),
          })
          .strict()
          .superRefine((k, ctx) => {
            const sum = Object.values(k.segments).reduce((a, b) => a + b, 0);
            if (sum !== k.collected) flag(ctx, ['segments'], `区分の合計 ${sum} が collected ${k.collected} と合わない`);
            if (k.priceYen && !(k.priceYen.min <= k.priceYen.median && k.priceYen.median <= k.priceYen.max)) flag(ctx, ['priceYen'], '価格が min ≤ median ≤ max になっていない');
          }),
      )
      .describe('検索語ごとの要約')
      .superRefine(uniqueBy('keyword', '検索語')),
  })
  .strict()
  .meta({ title: 'ココナラの市場調査の要約' });

// ---- 資格ごとの市場スキャン ---------------------------------------------------------------------------

/** 検索語 1 つの取得結果。失敗は error を持ち items は空 */
const scanHit = (item, { total = false } = {}) =>
  z
    .object({
      fetchedAt: utcTime('取得時刻'),
      error: z.string().optional().describe('取得に失敗した理由（失敗した語だけ。items は空）'),
      ...(total ? { total: count('検索のヒット総数').nullable().optional().describe('検索のヒット総数（失敗した語は持たない）') } : {}),
      items: z.array(item).describe('取得した上位の結果'),
    })
    .strict()
    .superRefine((h, ctx) => {
      if (h.error !== undefined && h.items.length > 0) flag(ctx, ['items'], '取得に失敗した語（error あり）が items を持っている');
    });

/** 資格ごとの市場スキャン（data/analysis/qualification-market/<日付>.json）。取得は scripts/scan-qualification-market.mjs。1 ファイル＝その日の市場で、前のファイルを土台に取った語だけ上書きする */
export const QualificationMarketScan = z
  .object({
    schemaVersion: z.literal(1),
    updatedAt: utcTime('最終更新時刻（1 語ごとに更新）'),
    youtube: z
      .record(
        z.string().min(1),
        scanHit(
          z
            .object({
              videoId: z.string().min(1),
              title: z.string(),
              channel: z.string().describe('チャンネル名'),
              channelId: z.string().nullable().describe('チャンネル id。取れなければ null'),
              views: count('再生数').nullable(),
            })
            .strict(),
        ),
      )
      .describe('YouTube の検索語 → 検索結果（yt-dlp の ytsearch）'),
    note: z
      .record(
        z.string().min(1),
        scanHit(
          z
            .object({
              key: z.string().min(1).describe('note の記事キー'),
              title: z.string(),
              creator: z.string().describe('作者の urlname'),
              price: yen('価格（無料は 0）'),
              likes: count('スキ数'),
              publishAt: orNull(offsetTime('公開日時（note の API の値）'), 'API が返さなければ null'),
            })
            .strict(),
          { total: true },
        ),
      )
      .describe('note の検索語 → 検索結果（公開検索 API）'),
    youtubeChannels: z
      .record(
        z.string().min(1),
        z
          .object({
            fetchedAt: utcTime('取得時刻'),
            name: z.string().optional().describe('チャンネル名（失敗した行は持たない）'),
            followers: count('登録者数').nullable().optional().describe('登録者数（失敗した行は持たない・取れなければ null）'),
            error: z.string().optional().describe('取得に失敗した理由'),
          })
          .strict()
          .superRefine((c, ctx) => {
            if (c.error === undefined && (c.name === undefined || c.followers === undefined)) flag(ctx, ['name'], '取得に成功した行（error なし）に name か followers が無い');
          }),
      )
      .describe('追跡中の YouTube チャンネル id → 登録者数（台帳 config.competitors の youtube）'),
  })
  .strict()
  .meta({ title: '資格ごとの市場スキャン' });

// ---- A8 -------------------------------------------------------------------------------------------

const A8_STATES = ['candidate', 'applied', 'approved', 'harvested', 'pending-vertical', 'registered', 'published', 'rejected', 'blocked', 'error'];

const a8Entry = z.looseObject({
  programId: z.string().min(1).describe('A8 のプログラム id（行の主キー。キーと同じ）'),
  status: z.enum([...A8_STATES, 'snapshot']).describe('状態機械の状態（.claude/scripts/ads/lib/a8-scout-core.mjs の A8_STATES）。snapshot は状態機械の外の記録（__applying）'),
  name: z.string().nullable().optional().describe('案件名'),
  genre: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  a8mat: z.string().nullable().optional().describe('広告コードの a8mat トークン（harvest が確定する）'),
  vertical: z.enum(['civil-career', 'pe-career', 'career']).nullable().optional().describe('転職の軸。どれにも当たらなければ null'),
  score: z.number().min(0).nullable().optional().describe('候補のスコア（0〜1 に収まるよう正規化した式）。提携中の取り込みは null'),
  epcYen: z.number().min(0).optional().describe('EPC（円）'),
  confirmRatePct: z.number().min(0).max(100).optional().describe('承認率（%）'),
  rewardYen: z.number().min(0).optional().describe('定額の報酬（円）'),
  rewardRatePct: z.number().min(0).optional().describe('定率の報酬（%）'),
  rewardType: z.enum(['fixed', 'rate']).optional().describe('報酬の種類（定額・定率）'),
  source: z.string().optional().describe('取り込み元（例 existing-partnership）'),
  history: z
    .array(
      z.looseObject({
        from: z.enum(A8_STATES).nullable().optional().describe('遷移前の状態（最初の投入は null）'),
        to: z.enum(A8_STATES).describe('遷移後の状態'),
        at: utcTime('遷移の時刻').optional(),
        note: z.string().optional(),
      }),
    )
    .optional()
    .describe('状態の遷移の履歴（状態機械の外の記録は持たない）'),
});

/** A8 の提携案件の一覧と状態機械（data/a8/catalog.json）。更新は .claude/skills/ads/scout-asp/scripts/a8-browser.ts。キーが __ で始まる行は状態機械の外の記録（__applying・__session） */
export const A8Catalog = z
  .object({
    schemaVersion: z.literal(1),
    _doc: z.string().describe('ファイルの説明（手編集しない）'),
    entries: z.record(z.string().min(1), a8Entry).describe('プログラム id → 案件'),
    updatedAt: utcTime('最終更新時刻'),
  })
  .strict()
  .superRefine((c, ctx) => {
    for (const [key, e] of Object.entries(c.entries)) {
      if (e.programId !== key) flag(ctx, ['entries', key, 'programId'], `programId ${e.programId} がキー ${key} と違う`);
      if (key.startsWith('__')) continue;
      if (e.status === 'snapshot') flag(ctx, ['entries', key, 'status'], 'snapshot は __ で始まるキーだけ');
      const last = e.history?.at(-1);
      if (!last) flag(ctx, ['entries', key, 'history'], '状態機械の行に履歴が無い');
      else if (last.to !== e.status) flag(ctx, ['entries', key, 'status'], `status ${e.status} が履歴の最後の遷移先 ${last.to} と違う`);
    }
  })
  .meta({ title: 'A8 の提携案件' });

/** A8 の画面取得を最後に回した記録（data/a8/ui-last-run.json）。書くのは scripts/fetch-a8-ui-csv.mjs（ドライランでは書かない）。鮮度の宣言は台帳 */
export const A8UiLastRun = z
  .object({
    schemaVersion: z.literal(1),
    lastRun: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/, 'YYYY-MM-DDTHH-MM-SSZ（取得の実行 id）').describe('最後の取得の実行 id（取得時刻から作る。コロンを使わない形）'),
    collectedAt: utcTime('取得時刻'),
    site: z.string().min(1).describe('対象サイト（A8 のサイト名）'),
    mediaId: z.string().min(1).describe('A8 のメディア id'),
    downloadedUnits: count('取れたレポートの数'),
    totalUnits: count('取ろうとしたレポートの数'),
    status: z.enum(['ok', 'partial', 'not-signed-in', 'account-mismatch', 'error']).describe('実行の結果。ok は全部取れた・partial は 1 本でも落ちた・他は途中で止まった'),
    note: z.string().describe('ファイルの説明（成果の生データは含めない）'),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.downloadedUnits > r.totalUnits) flag(ctx, ['downloadedUnits'], '取れた数が取ろうとした数より多い');
  })
  .meta({ title: 'A8 の画面取得の最後の実行' });

// ---- YouTube（自社の動画・競合チャンネル） ----------------------------------------------------

const ytVideoStats = z
  .object({
    sampled: count('一覧から取った動画の数'),
    withViews: count('再生数が取れた動画の数'),
    totalViews: count('再生数の合計（取れた動画だけ）'),
    medianViews: orNull(count('再生数の中央値'), '再生数が 1 本も取れなければ null'),
    medianDurationSec: orNull(count('尺の中央値（秒）'), '尺が 1 本も取れなければ null'),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.withViews > s.sampled) flag(ctx, ['withViews'], '再生数が取れた数が取った数より多い');
  });
const ytLengthBuckets = z
  .array(z.object({ key: z.enum(['under5', '5to15', '15to30', '30to60', 'over60']), videos: count('本数'), medianViews: orNull(count('再生数の中央値'), '0 本なら null') }).strict())
  .length(5)
  .describe('尺の区分ごとの本数と再生中央値（scripts/lib/youtube-listing.mjs の LENGTH_BUCKETS）');
const ytTitleSignals = z
  .array(z.object({ word: z.string().min(1), videos: count('題名に語を含む本数'), medianViews: orNull(count('再生数の中央値'), '0 本なら null') }).strict())
  .describe('題名の語ごとの本数と再生中央値（語は台帳 config.youtube-formats の titleSignals）');
const ytVideo = z
  .object({
    id: z.string().min(1).describe('動画 ID'),
    title: z.string().nullable().describe('題名（日本語表示）'),
    views: orNull(count('累計の再生数'), '一覧に出なければ null'),
    durationSec: orNull(count('尺（秒）'), '一覧に出なければ null'),
  })
  .strict();

/** 自社チャンネルの動画ごとの再生数・尺（data/youtube/own-videos/<日付>.json）。取得は scripts/youtube-own-metrics.mjs（月次） */
export const YoutubeOwnVideos = z
  .object({
    schemaVersion: z.literal(1),
    fetchedAt: utcTime('取得時刻'),
    source: z.string().describe('取得元'),
    caveat: z.string().describe('取得の限界（再生数は累計・視聴維持率やクリック率は無い）'),
    channel: z
      .object({ id: z.string().min(1), handle: z.string().min(1), subscriberCount: orNull(count('登録者数（一覧ページの表示値）'), '取れなければ null') })
      .strict(),
    summary: z.object({ longform: ytVideoStats, shorts: ytVideoStats }).strict().describe('通常動画と Shorts の要約'),
    lengthBuckets: ytLengthBuckets.describe('通常動画の尺の区分'),
    titleSignals: ytTitleSignals,
    byFormat: z
      .array(z.object({ format: z.string().nullable().describe('台帳 config.youtube-formats の型 id。動画パックに当たらない動画は null'), kind: z.enum(['longform', 'short']), stats: ytVideoStats }).strict())
      .describe('型ごとの要約'),
    videos: z
      .array(
        ytVideo
          .extend({
            kind: z.enum(['longform', 'short']).describe('通常動画か Shorts か'),
            packId: z.string().nullable().describe('動画パックの packId（作業状態 state.video-status の content-status の videoId で照合）。当たらなければ null'),
            format: z.string().nullable().describe('型 id。当たらなければ null'),
          })
          .strict(),
      )
      .superRefine(uniqueBy('id', 'id'))
      .describe('一覧に出た動画'),
  })
  .strict()
  .superRefine((s, ctx) => {
    for (const kind of ['longform', 'short']) {
      const n = s.videos.filter((v) => v.kind === kind).length;
      const key = kind === 'short' ? 'shorts' : 'longform';
      if (s.summary[key].sampled !== n) flag(ctx, ['summary', key, 'sampled'], `要約の本数 ${s.summary[key].sampled} が動画の行数 ${n} と合わない`);
    }
  })
  .meta({ title: '自社 YouTube の動画' });

const YoutubeCompetitorRow = z
  .object({
    handle: handleField,
    label: z.string().nullable().describe('表示名'),
    exams: examsField,
    note: profileNote,
    profile: z.object({ title: z.string().nullable().describe('チャンネル名'), subscriberCount: orNull(count('登録者数（一覧ページの表示値）'), '取れなければ null') }).strict().nullable().describe('プロフィール。取得できなければ null（error の行）'),
    error: z.string().optional().describe('取得に失敗した理由（失敗した行だけ）'),
    counts: ytVideoStats.optional().describe('一覧（新しい順）から取った通常動画の要約'),
    cadence: z.null().optional().describe('一覧から投稿日が取れないので null。新しい動画の本数は drift の new-videos で読む'),
    platformExtra: z
      .object({
        lengthBuckets: ytLengthBuckets,
        titleSignals: ytTitleSignals,
        recentIds: z.array(z.string().min(1)).max(30).describe('一覧の先頭（新しい順）の動画 ID。次回の new-videos の基準'),
        top: z.array(ytVideo).max(5).describe('取った範囲で再生数の多い動画'),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine(requireOnSuccess(['counts', 'cadence', 'platformExtra']));

/** YouTube の競合チャンネルの時系列（data/youtube/competitors/<日付>.json）。取得は scripts/scout-youtube-competitors.mjs（四半期） */
export const YoutubeCompetitors = competitorSnapshot({
  head: { platform: z.literal('youtube'), source: z.string().describe('取得元'), caveat: z.string().describe('取得の限界') },
  driftTypes: ['new-entrant', 'dropped', 'subscribers', 'new-videos'],
  row: YoutubeCompetitorRow,
  title: 'YouTube の競合チャンネル',
});
