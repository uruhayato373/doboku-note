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
const STOP_REASONS = ['user-decision', 'superseded', 'gone', 'unverified-legacy'];
const idException = z.literal('imported-before-cutover').describe('規則に合わない既存の ID を残す印（件数は config の idExceptionMax でラチェット）');

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
    by: z.literal('user').describe('承認できるのは運営者だけ'),
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
      .object({ visual: z.object({ status: z.enum(['pending', 'approved']), by: z.literal('user').optional(), at: utcTime('確認した時刻').optional(), digest: sha256.optional() }).strict() })
      .strict()
      .optional()
      .describe('画面確認（音声なし）の承認'),
    platform: Platform.nullable().optional(),
    media: z.record(z.string(), z.string()).optional().describe('役割 → 素材 ID'),
    relatedTo: z.string().optional().describe('関連動画（Shorts → 通常動画）の公開 ID'),
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
    idException: idException.optional(),
    renamedTo: z.string().optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.status === 'stopped' && !p.stopReason) ctx.addIssue({ code: 'custom', path: ['stopReason'], message: 'stopped には stopReason が要る' });
    if (p.status === 'published' && !p.platform?.id) ctx.addIssue({ code: 'custom', path: ['platform', 'id'], message: 'published には外部 ID が要る' });
    if (p.status === 'scheduled' && !p.publishAt) ctx.addIssue({ code: 'custom', path: ['publishAt'], message: 'scheduled には publishAt が要る' });
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
  z.object({ kind: z.literal('render'), by: z.string().describe('描いたスクリプト'), spec: z.string().optional(), specSha256: sha256.optional(), tts: z.object({ engine: z.string(), speaker: z.number().int(), credit: z.string() }).strict().optional() }).strict(),
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
