/**
 * content-registry.mjs — コンテンツ台帳（content/registry）の読み込み・ID・承認ハッシュ・状態の唯一の実装。
 * 設計は .claude/knowledge/reference/content-registry.md。CLI（scripts/registry.mjs・scripts/media.mjs）・検査
 * （content-registry-check.mjs）・管理画面が同じ関数を使う。依存ゼロ（zod は書き込み側の content-registry-write.mjs だけ）。
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetDir } from './datasets.mjs';
import { readDataset } from './dataset-io.mjs';
import { videoStatusToStage } from './content-lifecycle.mjs';

export const CHANNEL_DATASET = {
  youtube: 'registry.youtube',
  instagram: 'registry.instagram',
  x: 'registry.x',
  threads: 'registry.threads',
  tiktok: 'registry.tiktok',
};

export function loadRegistryConfig(root) {
  return readDataset(root, 'config.content-registry');
}

function jsonFiles(root, dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).filter((f) => f.endsWith('.json')).sort();
}

/**
 * 台帳の全行を読む。各行に、どのファイルから来たか（file）と資格（exam）・チャネル（channel）を添える。
 * @returns {{ works: object[], publications: object[], media: object[], files: string[] }}
 */
export function loadRegistry(root) {
  const works = [];
  const publications = [];
  const media = [];
  const files = [];
  for (const name of jsonFiles(root, datasetDir('registry.works'))) {
    const doc = readDataset(root, 'registry.works', { values: { name } });
    const file = `${datasetDir('registry.works')}/${name}`;
    files.push(file);
    for (const w of doc.works) works.push({ ...w, exam: doc.exam, file });
  }
  for (const [channel, id] of Object.entries(CHANNEL_DATASET)) {
    for (const name of jsonFiles(root, datasetDir(id))) {
      const doc = readDataset(root, id, { values: { name } });
      const file = `${datasetDir(id)}/${name}`;
      files.push(file);
      for (const p of doc.publications) publications.push({ ...p, exam: doc.exam, channel: doc.channel ?? channel, file });
    }
  }
  for (const name of jsonFiles(root, datasetDir('registry.media'))) {
    const doc = readDataset(root, 'registry.media', { values: { name } });
    const file = `${datasetDir('registry.media')}/${name}`;
    files.push(file);
    for (const m of doc.media) media.push({ ...m, scope: doc.scope, file });
  }
  return { works, publications, media, files };
}

// ---- ID ------------------------------------------------------------------------------------------

const PUB_RE = /^([a-z0-9-]+)\/([a-z0-9-]+)\/([a-z]+)\.([a-z]+)(?:\.([a-z0-9-]+))?$/;

/** 公開 ID を分解する。形が違えば null */
export function parsePubId(id) {
  const m = PUB_RE.exec(id ?? '');
  if (!m) return null;
  const [, exam, work, channel, format, variant] = m;
  return { exam, work, channel, format, variant: variant ?? null };
}

export function pubIdOf({ exam, work, channel, format, variant }) {
  return `${exam}/${work}/${channel}.${format}${variant ? `.${variant}` : ''}`;
}

export function mediaIdOf(pubId, role) {
  return `${pubId}/${role}`;
}

/**
 * 新しい ID の形を検査する（kind は work・variant・role）。idException のある行は呼び手が飛ばす。
 * @returns {string[]} 違反の説明（空なら合格）
 */
export function idShapeIssues(kind, value, rules) {
  const out = [];
  if (!new RegExp(rules[kind]).test(value ?? '')) out.push(`${kind} の形（${rules[kind]}）に合わない: ${value}`);
  for (const f of rules.forbidden) if (new RegExp(f).test(value ?? '')) out.push(`${kind} に使わない形（${f}）を含む: ${value}`);
  return out;
}

// ---- 状態 ----------------------------------------------------------------------------------------

/** 状態の順位（承認以降の判定に使う）。語彙に無ければ -1 */
export function statusRank(cfg, status) {
  return cfg.status.values.indexOf(status);
}

/** 承認の欄が要る状態か（approved 以降。stopped と failed は経緯により無いことがある） */
export function requiresApproval(cfg, status) {
  if (status === 'stopped' || status === 'failed') return false;
  return statusRank(cfg, status) >= statusRank(cfg, cfg.status.approvalRequiredFrom);
}

export function canTransition(cfg, from, to) {
  return (cfg.status.transitions[from] ?? []).includes(to);
}

/** 公開の状態 → content-lifecycle の段階（全チャネル共通の 1 本の写像） */
export function publicationStage(status) {
  return videoStatusToStage(status, true);
}

// ---- 承認ハッシュ（CLI・検査・管理画面が同じ関数を使う） ------------------------------------------------

/** キーを並べ替えた JSON（同じ中身は同じ文字列になる） */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

const sha256Hex = (text) => createHash('sha256').update(text).digest('hex');

/** 時刻を比べられる形（UTC の ISO）にそろえる。無ければ null */
export function instant(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/**
 * 最終承認のハッシュ。完成版の素材の role:sha に、アカウント・形式・公開の予定・解決した文面を足したもの。
 * @param {{ account: string, format: string, publishAt?: string|null, copy?: object|null, media: Record<string,string> }} parts
 */
export function approvalHash({ account, format, publishAt, copy, media }) {
  return sha256Hex(canonicalJson({ account, format, publishAt: instant(publishAt), copy: copy ?? null, media: media ?? {} }));
}

/** 画面確認（音声なし）のハッシュ。確認した素材の role:sha を並べたもの */
export function visualDigest(mediaShaByRole) {
  const lines = Object.entries(mediaShaByRole).sort(([a], [b]) => a.localeCompare(b)).map(([r, s]) => `${r}:${s}`);
  return sha256Hex(lines.join('\n'));
}

// ---- 文面の解決 ------------------------------------------------------------------------------------

/**
 * copy（`path#key`）を解決する。JSON は key を / で区切って辿り、配列は要素の key か id で引く。
 * 承認ハッシュに入れるのは題名・概要欄・タグ・本文だけ（予定や sha は別の欄で持つ）。
 * @returns {object|null} 見つからなければ null
 */
export function resolveCopy(root, copy) {
  if (!copy) return null;
  const [path, key = ''] = copy.split('#');
  const abs = join(root, path);
  if (!existsSync(abs)) return null;
  if (!path.endsWith('.json')) return { text: readFileSync(abs, 'utf8') };
  let node = JSON.parse(readFileSync(abs, 'utf8'));
  for (const seg of key.split('/').filter(Boolean)) {
    if (Array.isArray(node)) node = node.find((x) => x?.key === seg || x?.id === seg);
    else node = node?.[seg];
    if (node === undefined) return null;
  }
  if (!node || typeof node !== 'object') return null;
  const pick = {};
  for (const k of ['title', 'description', 'tags', 'caption', 'text']) if (node[k] !== undefined) pick[k] = node[k];
  return pick;
}

/** 公開の行から最終承認ハッシュの材料を集める（素材の sha は台帳の素材の行から引く） */
export function approvalParts(root, pub, mediaById) {
  const media = {};
  for (const [role, id] of Object.entries(pub.media ?? {})) media[role] = mediaById.get(id)?.sha256 ?? null;
  return { account: pub.account, format: pub.format, publishAt: pub.publishAt ?? null, copy: resolveCopy(root, pub.copy), media };
}
