#!/usr/bin/env node
/**
 * media.mjs — コンテンツ台帳の素材の CLI（content-registry.md「素材の置き場」）。
 * 作業場（.tmp/video-render/{packId}/・採用画像の置き場）の成果物を、作品の ID ごとの置き場
 * （.tmp/media/{exam}/{work}/{channel}.{format}[.{variant}]/{role}.{sha8}.{ext}）へ sha 入りの名前で取り込み、
 * 素材の行を台帳（content/registry/media/{exam}.json）に書き、Drive（group content-media）と同期する。
 *
 *   npm run media -- promote --pub <公開 ID> [--commit]   # 今は YouTube の通常動画（cover・cta・video・subtitles）
 *   npm run media -- sync    --work <exam>/<work> [--commit]
 *   npm run media -- verify  --work <exam>/<work>          # 台帳・vault・クラウドの 3 者を照合（rclone）
 *   npm run media -- pull    --work <exam>/<work> [--commit]
 *   npm run media -- preview --pub <公開 ID> [--commit]    # 音声の前の画面確認: 無音プレビュー・10 秒ごとのコンタクトシート・数値（DN-0603）
 *   npm run media -- adopt-legacy-covers [--commit]        # 動画パック以前の旧 Shorts の表紙 10 件を ID の置き場へ（DN-0610）
 *   npm run media -- adopt-video-brand [--commit]          # 2026-09-09 の日付フォルダ・連番名の採用表紙・締め画像を ID の置き場へ（DN-0607）
 *
 * promote・sync・pull は既定で dry-run。置いた素材は書き換えない（描き直したものは別名で置く）。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { loadRegistry, mediaIdOf, parsePubId } from './lib/content-registry.mjs';
import { upsertMedia, upsertPublications } from './lib/content-registry-write.mjs';
import { MEDIA_ROOT, mediaPath, mimeOf } from './lib/media-paths.mjs';
import { readJson, readJsonIf } from './lib/json-io.mjs';
import { voicevoxCredit } from './lib/voicevox-credit.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { pub: { type: 'string' }, work: { type: 'string' }, commit: { type: 'boolean' } },
});
const sha256Of = (abs) => createHash('sha256').update(readFileSync(abs)).digest('hex');

/** YouTube の通常動画の素材の出どころ（作業場のパス・来歴） */
function longformSources(work) {
  const packDir = work.definition;
  const render = `.tmp/video-render/${work.id}`;
  const cover = readJson(ROOT, `${packDir}/cover-design.json`).covers?.longform?.approvedImage;
  const cta = readJsonIf(ROOT, `${packDir}/cta-design.json`)?.longform;
  const manifest = readJsonIf(ROOT, `${render}/render-manifest.json`);
  const sources = [];
  if (cover) sources.push({ role: 'cover', from: cover.path, expectSha: cover.sha256, legacy: true,
    provenance: { kind: 'template', by: 'brand-video-pack', spec: `${packDir}/cover-design.json#longform`, specSha256: cover.specSha256 } });
  if (cta) sources.push({ role: 'cta', from: cta.path, expectSha: cta.sha256, legacy: true,
    provenance: { kind: 'template', by: 'brand-video-pack', spec: `${packDir}/storyboard.json#cta` } });
  if (manifest?.mp4) {
    sources.push({ role: 'video', from: `${render}/${manifest.mp4}`, durationSec: manifest.totalSec,
      provenance: { kind: 'render', by: 'render-longform', spec: `${packDir}/storyboard.json`,
        ...(manifest.tts ? { tts: { engine: 'VOICEVOX', speaker: manifest.speaker, credit: voicevoxCredit(manifest.speaker) } } : {}) } });
    sources.push({ role: 'subtitles', from: `${render}/subtitles.ass`, provenance: { kind: 'render', by: 'render-longform', spec: `${packDir}/storyboard.json` } });
  }
  return sources;
}

async function promote() {
  if (!args.pub) throw new Error('--pub が要る');
  const parsed = parsePubId(args.pub);
  if (!parsed) throw new Error(`公開 ID の形が違う: ${args.pub}`);
  const reg = loadRegistry(ROOT);
  const pub = reg.publications.find((p) => p.id === args.pub);
  const work = reg.works.find((w) => w.id === parsed.work);
  if (!pub || !work) throw new Error(`台帳に無い: ${args.pub}（先に npm run registry -- import-video-pack）`);
  if (!(parsed.channel === 'youtube' && parsed.format === 'longform' && work.kind === 'video-pack')) throw new Error('今の promote は動画パックの YouTube 通常動画だけ');

  const rows = [];
  const missing = [];
  for (const s of longformSources(work)) {
    const abs = join(ROOT, s.from);
    if (!existsSync(abs)) { missing.push(s.from); continue; }
    const sha256 = sha256Of(abs);
    if (s.expectSha && s.expectSha !== sha256) throw new Error(`${s.role}: 採用時の sha256 と違う（${s.from}）`);
    const ext = extname(s.from).slice(1).toLowerCase();
    const path = mediaPath({ pubId: pub.id, role: s.role, sha256, ext });
    const row = { id: mediaIdOf(pub.id, s.role), role: s.role, type: mimeOf(ext), sha256, bytes: readFileSync(abs).length, store: { tier: 'drive', path }, provenance: s.provenance };
    if (ext === 'png') { const meta = await sharp(abs).metadata(); row.width = meta.width; row.height = meta.height; }
    if (s.durationSec) row.durationSec = Math.round(s.durationSec * 1000) / 1000;
    if (s.legacy && s.from !== path) row.legacyPaths = [s.from];
    rows.push({ row, from: s.from });
  }
  for (const { row, from } of rows) console.log(`  ${row.role.padEnd(10)} ${row.sha256.slice(0, 12)}  ${from} → ${row.store.path}`);
  if (missing.length) console.log(`  作業場に無い（先に描画・Drive から pull）: ${missing.join(', ')}`);
  if (!args.commit) { console.log(`dry-run: 素材 ${rows.length} 件（書いていない）。書くときは --commit`); return; }
  for (const { row, from } of rows) {
    const dest = join(ROOT, row.store.path);
    mkdirSync(dirname(dest), { recursive: true });
    if (!existsSync(dest)) copyFileSync(join(ROOT, from), dest);
    else if (sha256Of(dest) !== row.sha256) throw new Error(`置き場に別の中身がある（書き換えない）: ${row.store.path}`);
  }
  upsertMedia(ROOT, pub.exam, rows.map((r) => r.row));
  upsertPublications(ROOT, pub.channel, pub.exam, [{ ...pub, media: { ...(pub.media ?? {}), ...Object.fromEntries(rows.map(({ row }) => [row.role, row.id])) } }]);
  console.log(`取り込んだ: 素材 ${rows.length} 件（${pub.id}）。次は npm run media -- sync --work ${pub.exam}/${pub.work} --commit`);
}

/** drive-vault-sync を group content-media・作品のフォルダに絞って呼ぶ */
function vault(extra) {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(args.work ?? '')) throw new Error('--work <exam>/<work> が要る');
  const argv = ['scripts/drive-vault-sync.mjs', '--group', 'content-media', '--path', `${MEDIA_ROOT}/${args.work}/`, ...extra];
  const r = spawnSync(process.execPath, argv, { cwd: ROOT, stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
}

async function adoptVideoBrand() {
  const { applyAdoptVideoBrand, planAdoptVideoBrand } = await import('./lib/media-adopt-video-brand.mjs');
  const plan = await planAdoptVideoBrand(ROOT);
  const copies = plan.items.filter((i) => i.row);
  const byRole = copies.reduce((m, i) => ({ ...m, [i.role]: (m[i.role] ?? 0) + 1 }), {});
  console.log(`移す素材 ${copies.length} 件（${Object.entries(byRole).map(([r, n]) => `${r} ${n}`).join('・') || 'なし'}）/ パスだけ書き換える Shorts の締め画像の参照 ${plan.items.length - copies.length} 件 / Drive のマウント: ${plan.mount ? 'あり' : 'なし'}`);
  if (plan.missing.length) console.log(`  元の画像が手元にも Drive にも無い ${plan.missing.length} 件: ${plan.missing.slice(0, 5).join(', ')}`);
  if (plan.mismatched.length) console.log(`  sha256 が違う ${plan.mismatched.length} 件: ${plan.mismatched.slice(0, 5).join(', ')}`);
  if (plan.missing.length || plan.mismatched.length) { process.exitCode = 1; console.log('止めた（画素を変えずに移せることを全件で確かめられない）'); return; }
  if (!args.commit) { console.log('dry-run（書いていない）。書くときは --commit'); return; }
  const r = await applyAdoptVideoBrand(ROOT, plan);
  console.log(`写した ${r.copied} 件・素材の行 ${r.mediaRows} 件・公開の行 ${r.publications} 件・書き換えた JSON ${r.rewritten} ファイル。次は Drive へ: node scripts/drive-vault-sync.mjs --group content-media --commit`);
}

/** 画面確認（音声なし）の素材を作る（DN-0603・実装は scripts/lib/media-preview.mjs） */
async function preview() {
  const { runPreview } = await import('./lib/media-preview.mjs');
  await runPreview(ROOT, { pub: args.pub, commit: Boolean(args.commit) });
}

/** 旧 Shorts の表紙 10 件を ID の置き場へ（DN-0610） */
async function adoptLegacyCovers() {
  const { applyAdoptVideoBrand, planAdoptLegacyCovers } = await import('./lib/media-adopt-video-brand.mjs');
  const { legacyYoutubeRows } = await import('./lib/registry-legacy-youtube.mjs');
  const { loadRegistryConfig } = await import('./lib/content-registry.mjs');
  const { readLatest } = await import('./lib/dataset-io.mjs');
  const latest = readLatest(ROOT, 'youtube.own-videos');
  const rows = legacyYoutubeRows(ROOT, { own: latest?.data ?? null, ownRef: latest?.file ?? '-', rules: loadRegistryConfig(ROOT).idRules });
  const plan = await planAdoptLegacyCovers(ROOT, rows.covers);
  console.log(`移す旧 Shorts の表紙 ${plan.items.length} 件 / 元が無い ${plan.missing.length} / sha 違い ${plan.mismatched.length}`);
  for (const m of [...plan.missing, ...plan.mismatched]) console.log(`  ${m}`);
  if (plan.missing.length || plan.mismatched.length) { process.exitCode = 1; return; }
  if (!args.commit) { console.log('dry-run（書いていない）。書くときは --commit'); return; }
  const r = await applyAdoptVideoBrand(ROOT, plan);
  console.log(`写した ${r.copied} 件・素材の行 ${r.mediaRows} 件・公開の行 ${r.publications} 件・書き換えた JSON ${r.rewritten} ファイル。次は Drive へ: node scripts/drive-vault-sync.mjs --group content-media --commit`);
}

const commands = {
  promote,
  'adopt-legacy-covers': adoptLegacyCovers,
  preview,
  'adopt-video-brand': adoptVideoBrand,
  sync: () => vault(args.commit ? ['--commit'] : []),
  verify: () => vault(['--verify', '--deep', '--cloud']),
  pull: () => vault(['--pull', ...(args.commit ? ['--commit'] : ['--dry-run'])]),
};
const [command] = positionals;
if (!commands[command]) {
  console.error('Usage: npm run media -- promote|preview|sync|verify|pull|adopt-video-brand|adopt-legacy-covers …');
  process.exit(2);
}
await commands[command]();
