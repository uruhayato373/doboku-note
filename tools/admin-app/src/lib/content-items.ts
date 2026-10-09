import { loadRegistry } from '../../../../scripts/lib/content-registry.mjs';
import { loadDriveManifest } from '../../../../scripts/lib/drive-vault.mjs';
import { jstLabel } from '../../../../scripts/lib/jst-date.mjs';
import { listView, readMediaText, workView } from '../../../../scripts/lib/media-review.mjs';
import { examLabel } from './video-board';
import { findRepoRoot } from './repo-root';

/**
 * content-items.ts — `/content/items`（作品と公開の確認画面・read-only）の表示モデル。
 * 判定（素材が手元か Drive か・承認が今の中身と合うか・次のコマンド）は scripts/lib/media-review.mjs が決める。
 * ここは driveManifest を渡して呼ぶのと、preview-metrics の JSON・字幕の中身を画面用に整えるだけ。
 */

export type Availability = 'local' | 'vault' | 'missing';

export interface ItemRow {
  id: string;
  exam: string;
  kind: string;
  format: string | null;
  title: string;
  href: string;
  coverSrc: string | null;
  channels: string[];
  byChannel: Record<string, Record<string, number>>;
  flags: string[];
  statusOrder: number;
}

export interface ItemMedia {
  role: string;
  id: string;
  type?: string;
  sha256?: string;
  bytes: number | null;
  width: number | null;
  height: number | null;
  durationSec: number | null;
  provenance?: { kind?: string; by?: string; spec?: string; specSha256?: string };
  availability: Availability;
  src: string | null;
  missingRow?: boolean;
}

export interface ItemApproval {
  visual: { status: string; at: string | null; digest: string | null; current: string | null; valid: boolean; reason: string | null };
  final: { by: string | null; at: string | null; contentSha256: string | null; grandfathered: boolean; current: string | null; valid: boolean; reason: string | null };
}

export interface ItemPublication {
  id: string;
  channel: string;
  format: string;
  variant: string | null;
  account: string;
  status: string;
  stopReason: string | null;
  publishAt: string | null;
  publishAtJst: string | null;
  platform: { id?: string; url?: string; privacy?: string } | null;
  copy: { title?: string; description?: string; tags?: string[]; caption?: string; text?: string } | null;
  media: ItemMedia[];
  approval: ItemApproval;
  commands: { label: string; cmd: string }[];
  flags: string[];
}

export interface ItemWork {
  work: { id: string; exam: string; kind: string; format: string | null; definition: string; qa: { avg?: number; blocks?: number; at?: string; by?: string } | null };
  title: string;
  channels: { channel: string; publications: ItemPublication[] }[];
}

export interface SubtitleLine { start: string; end: string; text: string }
export interface MetricRow { key: string; value: string }
export interface MediaDetail {
  metrics?: { rows: MetricRow[]; notes: string[] };
  subtitles?: { total: number; lines: SubtitleLine[] };
  textMissing?: boolean;
}

export const FLAG_ORDER = ['要確認', '要復元', '要同期', '承認待ち'] as const;
export { examLabel };

const driveManifest = () => {
  try {
    return loadDriveManifest();
  } catch {
    return null;
  }
};

export function loadItemList(): { rows: ItemRow[]; counts: { works: number; publications: number } } {
  return listView(findRepoRoot(), { driveManifest: driveManifest() });
}

export function loadItemWork(exam: string, workId: string): ItemWork | null {
  return workView(findRepoRoot(), exam, workId, { driveManifest: driveManifest() });
}

const scalar = (v: unknown): string | null =>
  v == null ? null : typeof v === 'number' || typeof v === 'boolean' ? String(v) : typeof v === 'string' ? v : null;

/** preview-metrics の JSON → 数値の表と注意の一覧（形が決まっていないので、スカラーは 2 階層まで平らにし、warn/note/注意を含む配列は注意へ） */
function parseMetrics(text: string): { rows: MetricRow[]; notes: string[] } {
  const rows: MetricRow[] = [];
  const notes: string[] = [];
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { rows, notes: ['preview-metrics が JSON として読めない'] };
  }
  const isNoteKey = (k: string) => /warn|note|caution|issue|注意/i.test(k);
  const walk = (v: unknown, prefix: string, depth: number) => {
    if (v == null || typeof v !== 'object') return;
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(val)) {
        if (isNoteKey(k)) for (const x of val) notes.push(typeof x === 'string' ? x : JSON.stringify(x));
        else if (val.every((x) => scalar(x) != null)) rows.push({ key, value: val.map(String).join(', ') });
        continue;
      }
      const s = scalar(val);
      if (s != null) {
        if (isNoteKey(k) && typeof val === 'string') notes.push(val);
        else rows.push({ key, value: s });
      } else if (depth < 2) walk(val, key, depth + 1);
    }
  };
  walk(doc, '', 0);
  return { rows, notes };
}

/** .ass の Dialogue 行 → 開始・終了・本文（装飾タグ {..} は除き、\N は改行を空白に） */
function parseAss(text: string): { total: number; lines: SubtitleLine[] } {
  const all: SubtitleLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.startsWith('Dialogue:')) continue;
    const f = raw.slice('Dialogue:'.length).split(',');
    if (f.length < 10) continue;
    all.push({
      start: f[1].trim(),
      end: f[2].trim(),
      text: f.slice(9).join(',').replace(/\{[^}]*\}/g, '').replace(/\\N/gi, ' ').trim(),
    });
  }
  return { total: all.length, lines: all.slice(0, 50) };
}

/** 作品の公開ごとの preview-metrics と字幕の中身（公開 id → 中身）。素材が手元にも Drive のマウントにも無ければ textMissing */
export async function loadMediaDetails(w: ItemWork): Promise<Record<string, MediaDetail>> {
  const root = findRepoRoot();
  const byId = new Map((loadRegistry(root).media as { id: string }[]).map((m) => [m.id, m]));
  const out: Record<string, MediaDetail> = {};
  for (const c of w.channels) {
    for (const p of c.publications) {
      const d: MediaDetail = {};
      for (const m of p.media) {
        if (m.role !== 'preview-metrics' && m.role !== 'subtitles') continue;
        const row = byId.get(m.id);
        const text = row ? await readMediaText(root, row) : null;
        if (text == null) {
          d.textMissing = true;
          continue;
        }
        if (m.role === 'preview-metrics') d.metrics = parseMetrics(text);
        else d.subtitles = parseAss(text);
      }
      out[p.id] = d;
    }
  }
  return out;
}

/** 台帳の UTC の日時（ISO 8601）を画面用の JST「YYYY-MM-DD HH:MM」にする（scripts/lib/jst-date.mjs の jstLabel）。 */
export const fmtJstAt = (value: string | null | undefined): string => jstLabel(value);
