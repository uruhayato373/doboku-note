import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { discoverPacks, loadConfig } from './video-content-check.mjs';
import { validateCoverDesign } from './youtube-cover.mjs';
import { EXAM_TO_PALETTE } from './longform-render.mjs';
export const digest = data => createHash('sha256').update(data).digest('hex');
export const specDigest = spec => digest(JSON.stringify(spec));

/** Read existing production sources; do not copy live private titles/IDs into Git. */
export function loadCoverSources(root) {
  const state = JSON.parse(readFileSync(join(root, '.claude/state/video-content-status.json')));
  const sources = [];
  for (const p of discoverPacks(root, loadConfig(root)).packs) {
    const path = join(p.dir, 'cover-design.json');
    if (!existsSync(path)) continue;
    const design = validateCoverDesign(JSON.parse(readFileSync(path)), { exam: EXAM_TO_PALETTE[p.exam] });
    const y = JSON.parse(readFileSync(join(p.dir, 'youtube.json')));
    const derivatives = state.packs[p.slug]?.derivatives;
    for (const item of [y.longform, ...y.shorts]) {
      const spec = design.covers[item.key];
      if (!spec) throw new Error('Missing authored cover');
      if (spec.format !== (item.key === 'longform' ? 'longform' : 'shorts')) throw new Error('Cover format mismatch');
      const status = item.key === 'longform' ? derivatives?.longform : derivatives?.shorts?.find(s => s.key === item.key);
      sources.push({ sourceKey: `${p.exam}/${p.slug}/${item.key}`, designPath: relative(root, path).replaceAll('\\', '/'), key: item.key,
        title: item.title, spec, knownVideoId: status?.videoId ?? null });
    }
  }
  const path = 'content/sns/youtube/cover-design.json';
  if (existsSync(join(root, path))) {
    const design = validateCoverDesign(JSON.parse(readFileSync(join(root, path))));
    for (const [key, spec] of Object.entries(design.covers)) {
      if (!design.titles?.[key]) throw new Error('Legacy cover title binding missing');
      sources.push({ sourceKey: `legacy/${key}`, designPath: path, key, title: design.titles[key], spec, knownVideoId: null });
    }
  }
  if (!sources.length || new Set(sources.map(s => s.sourceKey)).size !== sources.length) throw new Error('No sources or duplicate source key');
  return sources;
}

export function buildCoverPlan(inventory, sources, approvals) {
  if (!inventory.complete || inventory.checked !== inventory.videos?.length || !inventory.checked) throw new Error('Complete inventory required');
  if (!Array.isArray(approvals?.entries) || !approvals.entries.length || new Set(approvals.entries.map(a => a.sourceKey)).size !== approvals.entries.length) throw new Error('Invalid or duplicate rendered approvals');
  const entries = inventory.videos.map(video => {
    let matches = sources.filter(s => s.knownVideoId === video.id);
    if (!matches.length) matches = sources.filter(s => s.title === video.snippet.title);
    if (matches.length !== 1 || matches[0].title !== video.snippet.title) throw new Error(`Video source missing/ambiguous or title drift: ${video.id}`);
    const source = matches[0];
    const approval = approvals.entries.find(a => a.sourceKey === source.sourceKey);
    if (!approval || approval.specSha256 !== specDigest(source.spec) || !/^[a-f0-9]{64}$/.test(approval.sha256)) throw new Error('Missing/stale rendered approval');
    return { videoId: video.id, sourceKey: source.sourceKey, title: source.title,
      spec: source.spec, sha256: approval.sha256, privacy: video.status.privacyStatus };
  }).sort((a, b) => (a.privacy === 'public' ? 0 : 1) - (b.privacy === 'public' ? 0 : 1) || a.videoId.localeCompare(b.videoId, 'en'));
  if (new Set(entries.map(e => e.videoId)).size !== entries.length) throw new Error('Duplicate target');
  return { channel: inventory.channel, count: entries.length, entries,
    // Stable across scheduled publication transitions. Privacy is re-read and preserved per write.
    sha256: digest(JSON.stringify(entries.map(({ privacy: _privacy, ...e }) => e).sort((a, b) => a.videoId.localeCompare(b.videoId, 'en')))) };
}
