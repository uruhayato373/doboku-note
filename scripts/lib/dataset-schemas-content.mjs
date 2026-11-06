/**
 * dataset-schemas-content.mjs — コンテンツ台帳（content/registry）と、その設定（config/content-registry.json）の型（zod）。
 * dataset-schemas.mjs が export * で束ね、台帳（datasets.mjs）の schema が名前で引く。設計は .claude/knowledge/reference/content-registry.md。
 * ID の形・参照・状態の遷移のようにファイルをまたぐ検査は check-content-registry（scripts/lib/content-registry.mjs）が持ち、ここは 1 ファイルの形と一意だけを見る。
 */
import { z } from 'zod';
import { jstDate, offsetTime, utcTime, uniqueBy } from './dataset-schema-parts.mjs';

const doc = (what = '説明（読み手は使わない）') => z.string().describe(what);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/, 'sha256（小文字 16 進 64 桁）');
const repoPath = (what) => z.string().min(1).describe(`${what}（リポジトリ相対のパス）`);
const STATUS = ['draft', 'qa_blocked', 'qa_passed', 'approved', 'rendered', 'uploaded_private', 'scheduled', 'published', 'failed', 'refresh_due', 'stopped'];

/** 編集上の目標。公開・予約の事実は RegistryPublications から解決する。 */
const planMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM');
const planWindow = z.object({ from: planMonth, to: planMonth }).strict().refine((w) => w.from <= w.to, '開始月 ≤ 終了月');
const repoRef = z.string().regex(/^[^\s:]+(:\d+)?$/, 'リポジトリの相対パス（:行番号は任意）');
const longformSlot = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), exam: z.string().min(1), format: z.string().min(1).describe('台帳 config.youtube-formats の型 id'),
  title: z.string().min(1), role: z.enum(['attract', 'sell']).describe('attract＝集客・sell＝販売'),
  window: planWindow.describe('公開する月の範囲。2027 年度は 2026 年度の実績を目安にした仮の月'),
  anchors: z.array(z.string().min(1)).min(1).describe('台帳 config.exam-calendar の events・periods のキー。日付は写さない'),
  primaryCta: z.object({ kind: z.enum(['note-magazine', 'coconala-service', 'site-article', 'links-hub']), targets: z.array(z.string().min(1)) }).strict(),
  count: z.number().int().positive().describe('この枠で公開してよい本数の上限'),
  shorts: z.object({ count: z.number().int().positive().describe('この枠の通常動画を親にするショートの上限'), note: z.string().min(1).optional() }).strict().optional().describe('枠のショート。無ければこの枠の親からショートを作らない'),
  reuse: z.enum(['stock', 'revise', 'bundle', 'new']).describe('stock＝完成済み・revise＝既存を改訂・bundle＝既存パックを束ねる・new＝新規'),
  reuseNote: z.string().min(1).describe('既存パックの流用可否の説明'),
  reason: z.object({
    reader: z.string().min(1).describe('読者の課題'), harm: z.string().min(1).describe('HARM と理由'),
    value: z.string().min(1).describe('提供価値と支払う理由'),
    demand: z.string().min(1).describe('需要の証拠。無ければ「未検証」で始める'), evidence: z.array(repoRef).describe('証拠の所在'),
    next: z.string().min(1).describe('次の検証'),
  }).strict(),
}).strict();

/** X・Instagram の枠。YouTube の枠と違い 1 本ずつの行を持たず、型の組み合わせと本数の上限までを決める */
const channelSlot = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), exam: z.string().min(1),
  formats: z.array(z.string().min(1)).min(1).describe('このチャネルの formats の id'),
  title: z.string().min(1), role: z.enum(['attract', 'sell']).describe('attract＝集客・sell＝販売'),
  window: planWindow.describe('投稿する月の範囲。2027 年度は 2026 年度の実績を目安にした仮の月'),
  anchors: z.array(z.string().min(1)).min(1).describe('台帳 config.exam-calendar の events・periods のキー。日付は写さない'),
  primaryCta: z.object({ kind: z.enum(['note-magazine', 'coconala-service', 'site-article', 'links-hub']), targets: z.array(z.string().min(1)) }).strict(),
  count: z.number().int().positive().describe('この枠で投稿してよい本数の上限'),
  salesMax: z.number().int().nonnegative().describe('この枠の販売の投稿の上限。attract は 0'),
  parents: z.array(z.string().min(1)).describe('同じ時期に同じ商品へ送る YouTube の枠'),
  reason: z.object({
    reader: z.string().min(1).describe('読者の課題'), harm: z.string().min(1).describe('HARM と理由'),
    value: z.string().min(1).describe('提供価値と支払う理由'),
    demand: z.string().min(1).describe('需要の証拠。無ければ「未検証」で始める'), evidence: z.array(repoRef).describe('証拠の所在'),
    next: z.string().min(1).describe('次の検証'),
  }).strict(),
}).strict();

const channelPlan = z.object({
  label: z.string().min(1), role: z.string().min(1).describe('このチャネルの役割'),
  operation: z.object({ status: z.enum(['active', 'hold']), since: jstDate('今の状態になった日'), note: z.string().min(1) }).strict().describe('運用の状態。hold の間も枠の検査は動く'),
  enforceFrom: jstDate('枠の検査を始める日'),
  weeklyMax: z.number().int().positive().describe('平常の週の上限（月曜始まり・JST）'),
  peakWeeklyMax: z.number().int().positive().describe('山場の週の上限'),
  peaks: z.array(z.object({ window: planWindow, why: z.string().min(1) }).strict()),
  planRule: z.string().min(1).describe('年間で決める範囲と、1 本ずつの管理の置き場'),
  metrics: z.object({
    primary: z.array(z.object({
      id: z.string().min(1), label: z.string().min(1), definition: z.string().min(1),
      source: z.string().min(1), status: z.enum(['measured', 'unmeasured']),
    }).strict()).length(2).describe('成功指標。フォロワー数・本数は入れない'),
    support: z.array(z.string().min(1)).describe('補助に見る指標（business-direction の id）'),
    notSuccess: z.array(z.string().min(1)).min(1),
    target: z.string().min(1).describe('目標値の扱い。実測前は決めない'),
  }).strict(),
  formats: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/), label: z.string().min(1),
    status: z.enum(['active', 'trial', 'proposed', 'paused', 'rejected']).describe('採否の状態。運営者が決める'),
    role: z.enum(['attract', 'sell']), ctaKinds: z.array(z.enum(['note-magazine', 'coconala-service', 'site-article', 'links-hub'])).min(1),
    types: z.array(z.string().min(1)).optional().describe('X のキャンペーン計画の type の値'),
    publicationFormat: z.enum(['carousel', 'reel']).optional().describe('Instagram の公開行の format'),
    evidence: z.array(repoRef), decision: z.string().optional().describe('判断カード'),
  }).strict()).min(1).superRefine(uniqueBy('id')),
  slots: z.array(channelSlot).min(1).superRefine(uniqueBy('id')),
}).strict().superRefine((c, ctx) => {
  for (const [i, s] of c.slots.entries()) {
    if (s.role === 'attract' && s.salesMax !== 0) ctx.addIssue({ code: 'custom', path: ['slots', i, 'salesMax'], message: 'attract の枠は販売しない' });
    if (s.salesMax > s.count) ctx.addIssue({ code: 'custom', path: ['slots', i, 'salesMax'], message: '販売の上限が本数を超える' });
  }
});

export const ConfigChannelAnnualPlan = z.object({
  schemaVersion: z.literal(3),
  _doc: z.string().min(1),
  updatedAt: jstDate('計画の更新日'),
  cycle: z.object({
    id: z.string().min(1), window: planWindow,
    enforceFrom: jstDate('週の上限を数え始める月曜'),
    reviewAt: jstDate('3 か月後の見直し日'),
    weeklyMax: z.number().int().positive().describe('平常の週の上限（月曜始まり・JST）'),
    peakWeeklyMax: z.number().int().positive().describe('山場の週の上限'),
    peaks: z.array(z.object({ window: planWindow, why: z.string().min(1) }).strict()),
    calendarBasis: z.string().min(1).describe('2027 年度の月をどう置いたか。公式発表前は確定しない'),
  }).strict(),
  metrics: z.object({
    primary: z.array(z.object({
      id: z.enum(['youtubeCampaignClicks', 'averageViewPercentage']), label: z.string().min(1), definition: z.string().min(1),
      source: z.string().min(1), status: z.enum(['measured', 'unmeasured']),
    }).strict()).length(2).describe('成功指標。登録者数・再生数・本数は入れない'),
    support: z.array(z.string().min(1)).describe('補助に見る指標（business-direction の id）'),
    notSuccess: z.array(z.string().min(1)).min(1),
    target: z.string().min(1).describe('目標値の扱い。実測前は決めない'),
  }).strict(),
  cadence: z.string().min(1),
  productionRule: z.string().min(1),
  reviewRule: z.string().min(1),
  channels: z.object({ x: channelPlan, instagram: channelPlan }).strict().describe('YouTube 以外のチャネルの枠と型'),
  slots: z.array(longformSlot).min(1).superRefine(uniqueBy('id')),
  entries: z.array(z.object({
    id: z.string().min(1), exam: z.string().min(1), publicationId: z.string().optional(),
    title: z.string().min(1).optional(), action: z.enum(['finish', 'revise', 'new', 'reuse']),
    slot: z.string().min(1).optional().describe('入る年間の枠。今の期より前に公開した行と再案内は持たない'),
    start: jstDate('制作・改訂の着手日'), ready: jstDate('画像・動画確認完了の目標日'),
    target: jstDate('公開または再案内の目標日（予約の事実ではない）'),
    priority: z.enum(['P1', 'P2', 'P3']),
    note: z.string().min(1),
  }).strict()).min(1).superRefine(uniqueBy('id')),
}).strict().superRefine((v, ctx) => {
  v.entries.forEach((e, i) => {
    if (e.start > e.ready || e.ready >= e.target)
      ctx.addIssue({ code: 'custom', path: ['entries', i], message: '着手 ≤ 確認完了 < 公開目標' });
    if (!e.publicationId && (e.action !== 'new' || !e.title))
      ctx.addIssue({ code: 'custom', path: ['entries', i], message: '既存動画は公開IDが必要。新規企画はタイトルが必要' });
  });
  v.slots.forEach((s, i) => {
    if (s.primaryCta.kind === 'links-hub' ? s.primaryCta.targets.length : !s.primaryCta.targets.length)
      ctx.addIssue({ code: 'custom', path: ['slots', i, 'primaryCta'], message: 'links-hub は宛先なし、それ以外は宛先が必要' });
  });
});
const STOP_REASONS = ['user-decision', 'superseded', 'gone', 'unverified-legacy'];
const idException = z.literal('imported-before-cutover').describe('規則に合わない既存の ID を残す印（件数は config の idExceptionMax でラチェット）');

/** Instagramプロフィール固定投稿の制作原稿。実際の状態は台帳と config.ig-account が持つ。 */
export const InstagramPinnedManifest = z.object({
  schemaVersion: z.literal(1),
  size: z.object({ width: z.literal(1080), height: z.literal(1350) }).strict(),
  posts: z.array(z.object({
    key: z.string().regex(/^[a-z][a-z0-9-]+$/),
    exam: z.string().min(1), work: z.string().regex(/^[a-z][a-z0-9-]+$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    title: z.string().min(1), subtitle: z.string().min(1),
    choices: z.array(z.string().min(1)).min(2).max(3),
    steps: z.array(z.string().min(1)).length(3),
    caption: z.string().min(1).max(2200),
  }).strict()).length(3).superRefine(uniqueBy('key', '固定投稿ID')),
}).strict().meta({ title: 'Instagramプロフィール固定投稿の原稿' });

/** Codex ImageGen編集画像の参照SHA・指示文・正規化後SHA。 */
export const InstagramPinnedPopImage = z.object({
  schemaVersion: z.literal(1), design: z.literal('pop-poster-v3'), model: z.literal('Codex ImageGen'), method: z.literal('edit'),
  reference: z.object({ path: repoPath('編集元画像'), sha256 }).strict(),
  promptFile: repoPath('最終編集指示'), exactText: z.string().min(1),
  source: z.object({ file: z.string().min(1), sha256 }).strict(),
  output: z.object({ path: repoPath('採用PNG'), sha256, width: z.literal(1080), height: z.literal(1350) }).strict(),
  normalization: z.string().min(1),
}).strict().meta({ title: 'Instagram固定投稿POP画像の来歴' });

// ---- 設定（config/content-registry.json） -----------------------------------------------------------

export const ConfigContentRegistry = z
  .object({
    _doc: doc(),
    schemaVersion: z.literal(1),
    channels: z.record(
      z.string().regex(/^[a-z]+$/),
      z.object({ formats: z.array(z.string().regex(/^[a-z]+$/)).min(1), accounts: z.array(z.string()), planned: z.boolean().optional() }).strict(),
    ).describe('チャネル→形式とアカウント'),
    accounts: z.record(
      z.string().regex(/^[a-z]+:[a-z0-9-]+$/),
      z.object({ channel: z.string(), config: z.string().describe('アカウントの正本の台帳 id（ハンドルは写さない）'), note: doc().optional() }).strict(),
    ),
    workKinds: z.array(z.string()).min(1),
    idRules: z
      .object({
        work: z.string(),
        variant: z.string(),
        role: z.string(),
        forbidden: z.array(z.string()).describe('新しい ID に使わない形（日付・NNN-・pack-NN・末尾の連番）'),
        idExceptionMax: z.number().int().min(0).describe('idException を付けた既存 ID の上限（増やさない）'),
      })
      .strict(),
    status: z
      .object({
        values: z.array(z.enum(STATUS)).min(1),
        transitions: z.record(z.enum(STATUS), z.array(z.enum(STATUS))),
        transitionsByChannel: z
          .partialRecord(z.string(), z.partialRecord(z.enum(STATUS), z.array(z.enum(STATUS))))
          .optional()
          .describe('チャネルだけに足す遷移（Instagram・X は QA と承認の段を持たず、下書きから予約・公開する）'),
        approvalRequiredFrom: z.enum(STATUS),
        setBy: z.partialRecord(z.enum(STATUS), z.array(z.string()).min(1)).describe('その状態へ進められる人・仕組み（書いていない状態は作り手・スクリプト）'),
        stopReasons: z.array(z.enum(STOP_REASONS)).min(1),
      })
      .strict(),
    cutover: z.array(z.string()).describe('content/registry が正本になったチャネル（ここに無いチャネルの行は今の台帳の写し）'),
    reconcileGraceDays: z.record(z.string(), z.number().int().min(0)).describe('publishAt を過ぎて公開にならない予約を出すまでの猶予（日）'),
  })
  .strict()
  .meta({ title: 'コンテンツ台帳の設定' });

// ---- 作品（content/registry/works/{exam}.json） --------------------------------------------------------

const Work = z
  .object({
    id: z.string().min(3).describe('作品の ID（全チャネルで一意・utm_campaign と同じ値）'),
    kind: z.string().describe('作品の種類（config の workKinds）'),
    format: z.string().optional().describe('同じ種類の中の型（例: compilation）'),
    definition: repoPath('作品の中身（台本・文面）のフォルダ'),
    qa: z
      .object({ avg: z.number().min(0).max(3), blocks: z.number().int().min(0), at: jstDate('QA の日付'), by: z.string() })
      .strict()
      .optional(),
    theme: z.string().optional().describe('コンテンツのテーマの id'),
    idException: idException.optional(),
    legacyKey: z.string().optional().describe('取り込む前の名前（フォルダ名など）'),
    renamedTo: z.string().optional().describe('改名した先の作品 ID（この行は残す）'),
  })
  .strict();

export const RegistryWorks = z
  .object({
    schemaVersion: z.literal(1),
    exam: z.string().describe('資格（qualification-registry.json の id か group id）'),
    works: z.array(Work).superRefine(uniqueBy('id', '作品 ID')),
  })
  .strict()
  .meta({ title: 'コンテンツ台帳: 作品' });

// ---- 公開（content/registry/publications/{channel}/{exam}.json） ---------------------------------------

const Approval = z
  .object({
    by: z.enum(['user', 'policy']).describe('運営者か、関門を通った通常動画の方針'),
    at: utcTime('承認した時刻').optional().describe('承認した時刻（ハッシュの無い承認では記録の無いことがある）'),
    contentSha256: sha256.nullable().describe('承認した中身のハッシュ（approvalHash）。ハッシュの無い承認は null'),
    grandfathered: z.boolean().optional().describe('ハッシュの無い承認（今の動画の台帳の approvedBy を写したもの）'),
    scope: z.string().optional().describe('一括承認の範囲（例: campaign:<id>）'),
  })
  .strict()
  .refine((a) => a.at || a.grandfathered, { message: 'ハッシュつきの承認には at が要る' });

const Platform = z
  .object({
    id: z.string().min(1).optional().describe('外部 ID（videoId・投稿 ID・tweet ID）'),
    privacy: z.enum(['public', 'private', 'unlisted', 'scheduled', 'gone']).optional(),
    url: z.string().url().optional(),
    kind: z.string().optional().describe('外部 ID の種類（例: business-suite）'),
    publishedAt: utcTime('公開を確認した時刻').optional(),
    relatedVideoId: z.string().min(1).nullable().optional().describe('YouTube 上で今つながっている関連動画（Shorts → 通常動画）。null は未設定を確かめたもの'),
    desiredRelatedVideoId: z.string().min(1).optional().describe('つなぎたい関連動画の videoId'),
    evidence: z.object({ kind: z.string(), ref: z.string() }).strict().optional().describe('公開・予約を確かめた証拠'),
  })
  .strict();

const Publication = z
  .object({
    id: z.string().min(3).describe('{exam}/{work}/{channel}.{format}[.{variant}]'),
    work: z.string(),
    account: z.string(),
    format: z.string(),
    variant: z.string().optional(),
    definition: repoPath('この投稿だけの中身のフォルダ（IG のリールなど）').optional(),
    copy: z.string().optional().describe('文面の場所（file#key）'),
    status: z.enum(STATUS),
    publishAt: offsetTime('公開の予定').optional(),
    approval: Approval.optional(),
    review: z
      .object({ visual: z.object({ status: z.enum(['pending', 'approved']), by: z.enum(['user', 'policy']).optional(), at: utcTime('確認した時刻').optional(), digest: sha256.optional() }).strict() })
      .strict()
      .optional()
      .describe('画面確認（音声なし）の承認'),
    platform: Platform.nullable().optional(),
    media: z.record(z.string(), z.string()).optional().describe('役割 → 素材 ID'),
    relatedTo: z.string().optional().describe('関連動画（Shorts → 通常動画）の公開 ID'),
    revisionOf: z.string().optional().describe('改訂元の公開 ID（旧行・旧外部 ID は保持する）'),
    delivery: z.object({
      inputSha256: sha256, marker: z.string().min(1),
      uploadRequestedAt: utcTime('アップロード開始前の記録'), videoId: z.string().regex(/^[\w-]{11}$/).optional(),
      processedAt: utcTime('処理完了を確認した時刻').optional(),
      thumbnailRequestedAt: utcTime('表紙設定開始前の記録').optional(),
      thumbnailAcceptedAt: utcTime('表紙設定API応答の確認時刻').optional(), thumbnailUrls: z.array(z.string().url()).optional(),
      scheduleRequestedAt: utcTime('予約開始前の記録').optional(), scheduleAt: offsetTime('要求した予約日時').optional(),
      scheduledVerifiedAt: utcTime('予約を実査した時刻').optional(),
    }).strict().optional().describe('YouTube投稿の実行記録。intentだけ残る操作は重複実行しない'),
    campaigns: z.array(z.string()).optional(),
    sync: z.object({ syncedSha256: sha256, at: utcTime('同期した時刻') }).strict().optional().describe('外部へ最後に同期した中身'),
    times: z
      .object({
        rendered: utcTime('描いた時刻').optional(),
        uploaded: utcTime('非公開で上げた時刻').optional(),
        scheduled: utcTime('予約した時刻').optional(),
        metadataSynced: utcTime('題名・概要欄・開示の欄を同期した時刻').optional(),
      })
      .strict()
      .optional()
      .describe('作業の時刻（今の動画の台帳の renderedAt・uploadedAt・scheduledAt・metadataSyncedAt）'),
    disclosure: z
      .object({ production: z.string().min(1).optional(), syntheticMedia: z.boolean().optional() })
      .strict()
      .optional()
      .describe('制作の開示（productionDisclosure・containsSyntheticMedia）'),
    thumbnail: z
      .object({
        status: z.enum(['pending', 'set']).optional(),
        setAt: utcTime('サムネイルを設定した時刻').optional(),
        update: z
          .object({
            verifiedAt: offsetTime('Studio で確かめた時刻'),
            method: z.string(),
            designPath: z.string(),
            coverKey: z.string(),
            uploadedSha256: sha256,
            saveConfirmed: z.boolean(),
            visualVerifiedIn: z.string(),
            publicFeedVerified: z.boolean(),
            metadataUnchanged: z.boolean(),
            videoFileChanged: z.boolean(),
            privacyBefore: z.string(),
            privacyAfter: z.string(),
            relatedVideoIdUnchanged: z.string().optional(),
          })
          .strict()
          .optional()
          .describe('公開後にサムネイルを差し替えた記録'),
      })
      .strict()
      .optional(),
    stopReason: z.enum(STOP_REASONS).optional(),
    error: z.string().optional(),
    reason: z.string().optional(),
    legacyKey: z.string().optional().describe('取り込む前の鍵（旧台帳の key）'),
    planSlot: z.string().min(1).optional().describe('Instagram の公開が入る年間の枠（config.channel-annual-plan）'),
    idException: idException.optional(),
    renamedTo: z.string().optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.status === 'stopped' && !p.stopReason) ctx.addIssue({ code: 'custom', path: ['stopReason'], message: 'stopped には stopReason が要る' });
    if (p.status === 'published' && !p.platform?.id) ctx.addIssue({ code: 'custom', path: ['platform', 'id'], message: 'published には外部 ID が要る' });
    if (p.status === 'scheduled' && !p.publishAt) ctx.addIssue({ code: 'custom', path: ['publishAt'], message: 'scheduled には publishAt が要る' });
    const d = p.delivery;
    if (d) {
      const issue = (key, message) => ctx.addIssue({ code: 'custom', path: ['delivery', key], message });
      if (!p.account.startsWith('youtube:')) issue('inputSha256', 'delivery は YouTube 公開行専用');
      if (p.variant && !p.revisionOf) issue('inputSha256', 'variantの実行記録には改訂元が必要');
      if (p.platform?.id && p.platform.id !== d.videoId) issue('videoId', 'platform.id と実行記録の動画 ID が不一致');
      if ((d.processedAt || d.thumbnailRequestedAt || d.scheduleRequestedAt) && !d.videoId) issue('videoId', '処理・表紙・予約には動画 ID が必要');
      if (d.thumbnailAcceptedAt && (!d.thumbnailRequestedAt || !d.thumbnailUrls?.length)) issue('thumbnailAcceptedAt', '表紙の開始記録と応答 URL が必要');
      if (Boolean(d.scheduleRequestedAt) !== Boolean(d.scheduleAt)) issue('scheduleAt', '予約開始記録と要求日時は対で必要');
      if (d.scheduleAt && Date.parse(d.scheduleAt) !== Date.parse(p.publishAt)) issue('scheduleAt', '実行開始後に予定日時を変えない');
      if (d.scheduledVerifiedAt && (!d.scheduleRequestedAt || !d.thumbnailAcceptedAt || !d.processedAt)) issue('scheduledVerifiedAt', '処理・表紙・予約開始の記録が必要');
    }
  });

export const RegistryPublications = z
  .object({
    schemaVersion: z.literal(1),
    channel: z.string(),
    exam: z.string(),
    publications: z.array(Publication).superRefine(uniqueBy('id', '公開 ID')),
  })
  .strict()
  .meta({ title: 'コンテンツ台帳: 公開' });

// ---- 素材（content/registry/media/{exam}.json・brand.json） ---------------------------------------------

const Provenance = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('render'), by: z.string().describe('描いたスクリプト'), spec: z.string().optional(), specSha256: sha256.optional(), renderInputSha256: sha256.optional(), tts: z.object({ engine: z.string(), speaker: z.number().int(), credit: z.string() }).strict().optional() }).strict(),
  z.object({ kind: z.literal('template'), by: z.string(), spec: z.string().optional(), specSha256: sha256.optional() }).strict(),
  z.object({ kind: z.literal('ai-generated'), tool: z.string(), model: z.string().optional(), prompt: z.string().min(1), promptSha256: sha256, generatedAt: utcTime('生成した時刻') }).strict(),
  z.object({ kind: z.literal('photo'), source: z.string() }).strict(),
]);

const Media = z
  .object({
    id: z.string().min(3).describe('{pubId}/{role}・{exam}/{work}/work/{role}・brand/{name}'),
    role: z.string(),
    type: z.string().regex(/^[a-z]+\/[a-z0-9.+-]+$/, 'MIME type'),
    sha256,
    bytes: z.number().int().positive().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    durationSec: z.number().positive().optional(),
    store: z.object({ tier: z.enum(['drive', 'r2-private', 'r2-public', 'repo']), path: z.string().min(1) }).strict().describe('正本の置き場（drive は .tmp/media/… の手元パス＝Drive 台帳の鍵）'),
    copies: z.array(z.object({ tier: z.enum(['drive', 'r2-private', 'r2-public']), key: z.string().min(1) }).strict()).optional().describe('転送用などの写し'),
    provenance: Provenance,
    review: z.object({ adoptedBy: z.literal('user').optional(), at: z.string().optional() }).strict().optional(),
    legacyPaths: z.array(z.string()).optional().describe('移す前のパス（日付フォルダ・連番名）'),
  })
  .strict();

export const RegistryMedia = z
  .object({
    schemaVersion: z.literal(1),
    scope: z.string().describe('資格の id か brand'),
    media: z.array(Media).superRefine(uniqueBy('id', '素材 ID')),
  })
  .strict()
  .meta({ title: 'コンテンツ台帳: 素材' });
