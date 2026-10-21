/** ローカル候補を改訂版の下書きへ結ぶ。旧公開行・承認・外部IDを複製/更新しない。 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalJson, idShapeIssues, loadRegistry, loadRegistryConfig, pubIdOf, resolveCopy } from './content-registry.mjs';
import { upsertPublications } from './content-registry-write.mjs';
import { RegistryPublications } from './dataset-schemas-content.mjs';
import { formatJson, readJsonIf } from './json-io.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const strip = row => Object.fromEntries(Object.entries(row).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));

export function planYoutubeRevision(root, { pubId, variant, relatedTo, publishAt, now = Date.now() }, reg = loadRegistry(root)) {
  const source = reg.publications.find(p => p.id === pubId);
  if (!source || source.channel !== 'youtube' || source.revisionOf) throw new Error('改訂元のYouTube公開行が必要（改訂行からの再改訂は不可）');
  const work = reg.works.find(w => w.id === source.work && w.exam === source.exam);
  if (work?.kind !== 'video-pack') throw new Error('video-pack の改訂のみ対応');
  const shape = idShapeIssues('variant', variant, loadRegistryConfig(root).idRules);
  if (shape.length) throw new Error(shape.join('; '));
  const id = pubIdOf({ exam: source.exam, work: source.work, channel: 'youtube', format: source.format, variant });
  if (id === source.id) throw new Error('旧公開IDは上書きしない');
  if (publishAt && (!/(?:Z|[+-]\d\d:\d\d)$/.test(publishAt) || !(Date.parse(publishAt) > now))) throw new Error('予定はタイムゾーン付きの未来の日時が必要');
  if (source.format === 'short') {
    const target = reg.publications.find(p => p.id === relatedTo);
    if (!target || target.format !== 'longform' || target.revisionOf !== source.relatedTo || target.account !== source.account || target.work !== source.work) throw new Error('Shorts は同じ作品の改訂版通常動画を --related-to で指定する');
  } else if (source.format !== 'longform' || relatedTo) throw new Error('形式または関連先が不正');

  const prefix = `candidate-${source.format === 'short' ? `${source.variant}-` : ''}`;
  const owner = `${source.exam}/${source.work}/work/`;
  const assets = {};
  for (const m of reg.media.filter(m => m.id.startsWith(owner + prefix))) {
    const role = m.role.slice(prefix.length);
    if (!/^(cover|cta|video|subtitles|body|recipe|scene-\d{3})$/.test(role)) continue;
    if (hash(readFileSync(join(root, m.store.path))) !== m.sha256) throw new Error(`候補の実ファイルSHA不一致: ${m.id}`);
    assets[role] = { id: m.id, path: m.store.path, sha256: m.sha256 };
  }
  for (const role of ['video', 'cover', 'subtitles']) if (!assets[role]) throw new Error(`候補の ${role} が無い`);
  const copy = resolveCopy(root, source.copy);
  if (!copy?.title || !copy.description) throw new Error('元の文面を解決できない');
  const file = `${work.definition}/youtube.revision-${variant}.json`;
  const row = {
    id, work: source.work, account: source.account, format: source.format, variant,
    revisionOf: source.id, status: 'draft', copy: file,
    media: Object.fromEntries(Object.entries(assets).map(([role, m]) => [role, m.id])),
    ...(relatedTo ? { relatedTo } : {}), ...(publishAt ? { publishAt } : {}),
  };
  const input = {
    schemaVersion: 1, publicationId: id, revisionOf: source.id, account: source.account,
    format: source.format, ...copy, media: assets,
    localFile: assets.video.path, sha256: assets.video.sha256,
    thumbnailLocalFile: assets.cover.path, thumbnailSha256: assets.cover.sha256,
    ...(relatedTo ? { relatedTo } : {}), ...(publishAt ? { publishAt } : {}),
  };
  RegistryPublications.parse({ schemaVersion: 1, exam: source.exam, channel: 'youtube', publications: [row] });
  const existing = reg.publications.find(p => p.id === id);
  if (existing && canonicalJson(strip(existing)) !== canonicalJson(row)) throw new Error('既存の改訂公開行と異なる。上書きせず別のvariantで準備する');
  const saved = readJsonIf(root, file);
  if (saved && canonicalJson(saved) !== canonicalJson(input)) throw new Error('既存の改訂投稿入力と異なる。上書きしない');
  const digest = hash(canonicalJson({ source, row, input }));
  return { row, input, file, digest, exam: source.exam, existing: Boolean(existing), checkedMedia: Object.keys(assets).length };
}

export function prepareYoutubeRevision(root, options) {
  const plan = planYoutubeRevision(root, options);
  if (options.commit) {
    if (options.expect !== plan.digest) throw new Error('dry-run の digest と現在の候補・元の公開行が一致しない');
    // 新しい入力だけを作る。別セッションが先に作っていれば上書きしない。
    if (!existsSync(join(root, plan.file))) writeFileSync(join(root, plan.file), formatJson(plan.input), { flag: 'wx' });
    upsertPublications(root, 'youtube', plan.exam, [plan.row]);
  }
  return { publicationId: plan.row.id, revisionOf: plan.row.revisionOf, input: plan.file, digest: plan.digest,
    checkedMedia: plan.checkedMedia, written: options.commit ? (plan.existing ? 0 : 1) : 0,
    status: 'draft', externalActions: 0, dryRun: !options.commit };
}
