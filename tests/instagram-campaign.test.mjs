import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCampaign, inspectCampaign, assertInstagramPublicationReady, buildInstagramSchedule, sha256, CAMPAIGN_PATH } from '../scripts/lib/instagram-campaign.mjs';
import { IG_DESIGN, instagramRendererDigest } from '../scripts/lib/instagram-video-design.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const write = (root, path, value) => { const p = join(root, path); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof value === 'string' ? value : JSON.stringify(value)); };
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ig-campaign-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const f of ['scripts/lib/instagram-video-design.mjs', 'scripts/lib/video-explanation.mjs', '.claude/config/video-brand.json', '.claude/config/character-poses.json',
    'scripts/render-instagram-video-pack-carousels.mjs', 'scripts/render-instagram-video-pack-reels.mjs', 'scripts/lib/video-narration-cache.mjs', 'scripts/lib/video-subtitles.mjs', '.claude/scripts/lib/sns-common/reading-dict.mjs']) write(root, f, readFileSync(join(repo, f), 'utf8'));
  const topics = Array.from({ length: 112 }, (_, i) => { const dir = `content/sns/instagram/video-packs/civil-construction-1/p-${i}`;
    return { sourcePackId: `p-${i}`, exam: 'civil-construction-1', carousel: dir, reels: [`${dir}-a`, `${dir}-b`] }; });
  const plan = { schemaVersion: 1, id: 'test', account: 'dobokunotecom', design: IG_DESIGN, productionFirst: true, publicationEnabled: false,
    expected: { topics: 112, carousels: 112, reels: 224 },
    cadence: { timezone: 'Asia/Tokyo', maxPerDay: 2, startDate: null, sequence: [
      { day: 0, time: '12:30', format: 'reel-1' }, { day: 1, time: '12:30', format: 'carousel' }, { day: 1, time: '19:00', format: 'reel-2' }] }, topics };
  write(root, CAMPAIGN_PATH, plan);
  for (const topic of topics) {
    const source = JSON.stringify({ slides: Array.from({ length: 6 }, () => ({})) });
    write(root, `${topic.carousel}/slide-data.json`, source);
    write(root, `${topic.carousel}/carousel/caption.txt`, '保存して確認。詳しくはプロフィールから。\n#試験対策');
    const images = Array.from({ length: 6 }, (_, i) => { const path = `${topic.carousel}/carousel/img/${i}.png`; write(root, path, 'image'); return { path, sha256: sha256('image') }; });
    write(root, `${topic.carousel}/carousel/render.json`, { design: IG_DESIGN, sourceSha256: sha256(source), rendererSha256: instagramRendererDigest(root, 'carousel'), images });
    for (const dir of topic.reels) {
      write(root, `${dir}/reels/script.json`, source);
      write(root, `${dir}/reels/caption.txt`, 'フォローして確認。詳しくはプロフィールから。\n#試験対策');
      write(root, `${dir}/reels/video.mp4`, 'video'); write(root, `${dir}/reels/cover.png`, 'cover');
      write(root, `${dir}/reels/meta.json`, { design: IG_DESIGN, scriptSha256: sha256(source), rendererSha256: instagramRendererDigest(root, 'reel'),
        sha256: sha256('video'), coverSha256: sha256('cover'), durationSeconds: 30.2, validation: { fullDecode: true, audio: true } });
    }
  }
  return { root, plan };
}
test('zero targets, duplicate topics and missing derivative do not shrink the approved scope', t => {
  const { plan } = fixture(t);
  assert.throws(() => validateCampaign({ ...plan, topics: [] }));
  assert.throws(() => validateCampaign({ ...plan, topics: [plan.topics[0], ...plan.topics.slice(0, 111)] }));
  const broken = structuredClone(plan); broken.topics[0].reels.pop(); assert.throws(() => validateCampaign(broken));
});
test('one missing video prevents the all-content gate from passing', t => {
  const { root, plan } = fixture(t);
  assert.equal(inspectCampaign(root, { media: true }).complete, true);
  unlinkSync(join(root, plan.topics[50].reels[0], 'reels/video.mp4'));
  const result = inspectCampaign(root, { media: true }); assert.equal(result.complete, false); assert.equal(result.counts.ready, 335);
});
test('edited scripts, tampered media and changed templates invalidate completed work', t => {
  const { root, plan } = fixture(t);
  write(root, `${plan.topics[0].reels[0]}/reels/script.json`, 'edited');
  write(root, `${plan.topics[1].carousel}/carousel/img/0.png`, 'wrong');
  let result = inspectCampaign(root, { media: true }); assert.equal(result.counts.ready, 334);
  write(root, 'scripts/lib/instagram-video-design.mjs', 'new template');
  result = inspectCampaign(root, { media: true }); assert.equal(result.counts.ready, 0);
});
test('production-first hold is enforced even when every media file is complete', t => {
  const { root } = fixture(t);
  assert.throws(() => assertInstagramPublicationReady(root), /全件制作/);
});
test('an undated plan cannot reuse an old video upload date', t => {
  const { root, plan } = fixture(t);
  const rows = buildInstagramSchedule(plan);
  assert.equal(rows.length, 336);
  assert.equal(rows.at(-1).dayOffset, 223);
  assert.ok(rows.every(row => row.publishAt === null));
  plan.publicationEnabled = true; write(root, CAMPAIGN_PATH, plan);
  assert.throws(() => assertInstagramPublicationReady(root), /開始日/);
});
test('JST schedule crosses months and years without duplicate slots or more than two posts per day', t => {
  const { plan } = fixture(t); plan.cadence.startDate = '2026-12-31';
  const rows = buildInstagramSchedule(plan, { requireStart: true });
  assert.equal(rows[0].publishAt, '2026-12-31T12:30:00+09:00');
  assert.equal(rows[1].publishAt, '2027-01-01T12:30:00+09:00');
  assert.equal(rows[2].publishAt, '2027-01-01T19:00:00+09:00');
  assert.equal(new Set(rows.map(row => row.publishAt)).size, 336);
  const days = new Map();
  for (const row of rows) { const day = row.publishAt.slice(0, 10); days.set(day, (days.get(day) ?? 0) + 1); }
  assert.ok([...days.values()].every(count => count <= 2));
  plan.cadence.startDate = '2026-02-30';
  assert.throws(() => buildInstagramSchedule(plan), /開始日/);
  plan.cadence.startDate = '2026-12-31'; plan.cadence.sequence[2].time = '12:30';
  assert.throws(() => buildInstagramSchedule(plan), /重複/);
});
