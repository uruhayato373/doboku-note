#!/usr/bin/env node
/**
 * YouTube の表紙が先生のキャラクターの POP に揃っているかを確かめる（2026-11-11）。
 * 2級土木「題材選び」の図解の表紙が公開されていた。表紙の設計の検査が図解だけの表紙を例外で通し、
 * 投稿済みの表紙と表紙の設計の食い違いも誰も見ていなかった。
 *
 *   node scripts/check-youtube-covers.mjs          # 台帳と表紙の設計だけを見る（CI のゲート・外部通信なし）
 *   node scripts/check-youtube-covers.mjs --live   # 公開中の表紙を YouTube から取り、台帳の表紙と画素で比べる（週次・手元か Drive の表紙）
 *
 * exit: 0 違反なし / 1 違反あり / 2 検査不成立（対象 0 件・取得の失敗が支配的）
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry } from './lib/content-registry.mjs';
import { driveGroupFor, loadDriveConfig, resolveVaultRoot, vaultAbsFor, vaultRelFor } from './lib/drive-vault.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { readJsonIf } from './lib/json-io.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { validateCoverSpec } from './lib/youtube-cover.mjs';

/** 投稿へ進んだ公開行。承認の時点で表紙は決まっている */
const COMMITTED = ['approved', 'uploaded_private', 'scheduled', 'published'];
const LIVE_MEAN_MAX = 6;

/** 公開後に差し替えた表紙（thumbnail.update）があればそれ、無ければ投稿した表紙 */
export const effectiveCover = (pub) => pub.thumbnail?.update?.coverKey ?? pub.media?.cover;

/** 表紙の設計（cover-design.json の longform）の違反。画像の生成前は design を外して見る */
export function designProblems(spec) {
  if (!spec) return ['covers.longform が無い'];
  try { validateCoverSpec({ ...spec, design: spec.approvedImage ? spec.design : undefined }); return []; }
  catch (error) { return [error.message]; }
}

/** 投稿へ進んだ通常動画の表紙が、表紙の設計で採用した画像と同じか */
export function ledgerProblems(pubs, mediaById, specOf) {
  const problems = [];
  let checked = 0;
  for (const pub of pubs) {
    if (pub.channel !== 'youtube' || pub.format !== 'longform' || !COMMITTED.includes(pub.status)) continue;
    checked += 1;
    const spec = specOf(pub);
    const cover = mediaById.get(effectiveCover(pub));
    if (!spec?.approvedImage?.sha256) problems.push(`${pub.id}: 表紙の設計に採用画像が無い`);
    else if (!cover) problems.push(`${pub.id}: 台帳の表紙（${effectiveCover(pub)}）が素材に無い`);
    else if (cover.sha256 !== spec.approvedImage.sha256) problems.push(`${pub.id}: YouTube の表紙（${cover.id}）が表紙の設計の採用画像と違う。registry replace-youtube-cover で揃える`);
  }
  return { checked, problems };
}

function locate(root, rel, cfg, vroot) {
  if (existsSync(join(root, rel))) return join(root, rel);
  const group = vroot && driveGroupFor(rel, cfg);
  if (!group) return null;
  const abs = vaultAbsFor(vroot, vaultRelFor(rel, group));
  return existsSync(abs) ? abs : null;
}

async function live(reg, mediaById) {
  const { compareThumbnail } = await import('./lib/youtube-thumbnail-image.mjs');
  const cfg = loadDriveConfig();
  let vroot = null;
  try { vroot = resolveVaultRoot().root; } catch { /* Drive が無い端末は手元の表紙だけで比べる */ }
  const targets = reg.publications.filter((p) => p.channel === 'youtube' && p.status === 'published' && /^[\w-]{11}$/.test(p.platform?.id ?? ''));
  const problems = [];
  let checked = 0, failed = 0;
  for (const pub of targets) {
    const cover = mediaById.get(effectiveCover(pub));
    const path = cover && locate(REPO_ROOT, cover.store.path, cfg, vroot);
    if (!path) { failed += 1; console.error(`  未検査: ${pub.id}（台帳の表紙の実体が手元にも Drive にも無い）`); continue; }
    let data = null;
    for (const name of ['maxresdefault.jpg', 'hqdefault.jpg']) {
      const res = await fetch(`https://i.ytimg.com/vi/${pub.platform.id}/${name}`, { signal: AbortSignal.timeout(30_000) }).catch(() => null);
      if (res?.ok) { data = Buffer.from(await res.arrayBuffer()); break; }
    }
    if (!data) { failed += 1; console.error(`  未検査: ${pub.id}（YouTube の表紙を取れない）`); continue; }
    checked += 1;
    const result = await compareThumbnail(readFileSync(path), data);
    // 公開側の JPEG は API の読み戻しより粗く、同じ表紙でも平均の差が 3〜4 になる（2026-11-11 実測 33 本の最大 4.2）。
    // 別の表紙（図解と先生の表紙）は 100 を超えるので、6 で分ける
    if (result.mean >= LIVE_MEAN_MAX) problems.push(`${pub.id}（${pub.platform.id}）: 公開中の表紙が台帳の表紙と違う（mean ${result.mean.toFixed(2)}）`);
  }
  return { total: targets.length, checked, failed, problems };
}

async function main() {
  const reg = loadRegistry(REPO_ROOT);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  if (process.argv.includes('--live')) {
    const r = await live(reg, mediaById);
    console.log(`check-youtube-covers --live: 公開中 ${r.total} 本 / 画素で比べた ${r.checked} 本 / 未検査 ${r.failed} 本 / 違反 ${r.problems.length} 件`);
    for (const p of r.problems) console.error(`  FAIL ${p}`);
    if (!r.total || fetchFailDominant(r.failed, r.total)) process.exitCode = 2;
    else if (r.problems.length) process.exitCode = 1;
    return;
  }
  const specs = new Map();
  const specOf = (pub) => {
    const key = `${pub.exam}/${pub.work}`;
    if (!specs.has(key)) specs.set(key, readJsonIf(REPO_ROOT, `content/sns/video-packs/${key}/cover-design.json`)?.covers?.longform ?? null);
    return specs.get(key);
  };
  const designs = reg.works.filter((w) => w.kind === 'video-pack' && existsSync(join(REPO_ROOT, w.definition, 'cover-design.json')));
  const designIssues = designs.flatMap((w) => designProblems(specOf({ exam: w.exam, work: w.id })).map((m) => `${w.exam}/${w.id}: ${m}`));
  const { checked, problems } = ledgerProblems(reg.publications, mediaById, specOf);
  console.log(`check-youtube-covers: 表紙の設計 ${designs.length} 件 / 投稿へ進んだ通常動画 ${checked} 本 / 違反 ${designIssues.length + problems.length} 件`);
  for (const p of [...designIssues, ...problems]) console.error(`  FAIL ${p}`);
  if (!designs.length || !checked) process.exitCode = 2;
  else if (designIssues.length || problems.length) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('check-youtube-covers.mjs')) await main();
