/**
 * media-adopt-video-brand.mjs — 2026-09-09 の一括適用（apply-video-brand.mjs）で日付フォルダ・連番名に置いた採用表紙・締め画像と
 * ブランド素材を、画素を変えずに ID ごとの置き場（.tmp/media/…/{role}.{sha8}.png）へ写す（DN-0607・content-registry.md「素材の置き場」）。
 *
 * - 元の画像は手元（.tmp/video-render/…）か Drive のマウント（drive-vault の group から引いた vault のパス）から読み、
 *   cover-design.json・cta-design.json・config/video-brand.json に書いた sha256 と一致しなければ止める。
 * - 素材の行（content/registry/media/{exam}.json・brand.json）と公開の行の media（cover・cta）を書き、
 *   cover-design.json の approvedImage.path・cta-design.json の path・config/video-brand.json の path を新しい置き場へ書き換える。
 * - 置き場に同じ中身があれば写さない（2 回目は何も変わらない）。台帳に同じ id で別の中身の行があれば止める。
 * - content/sns/youtube/cover-design.json（動画パック以前の旧 Shorts の 10 件）は台帳の ID がまだ無いので P4 で移す。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { loadRegistry, mediaIdOf, pubIdOf } from './content-registry.mjs';
import { discoverVideoPacks } from './content-registry-check.mjs';
import { driveGroupFor, loadDriveConfig, resolveVaultRoot, vaultAbsFor, vaultRelFor } from './drive-vault.mjs';
import { mediaPath, parseMediaPath } from './media-paths.mjs';

const sha256Of = (buf) => createHash('sha256').update(buf).digest('hex');
const BRAND_CONFIG = 'config/video-brand.json'; // path-literal-ok: 台帳 id config.video-brand のファイル（書き換えのため読み書き両方）
const BRAND_ROLES = { logo: 'logo', longformBackground: 'background-longform', shorts: 'cta-shorts' };

/** 元の画像の中身を読む（手元か Drive のマウント）。どちらにも無ければ null */
export function readSource(root, path, ctx) {
  const local = join(root, path);
  if (existsSync(local)) return readFileSync(local);
  if (!ctx.mount) return null;
  const group = driveGroupFor(path, ctx.cfg);
  if (!group) return null;
  const abs = vaultAbsFor(ctx.mount, vaultRelFor(path, group));
  return existsSync(abs) ? readFileSync(abs) : null;
}

/**
 * 移す計画を作る（書かない）。
 * @returns {Promise<{ items: object[], missing: string[], mismatched: string[], mount: string|null }>}
 *   items: { from, to, buf, row, scope, pubId?, role, rewrite: { file, pointer } }
 */
export async function planAdoptVideoBrand(root) {
  const cfg = loadDriveConfig();
  const vault = resolveVaultRoot();
  const ctx = { cfg, mount: vault.root ?? null };
  const reg = loadRegistry(root);
  const pubIds = new Set(reg.publications.map((p) => p.id));
  const items = [];
  const missing = [];
  const mismatched = [];
  const add = async ({ from, sha256, scope, pubId, brand, role, provenance, rewrite }) => {
    if (parseMediaPath(from)) return; // もう移してある
    const buf = readSource(root, from, ctx);
    if (!buf) { missing.push(from); return; }
    if (sha256Of(buf) !== sha256) { mismatched.push(from); return; }
    const to = mediaPath({ pubId, brand, role, sha256, ext: 'png' });
    const meta = await sharp(buf).metadata();
    const id = brand ? `brand/${brand}/${role}` : mediaIdOf(pubId, role);
    const row = { id, role, type: 'image/png', sha256, bytes: buf.length, width: meta.width, height: meta.height, store: { tier: 'drive', path: to }, provenance, legacyPaths: [from] };
    items.push({ from, to, buf, row, scope, pubId, role, rewrite });
  };

  const brandCfg = JSON.parse(readFileSync(join(root, BRAND_CONFIG), 'utf8'));
  for (const [key, role] of Object.entries(BRAND_ROLES)) {
    const a = brandCfg[key];
    if (a?.path) await add({ from: a.path, sha256: a.sha256, scope: 'brand', brand: brandCfg.design, role, provenance: { kind: 'template', by: 'apply-video-brand', spec: `${BRAND_CONFIG}#${key}` }, rewrite: { file: BRAND_CONFIG, pointer: [key] } });
  }

  for (const [packId, pack] of [...discoverVideoPacks(root)].sort(([a], [b]) => a.localeCompare(b))) {
    const coverFile = `${pack.dir}/cover-design.json`;
    if (existsSync(join(root, coverFile))) {
      const covers = JSON.parse(readFileSync(join(root, coverFile), 'utf8')).covers ?? {};
      for (const [key, spec] of Object.entries(covers)) {
        const img = spec.approvedImage;
        if (!img?.path) continue;
        const pubId = pubIdOf({ exam: pack.exam, work: packId, channel: 'youtube', format: key === 'longform' ? 'longform' : 'short', variant: key === 'longform' ? null : key });
        if (!pubIds.has(pubId)) { missing.push(`${img.path}（台帳に公開 ${pubId} が無い）`); continue; }
        await add({ from: img.path, sha256: img.sha256, scope: pack.exam, pubId, role: 'cover', provenance: { kind: 'template', by: 'apply-video-brand', spec: `${coverFile}#${key}`, specSha256: img.specSha256 }, rewrite: { file: coverFile, pointer: ['covers', key, 'approvedImage'] } });
      }
    }
    const ctaFile = `${pack.dir}/cta-design.json`;
    if (existsSync(join(root, ctaFile))) {
      const cta = JSON.parse(readFileSync(join(root, ctaFile), 'utf8'));
      const longformId = pubIdOf({ exam: pack.exam, work: packId, channel: 'youtube', format: 'longform' });
      if (cta.longform?.path && pubIds.has(longformId)) {
        await add({ from: cta.longform.path, sha256: cta.longform.sha256, scope: pack.exam, pubId: longformId, role: 'cta', provenance: { kind: 'template', by: 'apply-video-brand', spec: `${ctaFile}#longform` }, rewrite: { file: ctaFile, pointer: ['longform'] } });
      }
      if (cta.shorts?.path && !parseMediaPath(cta.shorts.path)) {
        // Shorts の締め画像はブランド共通（config/video-brand.json の shorts と同じ中身）。パスだけ書き換える
        if (cta.shorts.sha256 !== brandCfg.shorts?.sha256) mismatched.push(`${cta.shorts.path}（${ctaFile} の shorts がブランドの締め画像と違う）`);
        else items.push({ from: cta.shorts.path, to: null, buf: null, row: null, scope: 'brand', role: 'cta-shorts', rewrite: { file: ctaFile, pointer: ['shorts'], brandRole: 'cta-shorts', brand: brandCfg.design } });
      }
    }
  }
  return { items, missing, mismatched, mount: ctx.mount };
}

/**
 * 計画を書く。置き場へ写し、素材と公開の行を書き、作品フォルダの JSON のパスを書き換える。
 * @returns {{ copied: number, rewritten: number, mediaRows: number }}
 */
export async function applyAdoptVideoBrand(root, plan) {
  const { upsertMedia, upsertPublications } = await import('./content-registry-write.mjs');
  const reg = loadRegistry(root);
  const brandPath = new Map(plan.items.filter((i) => i.row && i.scope === 'brand').map((i) => [i.role, i.to]));
  let copied = 0;
  const rowsByScope = new Map();
  for (const it of plan.items.filter((i) => i.row)) {
    const cur = reg.media.find((m) => m.id === it.row.id);
    if (cur && cur.sha256 !== it.row.sha256) throw new Error(`台帳に同じ id で別の中身の素材がある（書き換えない）: ${it.row.id}`);
    const dest = join(root, it.to);
    if (existsSync(dest)) {
      if (sha256Of(readFileSync(dest)) !== it.row.sha256) throw new Error(`置き場に別の中身がある: ${it.to}`);
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, it.buf);
      copied += 1;
    }
    if (!cur) rowsByScope.set(it.scope, [...(rowsByScope.get(it.scope) ?? []), it.row]);
  }
  for (const [scope, rows] of rowsByScope) upsertMedia(root, scope, rows);

  // 公開の行の media（cover・cta）
  const pubPatch = new Map();
  for (const it of plan.items) {
    if (!it.pubId) continue;
    const p = pubPatch.get(it.pubId) ?? {};
    p[it.role] = it.row.id;
    pubPatch.set(it.pubId, p);
  }
  const brandCta = plan.items.find((i) => i.row?.role === 'cta-shorts')?.row.id ?? reg.media.find((m) => m.id.startsWith('brand/') && m.role === 'cta-shorts')?.id;
  for (const it of plan.items.filter((i) => i.rewrite.brandRole === 'cta-shorts')) {
    const pack = it.rewrite.file.replace(/\/cta-design\.json$/, '');
    for (const p of reg.publications.filter((x) => x.format === 'short' && x.channel === 'youtube' && reg.works.find((w) => w.id === x.work)?.definition === pack)) {
      pubPatch.set(p.id, { ...(pubPatch.get(p.id) ?? {}), cta: brandCta });
    }
  }
  const pubsByExam = new Map();
  for (const [id, media] of pubPatch) {
    const cur = reg.publications.find((p) => p.id === id);
    const merged = { ...(cur.media ?? {}), ...media };
    if (JSON.stringify(merged) === JSON.stringify(cur.media ?? {})) continue;
    const row = Object.fromEntries(Object.entries(cur).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));
    pubsByExam.set(cur.exam, [...(pubsByExam.get(cur.exam) ?? []), { ...row, media: merged }]);
  }
  for (const [exam, rows] of pubsByExam) upsertPublications(root, 'youtube', exam, rows);

  // 作品フォルダの JSON（と config/video-brand.json）のパスを書き換える。字下げ 2・末尾改行は元と同じ
  const byFile = new Map();
  for (const it of plan.items) byFile.set(it.rewrite.file, [...(byFile.get(it.rewrite.file) ?? []), it]);
  let rewritten = 0;
  for (const [file, its] of byFile) {
    const abs = join(root, file);
    const doc = JSON.parse(readFileSync(abs, 'utf8'));
    for (const it of its) {
      const node = it.rewrite.pointer.reduce((n, k) => n?.[k], doc);
      if (!node || node.path !== it.from) throw new Error(`${file} の ${it.rewrite.pointer.join('.')} が想定と違う`);
      node.path = it.rewrite.brandRole ? brandPath.get(it.rewrite.brandRole) ?? reg.media.find((m) => m.id === `brand/${it.rewrite.brand}/${it.rewrite.brandRole}`)?.store.path : it.to;
      if (!node.path) throw new Error(`${file}: ブランド素材 ${it.rewrite.brandRole} の新しい置き場が分からない`);
    }
    writeFileSync(abs, `${JSON.stringify(doc, null, 2)}\n`);
    rewritten += 1;
  }
  return { copied, rewritten, mediaRows: [...rowsByScope.values()].flat().length, publications: [...pubsByExam.values()].flat().length };
}

