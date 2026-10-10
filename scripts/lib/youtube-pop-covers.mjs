import { existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, readlinkSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { loadRegistry, mediaIdOf, resolveCopy } from './content-registry.mjs';
import { upsertMedia, upsertPublications } from './content-registry-write.mjs';
import { mediaPath } from './media-paths.mjs';
import { readJson, writeJson } from './json-io.mjs';
import { readDataset } from './dataset-io.mjs';
import { orderedQualifications, qualificationShortLabel } from './qualification-names.mjs';
import { renderYoutubeCover, validateCoverDesign } from './youtube-cover.mjs';
import { coverInputDigest } from './youtube-approved-cover.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const relativePath = (root, file) => relative(root, file).replaceAll('\\', '/');
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Existing authored words choose the treatment; no claims, counts or titles are invented. */
export function popVariant(spec, manifest = {}) {
  const words = [...spec.headline, spec.subtitle].join(' ');
  if (/耳で|聞き流し|総復習/.test(words)) return 'listen';
  if (/答案|論文|記述|経歴票|書く|書き方|添削/.test(words)) return 'write';
  if (/違い|区別|比較|使い分け|どちら|か民間/.test(words)) return 'compare';
  if (/[？?]|落とし穴|減点/.test(words)) return 'question';
  if (manifest.intent === 'roadmap' || /順序|計画を|スケジュール/.test(words)) return 'plan';
  return 'explain';
}

/** Publications define the finite scope, including the ten published legacy Shorts. */
export function popCoverSources(root, { exam, pub } = {}) {
  const reg = loadRegistry(root);
  const order = new Map(orderedQualifications(readDataset(root, 'config.qualification-registry')).map((q, i) => [q.id, i]));
  const sources = [];
  for (const p of reg.publications.filter(p => p.channel === 'youtube' && p.status !== 'stopped' &&
      (!exam || p.exam === exam) && (!pub || p.id === pub))) {
    const work = reg.works.find(w => w.id === p.work);
    if (!work) throw new Error(`作品がない: ${p.id}`);
    const legacy = work.kind === 'legacy-short';
    const designPath = legacy ? 'content/sns/youtube/cover-design.json' : `${work.definition}/cover-design.json`;
    const design = validateCoverDesign(readJson(root, designPath));
    const key = legacy ? Object.keys(design.covers).find(k => design.titles[k] === resolveCopy(root, p.copy)?.title)
      : p.format === 'longform' ? 'longform' : p.id.split('.').at(-1);
    if (!key || !design.covers[key]) throw new Error(`表紙の原稿が見つからない: ${p.id}`);
    const manifest = legacy ? {} : readJson(root, `${work.definition}/video-pack.json`);
    sources.push({ pub: p, work, key, designPath, spec: design.covers[key], manifest,
      title: resolveCopy(root, p.copy)?.title ?? manifest.title,
      popPath: legacy ? 'content/sns/youtube/pop-image.json' : `${work.definition}/pop-image.json` });
  }
  if (!sources.length) throw new Error('対象が0件です');
  sources.sort((a,b) => (order.get(a.pub.exam) ?? 99) - (order.get(b.pub.exam) ?? 99) ||
    a.pub.format.localeCompare(b.pub.format) || a.pub.id.localeCompare(b.pub.id));
  return { reg, sources };
}

/** Render cover images only. Audio, subtitles, videos, publication states and approvals are preserved. */
export async function runPopCovers(root, { commit = false, exam, pub } = {}) {
  const { reg, sources } = popCoverSources(root, { exam, pub });
  const out = join(root, '.tmp/youtube-covers/pop-all');
  mkdirSync(join(out, 'images'), { recursive: true });
  mkdirSync(join(out, 'full'), { recursive: true });
  const generations = readJson(root, 'content/sns/_assets/character/pop-generation.json');
  const poses = readDataset(root, 'config.character-poses');
  const designs = new Map(), manifests = new Map(), mediaRows = new Map(), pubRows = new Map();
  const results = [];
  for (const s of sources) {
    const variant = popVariant(s.spec, s.manifest);
    const pose = variant === 'write' ? 'pop-red-pen' : ['question','compare'].includes(variant) ? 'pop-pointing' : 'pop-explaining';
    const { approvedImage, ...input } = s.spec;
    const spec = { ...input, design: 'pop-v2', pop: { variant, authority: '総監が制作' }, character: { pose, frame: 'waist' } };
    // A previously selected full-frame artwork is used only with the exact same authored inputs.
    if (s.spec.design === 'pop-v2' && approvedImage?.specSha256 === coverInputDigest(spec)) spec.approvedImage = approvedImage;
    const rendered = await renderYoutubeCover(root, spec);
    if (rendered.buffer.length > 2 * 1024 * 1024) throw new Error(`${s.pub.id}: 表紙が2MiBを超える`);
    const sha256 = hash(rendered.buffer);
    const path = mediaPath({ pubId: s.pub.id, role: 'cover', sha256, ext: 'png' });
    const file = join(root, path), id = mediaIdOf(s.pub.id, 'cover');
    mkdirSync(dirname(file), { recursive: true });
    if (!existsSync(file)) writeFileSync(file, rendered.buffer);
    else if (hash(readFileSync(file)) !== sha256) throw new Error(`画像の置き場が不整合: ${path}`);
    const previous = reg.media.find(m => m.id === id);
    const row = { id, role: 'cover', type: 'image/png', sha256, bytes: rendered.buffer.length,
      width: rendered.provenance.width, height: rendered.provenance.height,
      store: { tier: 'drive', path },
      provenance: previous?.sha256 === sha256 && previous.provenance.kind === 'ai-generated' ? previous.provenance
        : { kind: 'template', by: 'youtube-covers', spec: `${s.designPath}#covers/${s.key}`, specSha256: coverInputDigest(spec) },
      legacyPaths: [...new Set([...(previous?.legacyPaths ?? []), previous?.store.path].filter(p => p && p !== path))] };
    if (!designs.has(s.designPath)) designs.set(s.designPath, readJson(root, s.designPath));
    spec.approvedImage = { path, sha256, specSha256: coverInputDigest(spec) };
    designs.get(s.designPath).covers[s.key] = spec;
    mediaRows.set(s.pub.exam, [...(mediaRows.get(s.pub.exam) ?? []), row]);
    pubRows.set(s.pub.exam, [...(pubRows.get(s.pub.exam) ?? []), { ...s.pub, media: { ...s.pub.media, cover: id } }]);
    if (!manifests.has(s.popPath)) manifests.set(s.popPath, existsSync(join(root, s.popPath)) ? readJson(root, s.popPath) : {
      policy: '.claude/knowledge/reference/pop-image-policy.md', designVersion: 'pop-20260927', channel: 'youtube', source: s.work.definition });
    const generation = generations.entries.find(e => e.pose === pose);
    const character = poses.poses.find(p => p.slug === pose);
    const m = manifests.get(s.popPath);
    const selectedArtwork = Boolean(spec.approvedImage) && row.provenance.kind === 'ai-generated';
    const entry = { publicationId: s.pub.id, copy: { exam: spec.exam, headline: spec.headline, benefit: spec.subtitle, authority: spec.pop.authority },
      evidence: [`${s.designPath}#covers/${s.key}`, s.pub.copy ?? `${s.work.definition}/storyboard.json`],
      references: [generations.reference, { path: `${poses.assetsDir}/${character.file}`, sha256: character.framing.source.sha256 }],
      prompt: selectedArtwork ? (m.prompt ?? row.provenance.prompt) : generation.prompt,
      promptScope: selectedArtwork ? '選択された表紙全体の生成。保存済みPNGの画素を保持。' : '共有する先生素材の生成。見出しは編集可能な原稿をレンダラーで組版。',
      format: { width: row.width, height: row.height }, render: { template: rendered.provenance.template, variant, pose },
      output: { path, sha256 }, review: { status: 'pending-image-review' },
      storage: { group: 'content-media', key: path }, publication: 'ローカル差し替え・外部未反映' };
    m.outputs = { ...m.outputs, [s.key]: entry };
    const slug = s.pub.id.replaceAll('/', '--');
    await sharp(rendered.buffer).resize({ width: 360 }).jpeg({ quality: 90 }).toFile(join(out, 'images', `${slug}.jpg`));
    const link = join(out, 'full', `${slug}.png`);
    if (existsSync(link) && readlinkSync(link) !== file) rmSync(link);
    if (!existsSync(link)) symlinkSync(file, link);
    results.push({ pubId: s.pub.id, exam: s.pub.exam, format: s.pub.format, status: s.pub.status, title: s.title,
      headline: spec.headline, variant, pose, path, sha256, bytes: row.bytes,
      thumbnail: `images/${slug}.jpg`, full: `full/${slug}.png` });
    if (results.length % 25 === 0) console.log(`表紙 ${results.length}/${sources.length}`);
  }
  if (commit) {
    for (const [path, value] of designs) writeJson(root, path, value);
    for (const [path, value] of manifests) writeJson(root, path, value);
    for (const [exam, rows] of mediaRows) upsertMedia(root, exam, rows);
    for (const [exam, rows] of pubRows) upsertPublications(root, 'youtube', exam, rows);
  }
  writeJson(root, relativePath(root, join(out, 'manifest.json')), { target: sources.length, generated: results.length, committed: commit, results });
  writePopGallery(root, results, out);
  console.log(JSON.stringify({ target: sources.length, generated: results.length, committed: commit, gallery: relativePath(root,join(out,'index.html')) }));
  return { sources, results, out };
}

/** Rebuild the review page from rendered assets without rendering images again. */
export function writePopGallery(root, results, out) {
  const qualifications = readDataset(root, 'config.qualification-registry');
  const label = id => qualificationShortLabel(qualifications, id);
  const cards = results.map((r,i) => `<article data-exam="${escapeHtml(r.exam)}" data-format="${r.format}" data-title="${escapeHtml(r.title)}" data-headline="${escapeHtml(r.headline.join(' '))}"><a href="${r.full}" target="_blank"><img loading="lazy" src="${r.thumbnail}" width="360" alt="${escapeHtml(r.headline.join(' '))}"></a><small>${i+1} · ${escapeHtml(label(r.exam))} · ${r.format === 'longform' ? '通常動画' : 'Shorts'}</small><p>${escapeHtml(r.title)}</p></article>`).join('\n');
  const options = [...new Set(results.map(r=>r.exam))].map(e=>`<option value="${escapeHtml(e)}">${escapeHtml(label(e))}</option>`).join('');
  writeFileSync(join(out, 'index.html'), `<!doctype html><html lang="ja"><meta charset="utf-8"><title>全動画 POP表紙</title><style>body{margin:0;background:#eef1f5;color:#192942;font:16px system-ui}header{position:sticky;top:0;background:white;padding:16px 24px;box-shadow:0 2px 8px #0002;z-index:1}h1{font-size:22px;margin:0 0 8px}select,input{font:inherit;margin-right:8px;padding:7px}main{display:grid;grid-template-columns:repeat(auto-fill,360px);gap:20px;padding:24px}article{background:white;padding-bottom:14px;border-radius:10px;overflow:hidden}img{display:block;width:360px;height:auto}p,small{display:block;margin:8px 12px}small{font-size:12px;color:#59677c}p{font-size:14px}article[hidden]{display:none}</style><header><h1>全動画のPOP表紙 · <span id="count">${results.length}</span>件</h1><select id="exam"><option value="">全資格</option>${options}</select><select id="format"><option value="">全形式</option><option value="longform">通常動画</option><option value="short">Shorts</option></select><input id="search" placeholder="題名・見出しで検索"><small>画像をクリックすると原寸表示。音声・字幕・動画本体は今回の一括制作では変更していません。</small></header><main>${cards}</main><script>const filters=['exam','format','search'].map(id=>document.getElementById(id));function update(){let n=0;document.querySelectorAll('article').forEach(a=>{a.hidden=(filters[0].value&&a.dataset.exam!==filters[0].value)||(filters[1].value&&a.dataset.format!==filters[1].value)||(filters[2].value&&!(a.textContent+' '+a.dataset.headline).includes(filters[2].value));if(!a.hidden)n++});document.getElementById('count').textContent=n}filters.forEach(x=>x.addEventListener('input',update));</script></html>`);
}
