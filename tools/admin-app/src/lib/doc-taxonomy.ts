import type { AdminChannelId } from './channel-registry';

/**
 * doc-taxonomy.ts — `docs/` 文書の目的・対象チャネル・保持区分の 3 軸分類（DN-0103 Phase 02）。
 *
 * Node API / fs を import しない純粋モジュール。`docs/` の物理ディレクトリを唯一の分類にせず、
 * frontmatter を SSOT として持たせつつ、frontmatter が無い文書はディレクトリ既定値で推論する。
 *
 * 82 文書へ一括で必須 frontmatter を追加すると差分が大きくなるため、既定推論を先に置き、
 * override が必要な文書（Brain 関連等）だけに明示 frontmatter を足す。
 */

export type DocumentType =
  | 'strategy'
  | 'product-spec'
  | 'policy'
  | 'runbook'
  | 'research'
  | 'review'
  | 'handoff'
  | 'index';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'strategy',
  'product-spec',
  'policy',
  'runbook',
  'research',
  'review',
  'handoff',
  'index',
];

/** docs の channel は AdminChannelId（channel-registry.ts）に 'cross'（全チャネル横断）を足したもの。 */
export type DocChannel = AdminChannelId | 'cross';

export const DOC_CHANNELS: readonly DocChannel[] = [
  'cross',
  'site',
  'note',
  'x',
  'instagram',
  'youtube',
  'coconala',
  'kindle',
  'brain',
];

export type DocRetention = 'durable' | 'temporary';

export const DOC_RETENTIONS: readonly DocRetention[] = ['durable', 'temporary'];

/** 日々変わる status・担当・進捗は docs へ追加しない（frontmatter で保持しない）。 */
interface DirDefault {
  documentType: DocumentType;
  retention: DocRetention;
}

const DEFAULTS_BY_SECTION: Readonly<Record<string, DirDefault>> = {
  root: { documentType: 'index', retention: 'durable' },
  strategy: { documentType: 'strategy', retention: 'durable' },
  products: { documentType: 'product-spec', retention: 'durable' },
  editorial: { documentType: 'policy', retention: 'durable' },
  design: { documentType: 'policy', retention: 'durable' },
  operations: { documentType: 'runbook', retention: 'durable' },
  marketing: { documentType: 'strategy', retention: 'durable' },
  reviews: { documentType: 'review', retention: 'temporary' },
  handoffs: { documentType: 'handoff', retention: 'temporary' },
};

/** section（project.ts の sectionOf() が返す先頭ディレクトリ名。無ければ 'root'）から既定値を引く。 */
export function inferDefaults(section: string): { documentType: DocumentType; retention: DocRetention; channel: DocChannel[] } {
  const base = DEFAULTS_BY_SECTION[section] ?? { documentType: 'policy' as DocumentType, retention: 'durable' as DocRetention };
  return { documentType: base.documentType, retention: base.retention, channel: ['cross'] };
}

export interface DocTaxonomy {
  documentType: DocumentType;
  channel: DocChannel[];
  retention: DocRetention;
  /** frontmatter に許可値外の値があったフィールド名。開発時に検出できるよう握りつぶさない。 */
  invalidFields: readonly string[];
}

const isDocumentType = (v: string): v is DocumentType => (DOCUMENT_TYPES as readonly string[]).includes(v);
const isDocChannel = (v: string): v is DocChannel => (DOC_CHANNELS as readonly string[]).includes(v);
const isDocRetention = (v: string): v is DocRetention => (DOC_RETENTIONS as readonly string[]).includes(v);

/**
 * frontmatter とディレクトリ既定値から 3 軸分類を決定する。
 *
 * 不正な値は 'unknown' へ握りつぶさず、既定値へフォールバックしつつ `invalidFields` へ記録する
 * （読み手・テストが「検査ゼロ」と「異常ゼロ」を区別できるようにする。CLAUDE.md §9 準拠）。
 */
export function classifyDocument(section: string, frontmatter: Readonly<Record<string, unknown>>): DocTaxonomy {
  const defaults = inferDefaults(section);
  const invalidFields: string[] = [];

  let documentType = defaults.documentType;
  if (frontmatter.documentType !== undefined) {
    const raw = String(frontmatter.documentType);
    if (isDocumentType(raw)) documentType = raw;
    else invalidFields.push('documentType');
  }

  let retention = defaults.retention;
  if (frontmatter.retention !== undefined) {
    const raw = String(frontmatter.retention);
    if (isDocRetention(raw)) retention = raw;
    else invalidFields.push('retention');
  }

  let channel = defaults.channel;
  if (frontmatter.channel !== undefined) {
    const rawList = Array.isArray(frontmatter.channel) ? frontmatter.channel : [frontmatter.channel];
    const values = rawList.map((v) => String(v));
    const valid = values.filter(isDocChannel);
    if (valid.length !== values.length) invalidFields.push('channel');
    if (valid.length > 0) channel = valid;
  }

  return { documentType, channel, retention, invalidFields };
}

export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = {
  strategy: '戦略',
  'product-spec': '商品仕様',
  policy: '規則',
  runbook: '運用手順',
  research: '調査',
  review: 'レビュー',
  handoff: '引き継ぎ',
  index: '索引',
};

export const DOC_CHANNEL_LABELS: Readonly<Record<DocChannel, string>> = {
  cross: '横断',
  site: 'サイト',
  note: 'note',
  x: 'X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  coconala: 'ココナラ',
  kindle: 'Kindle',
  brain: 'Brain',
};

export const DOC_RETENTION_LABELS: Readonly<Record<DocRetention, string>> = {
  durable: '恒久',
  temporary: '一時記録',
};
