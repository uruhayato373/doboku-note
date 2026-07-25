/**
 * exam-palette.mjs — 試験パレット解決（多資格SNS展開の試験識別レイヤー用）
 *
 * 真実源: .claude/knowledge/design-system/note-cover-tokens.json の `exams`。
 * note カバー・IG・X・Shorts が同一 token を解決し、試験＝色相 をチャネル横断で統一する。
 * 設計: docs/project/03_SNS/03_多資格SNS展開設計.md ／ .claude/knowledge/reference/sns-image-policy.md §12
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const TOKENS = JSON.parse(readFileSync(join(ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'), 'utf8'));

/** slug / 日本語dir のどちらでも試験エントリを引く */
export function resolveExam(key) {
  const exams = TOKENS.exams;
  if (exams[key] && typeof exams[key] === 'object') return { slug: key, ...exams[key] };
  for (const [slug, v] of Object.entries(exams)) {
    if (slug === 'comment' || typeof v !== 'object') continue;
    if (v.dir === key || v.label === key || v.short === key) return { slug, ...v };
  }
  throw new Error(`exam-palette: 未知の試験キー "${key}"（slug/dir/label/short のいずれか）。tokens.exams を確認`);
}

/** 試験色（base/deep/soft）を解決。tone は paid=deep / free=base 既定 */
export function examColor(key, tone = 'base') {
  const e = resolveExam(key);
  return { base: e.base, deep: e.deep, soft: e.soft, accent: e.accent, use: e[tone] || e.base };
}

/**
 * カバー帯に出す正式名称の行分割。
 * 長い「技術士（総合技術監理部門）」は2行（資格冠＋部門）、他は1行。
 * 返り値: [{ text, size }] （size は base 値。テンプレ側で auto-fit 微調整可）
 */
export function officialNameLines(key) {
  const e = resolveExam(key);
  const label = e.label;
  if (e.slug === 'pe-comprehensive') {
    // 1行表記（全試験1行で統一・帯内すっきり）。括弧を外しスペース区切り。
    return [ { text: '技術士 総合技術監理部門', size: 72 } ];
  }
  // 1行。文字数で size を auto-fit（usable≈960px）
  const n = [...label].length;
  const size = Math.min(84, Math.floor(900 / Math.max(n, 1)));
  return [ { text: label, size } ];
}

export const EXAM_KEYS = Object.keys(TOKENS.exams).filter((k) => k !== 'comment');
