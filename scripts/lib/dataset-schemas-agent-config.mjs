/**
 * dataset-schemas-agent-config.mjs — .claude/config/ の JSON（エージェント運用と品質ゲートの基準・許可リスト・
 * CI の書き込みと認証の許可リスト）の型（DN-0524・案B）。
 *
 * .claude/config/ は台帳（datasets.mjs）の外に置いたまま、ここでファイル名と型を対応させる。
 * 検査は scripts/check-agent-config.mjs（型の無い JSON も止める）。人が書く設定なので .strict() で誤記の欄を止め、
 * ファイル間の整合（スクリプトの実在・サービス名の対応）は既存の check-*（check-playwright-auth-wiring など）に残す。
 * 書き方の約束は .claude/knowledge/reference/data-storage-decision.md「型の正本は zod」。
 */
import { z } from 'zod';

const text = z.string().min(1);
const note = (what) => text.describe(what);
const day = z.iso.date();
const intCount = z.number().int().min(0);
const strList = z.array(text);
const relPath = z.string().regex(/^[^/\\][^\\]*$/, 'リポジトリ相対のパス（/ 区切り）');

const AdminUiDebtBaseline = z
  .object({
    _comment: note('説明'),
    _updatedAt: day,
    totals: z.object({ rawCard: intCount, inlineStyle: intCount, rawTable: intCount, rawBadge: intCount }).strict(),
    files: z.record(relPath, z.record(text, intCount)),
  })
  .strict();

const BacklogVocabBaseline = z
  .object({ _doc: note('説明'), _updatedAt: day, _source: text, categories: z.record(text, intCount) })
  .strict();

const CemEssayStructure = z
  .object({ _doc: note('説明'), _rule: text, pastExamOnlyPersonas: z.record(text, text) })
  .strict();

const CemTextbookMapping = z
  .object({
    _comment: note('説明'),
    _updated: day,
    _source: text,
    mappings: z.record(text, z.object({ file: relPath, anchor: text, mapping_table_lines: text }).strict()),
    _other_chapters_status: z.record(text, text),
  })
  .strict();

const CiWriteOperations = z
  .object({
    version: z.literal(1),
    _doc: note('説明'),
    operations: z.record(
      text,
      z
        .object({
          service: text,
          script: relPath,
          risk: z.enum(['low', 'medium', 'high', 'highest']),
          argsSchema: z.record(text, text).describe('引数名 → 受け付ける値の説明'),
          inputs: strList,
          commitArgs: strList,
          verify: strList,
          ledger: z.array(text),
        })
        .strict(),
    ),
  })
  .strict();

const ContentTaxonomyBaseline = z
  .object({
    version: z.literal(1),
    _doc: note('説明'),
    _updatedAt: day,
    unknownTags: z.array(z.unknown()),
    aliasUsage: z.record(text, z.unknown()),
    structuralMismatch: z.array(z.unknown()),
    // テーマへの所属が要るのにどのテーマにも属さない記事（slug 集合・content-taxonomy.md §6-2）
    topicless: z.array(z.string()),
    // 記事型・フラグのタグしか持たない記事（slug 集合・content-taxonomy.md §5-3）
    subjectless: z.array(z.string()),
  })
  .strict();

const GateParityBaseline = z.object({ _doc: note('説明'), _updatedAt: day, orphans: z.record(text, text) }).strict();

const InformationArchitecture = z
  .object({
    _doc: note('説明'),
    forbiddenRoots: z.object({ _doc: text, paths: strList }).strict(),
    docsIsNotContent: z.object({ _doc: text, denyBasenames: strList, denyExtensions: strList, allowDirs: strList }).strict(),
    contentIsNotFlow: z.object({ _doc: text, denyBasenames: strList, denyPatterns: strList }).strict(),
    dualSsot: z.object({ _doc: text, pairs: z.array(z.unknown()) }).strict(),
    allowlist: z.object({ _doc: text, entries: z.array(z.unknown()) }).strict(),
    stalePathLiterals: z.object({ _doc: text, paths: strList, scanGlobs: strList, allowFiles: strList }).strict(),
  })
  .strict();

const MagazineCtaBaseline = z
  .object({
    _comment: note('説明'),
    _updatedAt: day,
    _note: text,
    zeroSurface: z.record(text, text),
    zeroPage: z.record(text, text),
    _zeroPageNote: text,
  })
  .strict();

const noteAllowEntry = z.object({ noteId: z.string().regex(/^n[0-9a-f]{12}$/, 'note の記事 id'), title: text, reason: text }).strict();
const NoteAttachmentsAllow = z.object({ _doc: note('説明'), _added: day, entries: z.array(noteAllowEntry) }).strict();
const NoteIntroBenefitAllow = z
  .object({ _doc: note('説明'), _added: day, _caution: text, entries: z.array(noteAllowEntry) })
  .strict();
const NoteLiveTagsAllow = z.object({ _doc: note('説明'), _history: text, allow: z.record(text, z.unknown()) }).strict();
const NotePublicView = z
  .object({ _doc: note('説明'), intentional: z.record(relPath, text), pending: z.record(relPath, text) })
  .strict();
const NoteStructureAllow = z.object({ _doc: note('説明'), waived: z.array(z.unknown()) }).strict();

const PlaywrightAuthProfiles = z
  .object({
    _comment: note('説明'),
    version: z.literal(2).describe('2 = 全サービスに ci ブロック必須（playwright-auth-profile.mjs が版で判定）'),
    services: z.record(
      text,
      z
        .object({
          profileDirName: text,
          stateFileName: text,
          loginUrl: z.url(),
          checkUrl: z.url(),
          accountConfigPath: relPath.nullable(),
          sessionMode: z.enum(['profile', 'profile-plus-state', 'same-process']),
          interactiveLoginRequired: z.boolean(),
          notes: text,
          ci: z
            .object({
              mode: z.enum(['encrypted-state']),
              enabled: z.boolean(),
              canary: z.boolean(),
              operations: z.array(z.enum(['read', 'write'])),
              cron: text,
              stateDomains: strList,
              readOnlyScripts: z.array(relPath),
              writeScripts: z.array(relPath),
              skipScheduleIfFresh: z
                .object({ marker: relPath, field: text, hours: z.number().int().positive() })
                .strict()
                .optional()
                .describe('印のファイルの時刻がこの時間以内なら定期実行を飛ばす'),
            })
            .strict(),
          credential: z
            .object({
              label: text,
              storeItem: text,
              sharedStoreItem: text.optional(),
              autoLogin: z.boolean(),
              ciCredential: z.boolean(),
              ciStored: z.boolean(),
              machines: z.array(z.enum(['windows', 'mac'])),
              policyNote: text,
            })
            .strict(),
        })
        .strict(),
    ),
    ciAuthState: z.object({ _doc: text, ageRecipient: text, bucket: text, keyPrefix: text, identityEnv: text }).strict(),
    credentialPolicy: z
      .object({
        _comment: text,
        register: z.object({ mac: text, windows: text, ci: text }).strict(),
        refreshTask: z.object({ mac: text, windows: text }).strict(),
      })
      .strict(),
  })
  .strict();

const PolicyAnchors = z
  .object({
    _note: note('説明'),
    policies: z.record(text, z.object({ decision: text, anchor: relPath, files: z.array(relPath).min(1) }).strict()),
  })
  .strict();

const QualificationSsotAllow = z
  .object({ _doc: note('説明'), allow: z.array(z.object({ file: relPath, path: text, reason: text }).strict()) })
  .strict();

const ReferenceSourcesBaseline = z
  .object({
    version: z.literal(1),
    description: text,
    missingSources: z.array(z.unknown()),
    figureReuseDebt: z.array(z.unknown()),
    legacyVisualOcrTranscripts: z.record(z.string(), z.string().regex(/^[0-9a-f]{64}$/)),
    _updatedAt: day,
  })
  .strict();

const reviewCadence = z
  .object({
    label: text,
    skill: text,
    report: z.object({ dir: relPath, pattern: text }).strict(),
    outputs: strList,
    inputs: z.array(z.object({ command: text, label: text, stage: text, role: z.enum(['判断', '点検']) }).strict()),
    procedure: z.array(
      z
        .object({
          label: text,
          does: text,
          evidence: z.enum(['checks', 'reportFile', 'reviewRecord', 'routing', 'sections', 'triage', 'weeklyPlan']),
          sections: strList.optional(),
        })
        .strict(),
    ),
    checks: z.array(z.object({ command: text, label: text }).strict()),
    handoffSection: text.optional(),
  })
  .strict();
const ReviewWiring = z
  .object({
    version: z.literal(1),
    _doc: note('説明'),
    _note: text,
    stages: strList,
    cadences: z.object({ weekly: reviewCadence, monthly: reviewCadence }).strict(),
  })
  .strict()
  .superRefine((r, ctx) => {
    for (const [cad, c] of Object.entries(r.cadences)) {
      c.inputs.forEach((i, n) => {
        if (!r.stages.includes(i.stage)) ctx.addIssue({ code: 'custom', path: ['cadences', cad, 'inputs', n, 'stage'], message: `stages に無い段階: ${i.stage}` });
      });
    }
  });

const ShadcnParityAllow = z
  .object({
    _comment: note('説明'),
    components: z.record(text, z.record(text, z.object({ extra: strList.optional(), missing: strList.optional(), reason: text }).strict())),
  })
  .strict();

const StatePathLiteralBaseline = z
  .object({ _doc: note('説明'), files: z.record(relPath, z.number().int().positive()) })
  .strict();

/** スクリプトの共通部品の写しと readJson の写しの基準値（DN-0802・scripts/lib/code-ratchets.mjs） */
const CodeRatchetBaseline = z
  .object({ _doc: note('説明'), scriptHelpers: z.record(z.string(), z.number().int().min(0)), readJson: z.number().int().min(0) })
  .strict();

/** .claude/config/ のファイル名 → 型。ここに無い JSON は check-agent-config が止める */
export const AGENT_CONFIG_SCHEMAS = {
  'admin-ui-debt-baseline.json': AdminUiDebtBaseline,
  'backlog-vocab-baseline.json': BacklogVocabBaseline,
  'cem-essay-structure.json': CemEssayStructure,
  'cem-textbook-mapping.json': CemTextbookMapping,
  'code-ratchet-baseline.json': CodeRatchetBaseline,
  'ci-write-operations.json': CiWriteOperations,
  'content-taxonomy-baseline.json': ContentTaxonomyBaseline,
  'gate-parity-baseline.json': GateParityBaseline,
  'information-architecture.json': InformationArchitecture,
  'magazine-cta-baseline.json': MagazineCtaBaseline,
  'note-attachments-allow.json': NoteAttachmentsAllow,
  'note-intro-benefit-allow.json': NoteIntroBenefitAllow,
  'note-live-tags-allow.json': NoteLiveTagsAllow,
  'note-public-view.json': NotePublicView,
  'note-structure-allow.json': NoteStructureAllow,
  'playwright-auth-profiles.json': PlaywrightAuthProfiles,
  'policy-anchors.json': PolicyAnchors,
  'qualification-ssot-allow.json': QualificationSsotAllow,
  'reference-sources-baseline.json': ReferenceSourcesBaseline,
  'review-wiring.json': ReviewWiring,
  'shadcn-parity-allow.json': ShadcnParityAllow,
  'state-path-literal-baseline.json': StatePathLiteralBaseline,
};
