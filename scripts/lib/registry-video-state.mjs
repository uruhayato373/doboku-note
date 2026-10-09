/**
 * registry-video-state.mjs — 動画パックの YouTube の状態を、コンテンツ台帳（content/registry）と
 * 派生物の形（{ packs: { [packId]: { derivatives: { longform, shorts } } } }）の間で写す唯一の実装（content-registry.md「YouTube の切り替え」）。
 *
 * - 写しのファイル（.claude/state/video-content-status.json）は 2026-10-09 に消した。台帳（content/registry）だけが正本。
 * - 読み手・書き手（publish-video-pack.cjs・prepare-youtube-longforms など）は loadVideoState（台帳だけから作る）で読み、
 *   saveVideoState で台帳の行へ書く。ファイルは読まない・書かない。
 * - 変換は欠けなく往復する（derivativeToRow → rowToDerivative で元に戻る）。知らない欄は黙って落とさず投げる。
 * - 派生物の無い公開（作っていない Shorts など）は「素の下書き」の行として台帳にだけ置き、今の台帳には書かない。
 * - Instagram のリール（instagramReel）の状態は台帳（content/registry/publications/instagram）が正本（P5）。今の台帳は作り直すときに instagramReel を落とす。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalJson, idShapeIssues, loadRegistry, loadRegistryConfig, pubIdOf } from './content-registry.mjs';
import { readJsonIf } from './json-io.mjs';

/** 今の台帳の派生物の欄（この並びで書き出す）。ここに無い欄が来たら投げる */
const DERIVATIVE_KEYS = [
  'key', 'status', 'qa', 'approvedBy', 'approvedAt', 'publishAt', 'renderedAt', 'videoId', 'url', 'uploadedAt', 'scheduledAt',
  'publishedAt', 'privacyStatus', 'relatedVideoId', 'desiredRelatedVideoId', 'productionDisclosure', 'containsSyntheticMedia',
  'metadataSyncedAt', 'thumbnailStatus', 'thumbnailSetAt', 'thumbnailUpdate',
];
const KNOWN = new Set(DERIVATIVE_KEYS);
/** 台帳の行のうち、派生物から作る欄（それ以外の copy・media・review・relatedTo・evidence などは台帳だけの欄で残す） */
const MAPPED_ROW_KEYS = ['status', 'publishAt', 'approval', 'times', 'disclosure', 'thumbnail'];
const MAPPED_PLATFORM_KEYS = ['id', 'url', 'privacy', 'publishedAt', 'relatedVideoId', 'desiredRelatedVideoId'];
const BARE_DRAFT_KEYS = new Set(['id', 'work', 'account', 'format', 'variant', 'status', 'copy', 'relatedTo', 'media', 'review', 'idException', 'legacyKey', 'campaigns', 'definition', 'file', 'exam', 'channel']);

const compact = (o) => {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  return Object.keys(out).length ? out : undefined;
};

/**
 * 派生物 1 件 → 台帳の公開の行。base（台帳の今の行か骨組み）の台帳だけの欄は残す。
 * @param {object} d 今の台帳の派生物（longform か shorts の 1 件）
 * @param {object} base
 * @param {{ evidence?: { kind: string, ref: string } }} [opts] published に証拠が無いときに付ける証拠
 */
export function derivativeToRow(d, base, opts = {}) {
  const unknown = Object.keys(d).filter((k) => !KNOWN.has(k));
  if (unknown.length) throw new Error(`${base.id}: 今の台帳の知らない欄（registry-video-state.mjs の DERIVATIVE_KEYS に足す）: ${unknown.join(', ')}`);
  if (d.approvedBy !== undefined && d.approvedBy !== 'user') throw new Error(`${base.id}: approvedBy は user だけ: ${d.approvedBy}`);
  const row = Object.fromEntries(Object.entries(base).filter(([k]) => !MAPPED_ROW_KEYS.includes(k)));
  row.status = d.status;
  if (d.publishAt !== undefined) row.publishAt = d.publishAt;
  if (d.approvedBy === 'user') {
    const kept = base.approval && base.approval.at === d.approvedAt ? base.approval : null;
    row.approval = kept ?? compact({ by: 'user', at: d.approvedAt, contentSha256: null, grandfathered: true });
  }
  const evidence = base.platform?.evidence ?? (d.status === 'published' ? opts.evidence : undefined);
  const platform = compact({
    ...Object.fromEntries(Object.entries(base.platform ?? {}).filter(([k]) => !MAPPED_PLATFORM_KEYS.includes(k) && k !== 'evidence')),
    id: d.videoId, url: d.url, privacy: d.privacyStatus, publishedAt: d.publishedAt,
    relatedVideoId: d.relatedVideoId, desiredRelatedVideoId: d.desiredRelatedVideoId, evidence,
  });
  if (platform) row.platform = platform; else delete row.platform;
  const times = compact({ rendered: d.renderedAt, uploaded: d.uploadedAt, scheduled: d.scheduledAt, metadataSynced: d.metadataSyncedAt });
  if (times) row.times = times;
  const disclosure = compact({ production: d.productionDisclosure, syntheticMedia: d.containsSyntheticMedia });
  if (disclosure) row.disclosure = disclosure;
  const thumbnail = compact({ status: d.thumbnailStatus, setAt: d.thumbnailSetAt, update: d.thumbnailUpdate });
  if (thumbnail) row.thumbnail = thumbnail;
  return row;
}

/** 台帳の行 → 今の台帳の派生物。qa は作品の行から（通常動画だけ） */
export function rowToDerivative(row, work) {
  const v = {
    key: row.format === 'short' ? row.variant : undefined,
    status: row.status,
    qa: row.format === 'longform' ? work?.qa : undefined,
    approvedBy: row.approval?.by, approvedAt: row.approval?.at, publishAt: row.publishAt,
    renderedAt: row.times?.rendered, videoId: row.platform?.id, url: row.platform?.url, uploadedAt: row.times?.uploaded,
    scheduledAt: row.times?.scheduled, publishedAt: row.platform?.publishedAt, privacyStatus: row.platform?.privacy,
    relatedVideoId: row.platform?.relatedVideoId, desiredRelatedVideoId: row.platform?.desiredRelatedVideoId,
    productionDisclosure: row.disclosure?.production, containsSyntheticMedia: row.disclosure?.syntheticMedia,
    metadataSyncedAt: row.times?.metadataSynced, thumbnailStatus: row.thumbnail?.status, thumbnailSetAt: row.thumbnail?.setAt,
    thumbnailUpdate: row.thumbnail?.update,
  };
  return Object.fromEntries(DERIVATIVE_KEYS.filter((k) => v[k] !== undefined).map((k) => [k, v[k]]));
}

/** 派生物の無い公開（台帳にだけ置く下書き）か */
export function isBareDraft(row) {
  return row.status === 'draft' && Object.keys(row).every((k) => BARE_DRAFT_KEYS.has(k));
}

/** 中身が下書きの状態だけの派生物（素の下書きと同じ扱い） */
const isBareDerivative = (d, kind) => d.status === 'draft' && Object.keys(d).every((k) => k === 'status' || (kind === 'short' && k === 'key'));

/**
 * 動画パック 1 本の作品・公開の行。台帳の今の行を土台に、今の台帳の派生物を写す。
 * 派生物の無い通常動画・Shorts（outputs・youtube.json にあるもの）は素の下書きの行にする。
 * @param {{ state: object|null, rules: object, reg?: { works: object[], publications: object[] }, evidence?: object }} ctx
 */
export function videoPackRows(root, packDir, { state, rules, reg, evidence }) {
  const manifest = JSON.parse(readFileSync(join(root, packDir, 'video-pack.json'), 'utf8'));
  const youtube = readJsonIf(root, `${packDir}/youtube.json`);
  const exam = manifest.exam;
  const workId = manifest.packId;
  const d = state?.packs?.[workId]?.derivatives ?? {};
  const regWork = reg?.works.find((w) => w.id === workId);
  const regPub = (id) => reg?.publications.find((p) => p.id === id);
  const strip = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));

  const work = regWork ? strip(regWork) : { id: workId, kind: 'video-pack', definition: packDir };
  if (!regWork) {
    if (existsSync(join(root, packDir, 'compilation.json'))) work.format = 'compilation';
    if (idShapeIssues('work', workId, rules).length) work.idException = 'imported-before-cutover';
  }
  if (d.longform?.qa) work.qa = d.longform.qa; else delete work.qa;

  const publications = [];
  const longformId = pubIdOf({ exam, work: workId, channel: 'youtube', format: 'longform' });
  if (manifest.outputs?.longform || d.longform) {
    const skeleton = { id: longformId, work: workId, account: 'youtube:main', format: 'longform', status: 'draft' };
    if (youtube?.longform) skeleton.copy = `${packDir}/youtube.json#longform`;
    const base = regPub(longformId) ? strip(regPub(longformId)) : skeleton;
    const l = d.longform && !isBareDerivative(d.longform, 'longform') ? d.longform : null;
    publications.push(l ? derivativeToRow(Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'qa')), base, { evidence }) : bareOf(base));
  }

  const shortKeys = new Set([...(youtube?.shorts ?? []).map((s) => s.key), ...(d.shorts ?? []).map((s) => s.key)]);
  for (const key of [...shortKeys].sort()) {
    const id = pubIdOf({ exam, work: workId, channel: 'youtube', format: 'short', variant: key });
    const skeleton = { id, work: workId, account: 'youtube:main', format: 'short', variant: key, status: 'draft' };
    if ((youtube?.shorts ?? []).some((x) => x.key === key)) skeleton.copy = `${packDir}/youtube.json#shorts/${key}`;
    if (manifest.outputs?.longform) skeleton.relatedTo = longformId;
    if (idShapeIssues('variant', key, rules).length) skeleton.idException = 'imported-before-cutover';
    const base = regPub(id) ? strip(regPub(id)) : skeleton;
    const s = (d.shorts ?? []).find((x) => x.key === key);
    publications.push(s && !isBareDerivative(s, 'short') ? derivativeToRow(s, base, { evidence }) : bareOf(base));
  }
  return { exam, work, publications };
}

/** 行から派生物由来の欄を落とした素の下書き */
function bareOf(base) {
  const row = Object.fromEntries(Object.entries(base).filter(([k]) => BARE_DRAFT_KEYS.has(k)));
  row.status = 'draft';
  return row;
}

/**
 * 台帳から今の台帳（YouTube の部分）を作る。file の YouTube 以外の欄と、パック・Shorts の並びは残す。
 * @param {object|null} file 今の台帳の中身
 * @param {{ works: object[], publications: object[] }} reg
 */
export function projectVideoState(file, reg) {
  const out = structuredClone(file ?? { schemaVersion: 1, packs: {} });
  out.packs ??= {};
  // Instagram のリールの状態は Instagram の台帳が正本。今の台帳には残さない
  for (const [packId, pack] of Object.entries(out.packs)) {
    if (!pack?.derivatives || !('instagramReel' in pack.derivatives)) continue;
    delete pack.derivatives.instagramReel;
    if (!Object.keys(pack.derivatives).length) delete out.packs[packId];
  }
  const workById = new Map(reg.works.filter((w) => w.kind === 'video-pack').map((w) => [w.id, w]));
  const pubsByWork = new Map();
  for (const p of reg.publications.filter((x) => x.channel === 'youtube' && workById.has(x.work))) {
    pubsByWork.set(p.work, [...(pubsByWork.get(p.work) ?? []), p]);
  }
  for (const [workId, pubs] of pubsByWork) {
    const work = workById.get(workId);
    const longformRow = pubs.find((p) => p.format === 'longform');
    const shortRows = pubs.filter((p) => p.format === 'short' && !isBareDraft(p));
    // 素の下書きの通常動画も QA の記録があれば今の台帳に出す（qa_passed より前の draft で QA だけ付いたもの）
    const longform = longformRow && (!isBareDraft(longformRow) || work.qa) ? rowToDerivative(longformRow, work) : null;
    const hasAny = longform || shortRows.length;
    if (!hasAny && !out.packs[workId]) continue;
    out.packs[workId] ??= { derivatives: {} };
    const derivatives = (out.packs[workId].derivatives ??= {});
    if (longform) derivatives.longform = longform; else delete derivatives.longform;
    if (shortRows.length) {
      const order = (derivatives.shorts ?? []).map((s) => s.key);
      const rank = (k) => (order.includes(k) ? order.indexOf(k) : order.length);
      derivatives.shorts = shortRows
        .sort((a, b) => rank(a.variant) - rank(b.variant) || a.variant.localeCompare(b.variant))
        .map((p) => rowToDerivative(p, work));
    } else delete derivatives.shorts;
    if (!Object.keys(derivatives).length) delete out.packs[workId];
  }
  return out;
}

/** 今の台帳の YouTube の部分を比べられる形にする（素の下書き・Shorts の並びの差は無視） */
export function youtubeView(file) {
  const out = {};
  for (const [packId, pack] of Object.entries(file?.packs ?? {})) {
    const d = pack?.derivatives ?? {};
    const longform = d.longform && !isBareDerivative(d.longform, 'longform') ? d.longform : null;
    const shorts = (d.shorts ?? []).filter((s) => !isBareDerivative(s, 'short')).sort((a, b) => a.key.localeCompare(b.key));
    if (longform || shorts.length) out[packId] = { longform, shorts };
  }
  return out;
}

/**
 * 今の台帳と、台帳から作った今の台帳の、YouTube の部分の食い違い（R09）。
 * @returns {{ packId: string, what: string }[]}
 */
export function videoStateDrift(file, reg) {
  const a = youtubeView(file);
  const b = youtubeView(projectVideoState(file, reg));
  const out = [];
  for (const packId of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[packId];
    const y = b[packId];
    if (!x) { out.push({ packId, what: '台帳にだけある' }); continue; }
    if (!y) { out.push({ packId, what: '今の台帳にだけある' }); continue; }
    if (canonicalJson(x.longform) !== canonicalJson(y.longform)) out.push({ packId, what: `longform: ${diffKeys(x.longform, y.longform)}` });
    const keys = new Set([...x.shorts.map((s) => s.key), ...y.shorts.map((s) => s.key)]);
    for (const k of keys) {
      const sx = x.shorts.find((s) => s.key === k);
      const sy = y.shorts.find((s) => s.key === k);
      if (canonicalJson(sx ?? null) !== canonicalJson(sy ?? null)) out.push({ packId, what: `short ${k}: ${sx && sy ? diffKeys(sx, sy) : sx ? '今の台帳にだけある' : '台帳にだけある'}` });
    }
  }
  return out;
}

function diffKeys(x, y) {
  const keys = new Set([...Object.keys(x ?? {}), ...Object.keys(y ?? {})]);
  return [...keys].filter((k) => canonicalJson(x?.[k]) !== canonicalJson(y?.[k])).join(', ') || '(なし)';
}

// ---- 書き手の入口 ------------------------------------------------------------------------------------

/** 読み手・書き手が読む動画パックの派生物の形。台帳（content/registry）だけから作る（ファイルは読まない） */
export function loadVideoState(root) {
  return projectVideoState(null, loadRegistry(root));
}

/**
 * 動画パックの行を台帳の今の行と比べ、変わる行だけを資格ごとに集める（書かない）。
 * @param {string} root
 * @param {object|null} state 今の台帳の中身
 * @param {{ packIds?: string[], evidence: { kind: string, ref: string } }} opts packIds が無ければ今の台帳にある全パック
 */
export async function planVideoRows(root, state, { packIds, evidence }) {
  const { discoverVideoPacks } = await import('./content-registry-check.mjs');
  const cfg = loadRegistryConfig(root);
  const reg = loadRegistry(root);
  const packs = discoverVideoPacks(root);
  const works = new Map();
  const publications = new Map();
  const counts = { packs: 0, works: 0, publications: 0, unchangedPublications: 0 };
  const add = (map, exam, row) => map.set(exam, [...(map.get(exam) ?? []), row]);
  for (const packId of packIds ?? Object.keys(state?.packs ?? {})) {
    const pack = packs.get(packId);
    if (!pack) throw new Error(`${packId}: 動画パックのフォルダ（video-pack.json）が無い`);
    const rows = videoPackRows(root, pack.dir, { state, rules: cfg.idRules, reg, evidence });
    counts.packs += 1;
    const curWork = reg.works.find((w) => w.id === packId);
    if (!curWork || canonicalJson(strip(curWork)) !== canonicalJson(rows.work)) { add(works, rows.exam, rows.work); counts.works += 1; }
    for (const row of rows.publications) {
      const cur = reg.publications.find((p) => p.id === row.id);
      if (cur && canonicalJson(strip(cur)) === canonicalJson(row)) { counts.unchangedPublications += 1; continue; }
      add(publications, rows.exam, row);
      counts.publications += 1;
    }
  }
  return { works, publications, counts };
}

/** planVideoRows の結果を台帳へ書く */
export async function applyVideoRows(root, plan) {
  const { upsertPublications, upsertWorks } = await import('./content-registry-write.mjs');
  for (const [exam, rows] of plan.works) upsertWorks(root, exam, rows);
  for (const [exam, rows] of plan.publications) upsertPublications(root, 'youtube', exam, rows);
}

/**
 * 書き手が書く。state の YouTube の派生物を台帳の行へ写して書く（変わった行だけ。ファイルは書かない）。
 * 台帳の型（zod）を読むので、書き込み側（dataset-write.mjs）は呼んだときに読み込む。
 * @param {string} root
 * @param {object} state 書き手が変えた今の台帳
 * @param {{ writer: string, packIds?: string[] }} opts packIds を渡すとそのパックだけ写す
 * @returns {Promise<{ works: number, publications: number }>} 書いた行の数
 */
export async function saveVideoState(root, state, { writer, packIds } = {}) {
  if (!writer) throw new Error('saveVideoState: writer（書いたスクリプトの名前）が要る');
  const targets = (packIds ?? Object.keys(state?.packs ?? {})).filter((id) => {
    const d = state?.packs?.[id]?.derivatives;
    return d?.longform || d?.shorts?.length;
  });
  const plan = await planVideoRows(root, state, { packIds: targets, evidence: { kind: 'publisher', ref: writer } });
  await applyVideoRows(root, plan);
  return { works: plan.counts.works, publications: plan.counts.publications };
}

const strip = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !['file', 'exam', 'channel', 'scope'].includes(k)));
