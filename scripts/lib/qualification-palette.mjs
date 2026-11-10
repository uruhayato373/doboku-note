/**
 * qualification-palette.mjs — 資格 id から、資格の色のトークン（note-cover-tokens.json の exams のキー＝パレット）を引く唯一の実装（DN-1012）。
 *
 * 変換は表に書かず、トークンの `qualification` から導く。資格 id に直接のトークンが無ければ、その資格が属するまとまり
 * （qualification-registry.json の groups。例: pavement-1 → pavement）のトークンを使う。どちらも無い資格は null（未対応）。
 * パレットのキーそのもの（civil-1 など）を渡したときは、そのまま返す。描画（longform-render）に依存しない。
 */
import { REPO_ROOT } from './repository-paths.mjs';
import { readJson } from './json-io.mjs';
import { loadRegistry } from './qualification-registry.mjs';

const TOKENS_PATH = '.claude/knowledge/design-system/note-cover-tokens.json';
const cache = new Map();

function load(root) {
  if (!cache.has(root)) {
    const exams = readJson(root, TOKENS_PATH).exams;
    const tokens = Object.fromEntries(Object.entries(exams).filter(([, v]) => v && typeof v === 'object'));
    const byQualification = new Map();
    for (const [slug, v] of Object.entries(tokens)) if (v.qualification) byQualification.set(v.qualification, slug);
    cache.set(root, { tokens, byQualification, registry: loadRegistry(root) });
  }
  return cache.get(root);
}

/** 資格 id・まとまりの id・パレットのキーのどれかから、パレットのキーを返す。対応が無ければ null */
export function paletteKeyOf(id, root = REPO_ROOT) {
  if (!id) return null;
  const { tokens, byQualification, registry } = load(root);
  if (byQualification.has(id)) return byQualification.get(id);
  if (tokens[id]) return id;
  for (const [groupId, group] of Object.entries(registry.groups ?? {})) {
    if (group.members?.includes(id) && byQualification.has(groupId)) return byQualification.get(groupId);
  }
  return null;
}

/** paletteKeyOf と同じだが、対応が無ければ投げる（色を推測しない） */
export function requirePaletteKey(id, root = REPO_ROOT) {
  const key = paletteKeyOf(id, root);
  if (!key) throw new Error(`資格の色（パレット）が無い: ${id}（note-cover-tokens.json の exams に qualification を足すか、registry の groups に入れる）`);
  return key;
}

/** パレットのキー → そのトークンの qualification（資格 id かまとまりの id）。無ければ null */
export function paletteQualification(key, root = REPO_ROOT) {
  return load(root).tokens[key]?.qualification ?? null;
}

/** パレットのトークン（base・deep・accent など）を返す。対応が無ければ投げる */
export function paletteOf(id, root = REPO_ROOT) {
  return load(root).tokens[requirePaletteKey(id, root)];
}

/** registry の全資格とまとまりのうち、パレットに変換できるものの表（互換用。新しいコードは paletteKeyOf を使う） */
export function examToPalette(root = REPO_ROOT) {
  const { registry } = load(root);
  const ids = [...(registry.qualifications ?? []).map((q) => q.id), ...Object.keys(registry.groups ?? {})];
  return Object.fromEntries(ids.map((id) => [id, paletteKeyOf(id, root)]).filter(([, key]) => key));
}
