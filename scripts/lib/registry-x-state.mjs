/**
 * registry-x-state.mjs — X の下書きフォルダ（content/sns/x/draft/**）の名前から、コンテンツ台帳の作品 ID と資格を決める
 * （DN-0612・content-registry.md「X」）。書き込みはしない。取り込みは registry-x-ops.mjs の xFolderRows（1 フォルダ・新しい行だけ）。
 *
 * - 作品 = 下書きフォルダ。ID は先頭の NNN- を外し、日付（-2026）を外し、末尾の「-数字」は前の語にくっつける（規則に合う形を機械で付ける）。
 *   日本語だけで ASCII が残らないフォルダは x{NNN}-{残り}。元のフォルダ名は legacyKey（作品）に残す。
 * - 公開 = 1 ツイート（tweets.md の「## Tweet NN」）。variant は t{NN}。文面は tweets.md#tweet/{N}。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetDir } from './datasets.mjs';
import { examToPalette, paletteQualification } from './qualification-palette.mjs';

export const X_ROOT = 'content/sns/x';
/**
 * X の作品フォルダ・状態に書かれた資格の呼び名 → 資格 id。パレットのキー（civil-1 など）と資格 id は note-cover-tokens.json の
 * qualification から導き（DN-1012）、トークンに無い略称だけをここに書く。
 */
const X_SHORTHANDS = { cem: 'pe-comprehensive-management', civil1: 'civil-construction-1', civil2: 'civil-construction-2', 'civil-1+2': 'civil-construction-1-2', civil: 'civil-construction-1-2' };
export const EXAM_ALIAS = Object.fromEntries([
  ...Object.keys(examToPalette()).map((id) => [id, id]),
  // パレットのキーは、そのトークンの資格を指す（資格 id と同じ綴りの surveyor もトークンの意味＝surveying が勝つ）
  ...Object.values(examToPalette()).map((key) => [key, paletteQualification(key)]),
  ...Object.entries(X_SHORTHANDS),
]);

/** フォルダ名 → 作品 ID（規則に合う形） */
export function xWorkId(folder) {
  const m = /^(\d{3})-(.*)$/.exec(folder);
  const num = m?.[1] ?? '';
  const rest = m ? m[2] : folder;
  const ascii = rest.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(?:^|-)20\d{2}(?=-|$)/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const fold = (s) => s.replace(/-(\d+)$/, '$1');
  const nonAscii = /[^\x00-\x7f]/.test(rest);
  if (!nonAscii && ascii.length >= 3 && /^[a-z]/.test(ascii)) return fold(ascii);
  return fold(`x${num}${ascii ? `-${ascii}` : ''}`);
}

/** フォルダの資格（status.json の exam か、名前から） */
export function xExam(folder, statusExam) {
  if (statusExam && EXAM_ALIAS[statusExam]) return EXAM_ALIAS[statusExam];
  const rest = folder.replace(/^\d{3}-/, '');
  for (const [k, v] of Object.entries(EXAM_ALIAS).sort((a, b) => b[0].length - a[0].length)) if (rest.startsWith(`${k}-`) || rest === k) return v;
  return 'account';
}

/** 自分の投稿の一覧（全ファイルを id で合わせる） */
export function loadOwnPosts(root) {
  const dir = join(root, datasetDir('x.own-posts'));
  const byId = new Map();
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  for (const f of files) for (const p of JSON.parse(readFileSync(join(dir, f), 'utf8')).posts ?? []) byId.set(p.id, p);
  return { posts: [...byId.values()], ref: `${datasetDir('x.own-posts')}/（${files.length} ファイル）` };
}
