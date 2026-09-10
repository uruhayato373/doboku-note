import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { IG_DESIGN, instagramRendererDigest } from './instagram-video-design.mjs';

export const CAMPAIGN_PATH = '.claude/config/instagram-campaign.json';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const json = path => JSON.parse(readFileSync(path, 'utf8'));
export function validateCampaign(plan) {
  if (plan.schemaVersion !== 1 || plan.account !== 'dobokunotecom' || plan.design !== IG_DESIGN || plan.productionFirst !== true) throw new Error('Instagram campaign契約が不正です');
  if (plan.expected?.topics !== 112 || plan.expected?.carousels !== 112 || plan.expected?.reels !== 224 || plan.topics?.length !== 112) throw new Error('承認範囲112テーマ/336投稿が欠けています');
  const ids = new Set(), paths = new Set();
  for (const t of plan.topics) {
    const key = `${t.exam}/${t.sourcePackId}`;
    if (ids.has(key) || t.reels?.length !== 2) throw new Error('テーマの重複またはリール不足');
    ids.add(key);
    for (const p of [t.carousel, ...t.reels]) {
      if (!/^content\/sns\/instagram\/video-packs\/[a-z0-9-]+\/[a-z0-9-]+$/.test(p) || paths.has(p)) throw new Error('投稿パスが不正・重複しています');
      paths.add(p);
    }
  }
  return plan;
}

export function buildInstagramSchedule(plan, { requireStart = false } = {}) {
  validateCampaign(plan);
  const cadence = plan.cadence;
  if (cadence?.timezone !== 'Asia/Tokyo' || cadence.maxPerDay !== 2 || cadence.sequence?.length !== 3) throw new Error('Instagram配信間隔の設定が不正です');
  const formats = new Set(), slots = new Set();
  for (const slot of cadence.sequence) {
    if (![0, 1].includes(slot.day) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(slot.time)
      || !['reel-1', 'carousel', 'reel-2'].includes(slot.format) || formats.has(slot.format) || slots.has(`${slot.day}/${slot.time}`)) throw new Error('Instagram投稿枠の重複・形式不正');
    formats.add(slot.format); slots.add(`${slot.day}/${slot.time}`);
  }
  if ([0, 1].some(day => cadence.sequence.filter(s => s.day === day).length > cadence.maxPerDay)) throw new Error('Instagramの日次投稿数を超えています');
  const start = cadence.startDate;
  if (!start && requireStart) throw new Error('既存予約と年度を確認し、Instagramキャンペーンの開始日を確定してください。旧動画の予約日は使いません。');
  let startMs = null;
  if (start) {
    startMs = Date.parse(`${start}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !Number.isFinite(startMs) || new Date(startMs).toISOString().slice(0, 10) !== start) throw new Error('Instagramの開始日が不正です');
  }
  return plan.topics.flatMap((topic, i) => cadence.sequence.map(slot => {
    const dayOffset = i * 2 + slot.day;
    const date = startMs === null ? null : new Date(startMs + dayOffset * 86400000).toISOString().slice(0, 10);
    return { path: slot.format === 'carousel' ? topic.carousel : topic.reels[slot.format === 'reel-1' ? 0 : 1],
      sourcePackId: topic.sourcePackId, exam: topic.exam, format: slot.format === 'carousel' ? 'carousel' : 'reel',
      dayOffset, time: slot.time, publishAt: date ? `${date}T${slot.time}:00+09:00` : null,
      timeSensitive: topic.timeSensitive === true };
  })).sort((a, b) => a.dayOffset - b.dayOffset || a.time.localeCompare(b.time));
}

export function inspectCampaign(root, { media = false, archived = {} } = {}) {
  const plan = validateCampaign(json(join(root, CAMPAIGN_PATH)));
  const rendererHashes = Object.fromEntries(['carousel', 'reel'].map(type => [type, instagramRendererDigest(root, type)]));
  const rows = [];
  const assetMatches = (asset) => {
    const path = join(root, asset.path);
    if (existsSync(path)) return !media || sha256(readFileSync(path)) === asset.sha256;
    return archived[asset.path]?.sha256 === asset.sha256;
  };
  for (const topic of plan.topics) for (const [type, dir] of [['carousel', topic.carousel], ...topic.reels.map(p => ['reel', p])]) {
    const problems = [], abs = join(root, dir);
    const source = join(abs, type === 'carousel' ? 'slide-data.json' : 'reels/script.json');
    const caption = join(abs, type === 'carousel' ? 'carousel/caption.txt' : 'reels/caption.txt');
    const record = join(abs, type === 'carousel' ? 'carousel/render.json' : 'reels/meta.json');
    if (!existsSync(source)) problems.push('原稿なし');
    if (!existsSync(caption)) problems.push('キャプションなし');
    else {
      const value = readFileSync(caption, 'utf8');
      const tags = value.match(/#[^\s#]+/gu) ?? [];
      if (tags.length < 1 || tags.length > 5) problems.push('タグ数は1〜5件');
      if (!value.includes('プロフィール') || !value.includes(type === 'reel' ? 'フォロー' : '保存')) problems.push('CTA不足');
      if (/#Shorts|概要欄|関連動画|https?:\/\//u.test(value)) problems.push('他媒体向けの誘導');
    }
    let assets = [];
    if (!existsSync(record)) problems.push('未レンダー');
    else {
      const r = json(record);
      if (r.design !== IG_DESIGN) problems.push('旧デザイン');
      if (r.rendererSha256 !== rendererHashes[type]) problems.push('テンプレート変更後に未レンダー');
      if (existsSync(source) && (type === 'carousel' ? r.sourceSha256 : r.scriptSha256) !== sha256(readFileSync(source))) problems.push('原稿変更後に未レンダー');
      if (type === 'carousel') {
        assets = r.images ?? [];
        if (assets.length < 6 || assets.length > 10 || (existsSync(source) && assets.length !== json(source).slides.length)) problems.push('画像枚数不一致');
      } else {
        assets = [{ path: `${dir}/reels/video.mp4`, sha256: r.sha256 }, { path: `${dir}/reels/cover.png`, sha256: r.coverSha256 }];
        if (!(r.durationSeconds >= 30 && r.durationSeconds <= 60) || r.validation?.fullDecode !== true || r.validation?.audio !== true) problems.push('動画検証未完了');
      }
      if (!assets.length || assets.some(a => !a.sha256 || !assetMatches(a))) problems.push('素材欠落・SHA不一致');
    }
    rows.push({ type, path: dir, sourcePackId: topic.sourcePackId, exam: topic.exam, ready: !problems.length, problems, assets });
  }
  const counts = { topics: plan.topics.length, carousels: rows.filter(r => r.type === 'carousel' && r.ready).length,
    reels: rows.filter(r => r.type === 'reel' && r.ready).length, total: rows.length, ready: rows.filter(r => r.ready).length };
  return { schemaVersion: 1, campaign: plan.id, checkedAt: new Date().toISOString(), mediaChecked: media,
    complete: rows.length === 336 && rows.every(r => r.ready), counts, rows };
}

export function assertInstagramPublicationReady(root) {
  if (!existsSync(join(root, CAMPAIGN_PATH))) return;
  const plan = validateCampaign(json(join(root, CAMPAIGN_PATH)));
  if (!plan.publicationEnabled) throw new Error('全件制作を先に完了する運用です。instagram-campaign --check --media と既存予約の照合後に配信を有効化してください。');
  const schedule = buildInstagramSchedule(plan, { requireStart: true });
  const archive = join(root, '.claude/state/assets/drive-manifest.json');
  const result = inspectCampaign(root, { media: true, archived: existsSync(archive) ? json(archive).entries : {} });
  if (!result.complete) throw new Error(`Instagram全件制作未完了: ${result.counts.ready}/336。部分的に投稿を始めません。`);
  return { plan, schedule, result };
}
