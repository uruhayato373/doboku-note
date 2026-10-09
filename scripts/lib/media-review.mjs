/**
 * media-review.mjs — 管理画面の確認画面（/content/items）が出す形を、コンテンツ台帳から組み立てる唯一の実装
 * （content-registry.md「承認」・DN-0609）。画面は呼ぶだけで、判定（素材が手元か Drive か、承認が今の中身と合うか、
 * 次に打つコマンド）はここで決める。依存ゼロ（zod を読まない。管理画面から import する）。
 *
 * - 素材の出し先: 手元（.tmp/media/…・中身の bytes が台帳と同じ）→ /media/cmedia/…、無ければ Drive 台帳にある → /media/vault/…、
 *   どちらでもなければ「要復元」（src は null）。Drive の絶対パスは返さない（メールアドレスを含むため）。
 * - 承認: 画面確認（review.visual.digest）と最終承認（approval.contentSha256）を、今の中身から計算した値と比べ、無効になった理由を返す。
 */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { approvalHash, approvalParts, loadRegistry, loadRegistryConfig, publicationStage, resolveCopy, visualDigest } from './content-registry.mjs';
import { jstDayTime } from './jst-date.mjs';
import { MEDIA_ROOT } from './media-paths.mjs';

/** 画面確認（音声なし）で見る素材の役割。visualDigest はこの役割の sha を並べる（長尺のコンタクトシートは contact-sheet-2 以降に続く） */
export const VISUAL_ROLES = ['cover', 'cta', 'contact-sheet', 'preview', 'preview-metrics'];
export const isVisualRole = (role) => VISUAL_ROLES.includes(role) || /^contact-sheet-\d+$/.test(role);
/** 画面に出す順（画面が先、音声は後） */
const ROLE_ORDER = ['cover', 'cta', 'preview-metrics', 'contact-sheet', 'preview', 'video', 'subtitles'];
const roleRank = (role) => (ROLE_ORDER.includes(role) ? ROLE_ORDER.indexOf(role) : /^contact-sheet-\d+$/.test(role) ? ROLE_ORDER.indexOf('contact-sheet') + Number(role.split('-').pop()) / 1000 : ROLE_ORDER.length);

/**
 * 素材 1 件の出し先。
 * @param {string} root
 * @param {object} m 素材の行
 * @param {{ entries: Record<string, object> }|null} driveManifest
 * @returns {{ availability: 'local'|'vault'|'missing', src: string|null }}
 */
export function mediaSource(root, m, driveManifest) {
  const path = m.store?.path ?? '';
  if (m.store?.tier !== 'drive' || !path.startsWith(`${MEDIA_ROOT}/`)) return { availability: 'missing', src: null };
  const rel = path.slice(MEDIA_ROOT.length + 1);
  const url = (root_) => `/media/${root_}/${rel.split('/').map(encodeURIComponent).join('/')}`;
  const abs = join(root, path);
  if (existsSync(abs) && (!m.bytes || statSync(abs).size === m.bytes)) return { availability: 'local', src: url('cmedia') };
  const entry = driveManifest?.entries?.[path];
  if (entry && entry.sha256 === m.sha256) return { availability: 'vault', src: url('vault') };
  return { availability: 'missing', src: null };
}

/**
 * 素材の中身を文字列で読む（preview-metrics の JSON・字幕の .ass を画面に出すため）。手元か Drive のマウントから読み、
 * sha256 が台帳と違えば null。サーバー側でだけ使う（Drive の絶対パスを外へ出さない）。
 * @returns {Promise<string|null>}
 */
export async function readMediaText(root, m) {
  const { readFileSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { resolveVaultRoot, vaultAbsFor } = await import('./drive-vault.mjs');
  const path = m?.store?.path ?? '';
  if (!path.startsWith(`${MEDIA_ROOT}/`)) return null;
  const candidates = [join(root, path)];
  const vault = resolveVaultRoot();
  if (vault.root) candidates.push(vaultAbsFor(vault.root, `制作物/コンテンツ/${path.slice(MEDIA_ROOT.length + 1)}`));
  for (const abs of candidates) {
    if (!existsSync(abs)) continue;
    const buf = readFileSync(abs);
    if (createHash('sha256').update(buf).digest('hex') === m.sha256) return buf.toString('utf8');
  }
  return null;
}

/** 公開の行の素材の役割 → 画面確認の digest の材料（visual の役割で sha があるものだけ） */
function visualParts(pub, mediaById) {
  const parts = {};
  for (const [role, id] of Object.entries(pub.media ?? {})) {
    if (!isVisualRole(role)) continue;
    const sha = mediaById.get(id)?.sha256;
    if (sha) parts[role] = sha;
  }
  return parts;
}

/** 公開 1 件の承認の今の状態 */
export function approvalState(root, pub, mediaById) {
  const vParts = visualParts(pub, mediaById);
  const visualNow = Object.keys(vParts).length ? visualDigest(vParts) : null;
  const finalNow = approvalHash(approvalParts(root, pub, mediaById));
  const v = pub.review?.visual;
  const a = pub.approval;
  const visual = {
    status: v?.status ?? 'none',
    at: v?.at ?? null,
    digest: v?.digest ?? null,
    current: visualNow,
    valid: Boolean(v?.status === 'approved' && v.digest && v.digest === visualNow),
    reason: !v ? '画面確認をしていない' : v.status !== 'approved' ? '画面確認が承認されていない' : v.digest !== visualNow ? '承認した後に画面の素材（表紙・締め・コンタクトシート・プレビュー）が変わった' : null,
  };
  const final = {
    by: a?.by ?? null,
    at: a?.at ?? null,
    contentSha256: a?.contentSha256 ?? null,
    grandfathered: Boolean(a?.grandfathered),
    current: finalNow,
    valid: Boolean(a && (a.contentSha256 ? a.contentSha256 === finalNow : a.grandfathered)),
    reason: !a ? '最終承認をしていない' : a.contentSha256 ? (a.contentSha256 !== finalNow ? '承認した後に中身（文面・素材・予定）が変わった' : null) : 'ハッシュの無い承認（grandfathered）。中身の変化は見られない',
  };
  return { visual, final };
}

/** 公開 1 件で次に打つコマンド（画面はコピーするだけ。管理画面からは実行しない） */
export function nextCommands(pub, state) {
  const out = [];
  const isVideo = pub.channel === 'youtube';
  if (isVideo && !(pub.media?.['contact-sheet'] && pub.media?.preview)) {
    out.push({ label: '画面確認の素材を作る（音声なし）', cmd: `npm run media -- preview --pub ${pub.id} --commit` });
  }
  if (!state.visual.valid && state.visual.current) {
    out.push({ label: '画面確認を承認する', cmd: `npm run registry -- approve --pub ${pub.id} --stage visual --expect ${state.visual.current}` });
  }
  if (['qa_passed', 'approved', 'rendered'].includes(pub.status) && !state.final.valid) {
    out.push({ label: '最終承認する（完成版・文面・予定）', cmd: `npm run registry -- approve --pub ${pub.id} --stage final --expect ${state.final.current}` });
  }
  if (pub.status === 'stopped' && pub.stopReason === 'unverified-legacy') {
    out.push({ label: '証拠が見つかったら公開へ進める（照合）', cmd: 'npm run registry-reconcile -- --dry' });
  }
  return out;
}

/** 公開 1 件の画面の形 */
function publicationView(root, pub, mediaById, driveManifest) {
  const copy = resolveCopy(root, pub.copy);
  const media = Object.entries(pub.media ?? {})
    .map(([role, id]) => {
      const m = mediaById.get(id);
      if (!m) return { role, id, missingRow: true, availability: 'missing', src: null };
      return {
        role, id, type: m.type, sha256: m.sha256, bytes: m.bytes ?? null, width: m.width ?? null, height: m.height ?? null,
        durationSec: m.durationSec ?? null, provenance: m.provenance, ...mediaSource(root, m, driveManifest),
      };
    })
    .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.role.localeCompare(b.role));
  const state = approvalState(root, pub, mediaById);
  const when = pub.publishAt ? jstDayTime(pub.publishAt) : null;
  return {
    id: pub.id, channel: pub.channel, format: pub.format, variant: pub.variant ?? null, account: pub.account,
    status: pub.status, stage: publicationStage(pub.status), stopReason: pub.stopReason ?? null,
    publishAt: pub.publishAt ?? null, publishAtJst: when ? `${when.date}${when.time ? ` ${when.time}` : ''}` : null,
    platform: pub.platform ?? null, copy, copyRef: pub.copy ?? null, relatedTo: pub.relatedTo ?? null,
    media, approval: state, commands: nextCommands(pub, state),
    flags: flagsOf(pub, media, state),
  };
}

/** 一覧の絞り込みに使う印 */
function flagsOf(pub, media, state) {
  const flags = [];
  if (pub.status === 'stopped' && pub.stopReason === 'unverified-legacy') flags.push('要確認');
  if (media.some((m) => m.availability === 'missing')) flags.push('要復元');
  if (pub.status === 'published' && pub.approval?.contentSha256 && !state.final.valid) flags.push('要同期');
  if (['qa_passed', 'approved', 'rendered'].includes(pub.status) && !state.final.valid) flags.push('承認待ち');
  return flags;
}

/**
 * 作品 1 本の確認画面の形。
 * @param {string} root
 * @param {string} exam
 * @param {string} workId
 * @param {{ reg?: object, driveManifest?: object|null }} [opts]
 * @returns {object|null} 台帳に無ければ null
 */
export function workView(root, exam, workId, opts = {}) {
  const reg = opts.reg ?? loadRegistry(root);
  const work = reg.works.find((w) => w.id === workId && w.exam === exam);
  if (!work) return null;
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const pubs = reg.publications.filter((p) => p.work === workId && p.exam === exam);
  const channels = [];
  for (const channel of [...new Set(pubs.map((p) => p.channel))].sort()) {
    const list = pubs.filter((p) => p.channel === channel)
      .sort((a, b) => (a.format === 'longform' ? -1 : 0) - (b.format === 'longform' ? -1 : 0) || a.id.localeCompare(b.id))
      .map((p) => publicationView(root, p, mediaById, opts.driveManifest ?? null));
    channels.push({ channel, publications: list });
  }
  const main = pubs.find((p) => p.format === 'longform') ?? pubs[0];
  return {
    work: { id: work.id, exam, kind: work.kind, format: work.format ?? null, definition: work.definition, qa: work.qa ?? null, idException: work.idException ?? null },
    title: (main && resolveCopy(root, main.copy)?.title) ?? work.id,
    channels,
  };
}

/**
 * 一覧（/content/items）の行。1 作品 1 行。
 * @returns {{ rows: object[], counts: { works: number, publications: number } }}
 */
export function listView(root, opts = {}) {
  const reg = opts.reg ?? loadRegistry(root);
  const cfg = opts.cfg ?? loadRegistryConfig(root);
  const mediaById = new Map(reg.media.map((m) => [m.id, m]));
  const rows = reg.works.map((w) => {
    const pubs = reg.publications.filter((p) => p.work === w.id && p.exam === w.exam);
    const main = pubs.find((p) => p.format === 'longform') ?? pubs[0];
    const coverId = main?.media?.cover;
    const cover = coverId ? mediaById.get(coverId) : null;
    const flags = new Set();
    for (const p of pubs) {
      const media = Object.values(p.media ?? {}).map((id) => mediaById.get(id)).filter(Boolean).map((m) => mediaSource(root, m, opts.driveManifest ?? null));
      for (const f of flagsOf(p, media, approvalState(root, p, mediaById))) flags.add(f);
    }
    const byChannel = {};
    for (const p of pubs) {
      const s = (byChannel[p.channel] ??= {});
      s[p.status] = (s[p.status] ?? 0) + 1;
    }
    return {
      id: w.id, exam: w.exam, kind: w.kind, format: w.format ?? null,
      title: (main && resolveCopy(root, main.copy)?.title) ?? w.id,
      href: `/content/items/${encodeURIComponent(w.exam)}/${encodeURIComponent(w.id)}`,
      coverSrc: cover ? mediaSource(root, cover, opts.driveManifest ?? null).src : null,
      channels: Object.keys(byChannel).sort(), byChannel, flags: [...flags].sort(),
      statusOrder: Math.min(...pubs.map((p) => cfg.status.values.indexOf(p.status)).filter((n) => n >= 0), 99),
    };
  });
  rows.sort((a, b) => a.exam.localeCompare(b.exam) || a.id.localeCompare(b.id));
  return { rows, counts: { works: reg.works.length, publications: reg.publications.length } };
}
