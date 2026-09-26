/**
 * affiliate-placements.mjs — アフィリエイトリンクの掲載先（サイト／note／SNS）の棚卸し。
 *
 * 正本は各掲載先の原稿そのもの（src・content/site・content/note・content/sns）で、ここは a8mat= を
 * 数えて案件（src/config/affiliate-mats.json）へ引くだけ。成果は掲載先ごとに分かれていない
 * （A8 の登録サイトが1つ＝サイトと note の合算）ので、ここではリンクの所在だけを出す。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const SURFACES = [
  { id: 'site', label: 'サイト', roots: ['src', 'content/site'], ext: /\.(tsx?|mdx)$/ },
  { id: 'note', label: 'note', roots: ['content/note'], ext: /^article(-[^/\\]+)?\.md$/ },
  { id: 'sns', label: 'SNS', roots: ['content/sns'], ext: /\.(md|txt|json)$/ },
];

const MAT_RE = /a8mat=([0-9A-Z]+(?:\+[0-9A-Z]+){3})/g;

function walk(dir, test, out) {
  let names;
  try { names = readdirSync(dir); } catch { return out; }
  for (const name of names) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, test, out);
    else if (test.test(name)) out.push(p);
  }
  return out;
}

function frontmatterValue(text, key) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const line = m?.[1].split(/\r?\n/).find((l) => l.startsWith(`${key}:`));
  return line ? line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '') : null;
}

/** 掲載先ごとの a8mat の所在。scanned は実際に読んだファイル数（0 件と未検査を区別する）。 */
export function affiliatePlacements(root) {
  const mats = JSON.parse(readFileSync(join(root, 'src/config/affiliate-mats.json'), 'utf8')).mats;
  const byMat = new Map(mats.map((m) => [m.mat, m]));
  return SURFACES.map((s) => {
    const files = s.roots.flatMap((r) => walk(join(root, r), s.ext, []));
    const links = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const found = new Set([...text.matchAll(MAT_RE)].map((m) => m[1]));
      for (const mat of found) {
        const known = byMat.get(mat);
        links.push({
          path: relative(root, file).split('\\').join('/'),
          mat,
          program: known?.program ?? null,
          expiresAt: known?.expiresAt ?? null,
          status: s.id === 'note' ? frontmatterValue(text, 'noteStatus') : null,
          title: s.id === 'note' ? frontmatterValue(text, 'title') : null,
        });
      }
    }
    return { id: s.id, label: s.label, scanned: files.length, links };
  });
}
