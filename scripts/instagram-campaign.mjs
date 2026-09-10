#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPAIGN_PATH, inspectCampaign, json, validateCampaign } from './lib/instagram-campaign.mjs';
import { IG_DESIGN } from './lib/instagram-video-design.mjs';
import { loadDriveManifest } from './lib/drive-vault.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
const base = 'content/sns/instagram/video-packs';
if (args.includes('--prepare')) {
  if (existsSync(join(root, CAMPAIGN_PATH))) throw new Error('既存の固定計画は上書きしません');
  const byTopic = new Map();
  for (const exam of readdirSync(join(root, base)).sort()) for (const name of readdirSync(join(root, base, exam)).sort()) {
    const dir = `${base}/${exam}/${name}`, file = join(root, dir, 'reels/meta.json');
    if (!existsSync(file)) continue;
    const m = json(file), key = `${exam}/${m.sourcePackId}`;
    if (!byTopic.has(key)) {
      const manifest = json(join(root, 'content/sns/video-packs', exam, m.sourcePackId, 'video-pack.json'));
      byTopic.set(key, { exam, sourcePackId: m.sourcePackId, title: manifest.title,
        carousel: `${base}/${exam}/${m.sourcePackId}`, reels: [], timeSensitive: /R0?8|令和8|直前|予想|重点/u.test(manifest.title) });
    }
    byTopic.get(key).reels.push(dir);
  }
  const groups = [...new Set([...byTopic.values()].map(t => t.exam))].map(exam => [...byTopic.values()].filter(t => t.exam === exam));
  const topics = [];
  while (groups.some(g => g.length)) for (const group of groups) if (group.length) topics.push(group.shift());
  const plan = validateCampaign({ schemaVersion: 1, id: 'instagram-bridge-notebook-a-20260910', account: 'dobokunotecom', design: IG_DESIGN,
    productionFirst: true, publicationEnabled: false, approvedAt: '2026-09-10', expected: { topics: 112, carousels: 112, reels: 224 },
    cadence: { maxPerDay: 2, timezone: 'Asia/Tokyo', startDate: null, sequence: [
      { day: 0, time: '12:30', format: 'reel-1' }, { day: 1, time: '12:30', format: 'carousel' }, { day: 1, time: '19:00', format: 'reel-2' }],
      note: '1テーマを2日で展開。資格を交互に配置。開始日は全件完成後の既存予約照合で確定し、年度・直前対策は公開前に適用年度を再確認する。' }, topics });
  writeFileSync(join(root, CAMPAIGN_PATH), JSON.stringify(plan, null, 2) + '\n');
  console.log('固定計画: 112テーマ、カルーセル112投稿、リール224本。制作完了前の配信を停止。');
}
if (args.includes('--check')) {
  const result = inspectCampaign(root, { media: args.includes('--media'), archived: loadDriveManifest().entries });
  writeFileSync(join(root, '.claude/state/instagram-campaign.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ complete: result.complete, counts: result.counts, problems: result.rows.filter(r => !r.ready).slice(0, 8).map(r => ({ path: r.path, problems: r.problems })) }, null, 2));
  if (!result.complete) process.exitCode = 1;
}
if (args.includes('--gallery')) {
  const plan = validateCampaign(json(join(root, CAMPAIGN_PATH)));
  const progress = inspectCampaign(root);
  const readiness = new Map(progress.rows.map(row => [row.path, row.ready]));
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const url = p => `file://${encodeURI(join(root, p))}`;
  const cards = plan.topics.map((t, i) => {
    const record = join(root, t.carousel, 'carousel/render.json');
    const images = readiness.get(t.carousel) && existsSync(record) ? json(record).images : [];
    return `<article data-exam="${esc(t.exam)}"><span class="number">${String(i + 1).padStart(3, '0')}</span><h2>${esc(t.title)}</h2><p>${esc(t.exam)}${t.timeSensitive ? ' · 公開前に年度を確認' : ''}</p><details><summary>カルーセル ${images.length}枚</summary><div class="slides">${images.map(im => `<a href="${url(im.path)}"><img loading="lazy" src="${url(im.path)}"></a>`).join('')}</div><pre>${esc(existsSync(join(root, t.carousel, 'carousel/caption.txt')) ? readFileSync(join(root, t.carousel, 'carousel/caption.txt'), 'utf8') : '原稿制作中')}</pre></details>${t.reels.map(d => { const caption = readFileSync(join(root, d, 'reels/caption.txt'), 'utf8'); return `<details><summary>リール：${esc(caption.split('\n')[0])}</summary>${readiness.get(d) ? `<video controls preload="none" poster="${url(d + '/reels/cover.png')}" src="${url(d + '/reels/video.mp4')}"></video>` : '<p>動画を生成・確認中です。</p>'}<pre>${esc(caption)}</pre></details>`; }).join('')}</article>`;
  }).join('');
  const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>doboku-note｜Instagram制作一覧</title><style>body{margin:0;background:#f1f6fc;color:#0f2742;font:16px system-ui}header,main{max-width:1120px;margin:auto;padding:32px}header{border-top:12px solid #1858b5}h1{font-size:36px;margin-bottom:12px}h2{font-size:21px}header p{line-height:1.8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}article{background:white;border:1px solid #d8e3f1;border-radius:16px;padding:24px}.number{font-weight:bold;color:#1858b5}summary{cursor:pointer;padding:16px 0;border-top:1px solid #ddd}.slides{display:flex;gap:12px;overflow-x:auto}.slides img{width:270px}video{width:100%;max-height:600px}pre{white-space:pre-wrap;font:14px/1.8 system-ui}select{padding:12px;border-radius:8px;border:1px solid #1858b5}</style><header><h1>Instagram制作一覧</h1><p>完成：カルーセル ${progress.counts.carousels}/112 投稿 · リール ${progress.counts.reels}/224 本</p><p>A案ロゴと読みやすい見出しで、112テーマを336投稿に。<br>すべての制作・検査を終えてから配信します。1日1〜2本を目安に、リール→保存用カルーセル→別論点リールの順で展開。開始日は既存予約との照合後に確定します。</p><select onchange="document.querySelectorAll('article').forEach(a=>a.hidden=this.value&&a.dataset.exam!==this.value)"><option value="">すべての資格</option>${[...new Set(plan.topics.map(t => t.exam))].map(exam => `<option>${esc(exam)}</option>`).join('')}</select></header><main class="grid">${cards}</main></html>`;
  const out = join(root, '.tmp/instagram-campaign/gallery.html'); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, html); console.log(out);
}
if (!args.some(a => ['--prepare', '--check', '--gallery'].includes(a))) console.log('Usage: node scripts/instagram-campaign.mjs --prepare | --check [--media] | --gallery');
