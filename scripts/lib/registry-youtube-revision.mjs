/** ローカル候補を改訂版の下書きへ結ぶ。旧公開行・承認・外部IDを複製/更新しない。 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { canonicalJson, idShapeIssues, loadRegistry, loadRegistryConfig, pubIdOf, resolveCopy } from './content-registry.mjs';
import { upsertPublications, upsertWorks } from './content-registry-write.mjs';
import { RegistryPublications } from './dataset-schemas-content.mjs';
import { formatJson, readJsonIf } from './json-io.mjs';
import { isVisualRole } from './media-review.mjs';
import { todayJst } from './jst-date.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const strip = row => Object.fromEntries(Object.entries(row).filter(([k]) => !['file', 'exam', 'channel'].includes(k)));

export function planYoutubeRevision(root, { pubId, variant, relatedTo, publishAt, copyRef, refreshDraft = false, now = Date.now() }, reg = loadRegistry(root)) {
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
  if (copyRef) {
    const file = copyRef.split('#')[0];
    const within = relative(realpathSync(join(root, work.definition)), realpathSync(resolve(root, file)));
    if (isAbsolute(file) || !within || within.startsWith('..') || isAbsolute(within) || !file.endsWith('.json')) {
      throw new Error('改訂文面は同じ作品内のJSONを相対パスで指定する');
    }
  }
  const copy = resolveCopy(root, copyRef ?? source.copy);
  if (!copy?.title || !copy.description) throw new Error('文面を解決できない。旧入力が無い場合は --copy で同じ作品の改訂文面を指定する');
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
    ...(copyRef ? { copySource: copyRef } : {}),
    localFile: assets.video.path, sha256: assets.video.sha256,
    thumbnailLocalFile: assets.cover.path, thumbnailSha256: assets.cover.sha256,
    ...(relatedTo ? { relatedTo } : {}), ...(publishAt ? { publishAt } : {}),
  };
  RegistryPublications.parse({ schemaVersion: 1, exam: source.exam, channel: 'youtube', publications: [row] });
  const existing = reg.publications.find(p => p.id === id);
  if (existing && refreshDraft) {
    const visualExtras = Object.fromEntries(Object.entries(existing.media ?? {}).filter(([role]) => !(role in assets) && isVisualRole(role)));
    row.media = { ...row.media, ...visualExtras };
  }
  if (existing && canonicalJson(strip(existing)) !== canonicalJson(row)) throw new Error('既存の改訂公開行と異なる。上書きせず別のvariantで準備する');
  const saved = readJsonIf(root, file);
  if (refreshDraft && (!existing || !saved)) throw new Error('下書き更新には既存の未承認draftと保存済み入力が必要');
  const changed = Boolean(saved && canonicalJson(saved) !== canonicalJson(input));
  if (changed && !refreshDraft) throw new Error('既存の改訂投稿入力と異なる。上書きしない');
  // 既存の画面確認素材だけを保持し、承認・外部ID・実行intentのある行は更新できない。
  const previous = changed ? readFileSync(join(root, file), 'utf8') : null;
  const previousSha256 = previous === null ? null : hash(previous);
  const history = previous === null ? null : file.replace(/\.json$/, `.history-${previousSha256}.json`);
  const digest = hash(canonicalJson({ source, row, input, ...(previousSha256 ? { previousSha256 } : {}) }));
  return { row, input, file, digest, history, previous, exam: source.exam, existing: Boolean(existing), checkedMedia: Object.keys(assets).length };
}

export function prepareYoutubeRevision(root, options) {
  const plan = planYoutubeRevision(root, options);
  if (options.commit) {
    if (options.expect !== plan.digest) throw new Error('dry-run の digest と現在の候補・元の公開行が一致しない');
    if (plan.history) {
      const history = join(root, plan.history);
      if (existsSync(history)) {
        if (readFileSync(history, 'utf8') !== plan.previous) throw new Error('下書き履歴の内容が違う。上書きしない');
      } else writeFileSync(history, plan.previous, { flag: 'wx' });
      writeFileSync(join(root, plan.file), formatJson(plan.input));
    } else if (!existsSync(join(root, plan.file))) {
      // 新しい入力だけを作る。別セッションが先に作っていれば上書きしない。
      writeFileSync(join(root, plan.file), formatJson(plan.input), { flag: 'wx' });
    }
    upsertPublications(root, 'youtube', plan.exam, [plan.row]);
  }
  return { publicationId: plan.row.id, revisionOf: plan.row.revisionOf, input: plan.file, digest: plan.digest,
    checkedMedia: plan.checkedMedia, written: options.commit ? (plan.existing && !plan.history ? 0 : 1) : 0,
    ...(plan.history ? { preservedInput: plan.history } : {}),
    status: 'draft', externalActions: 0, dryRun: !options.commit };
}

/** 独立QAの結果を改訂公開行と作品へ記録する。承認は運営者の別操作。 */
export function recordYoutubeRevisionQa(root, { pubId, avg, blocks, commit = false, at = todayJst() }) {
  const reg = loadRegistry(root), pub = reg.publications.find(p => p.id === pubId);
  const work = reg.works.find(w => w.id === pub?.work && w.exam === pub?.exam);
  if (!pub?.revisionOf || pub.channel !== 'youtube' || pub.format !== 'longform' ||
      !['draft', 'qa_blocked', 'qa_passed'].includes(pub.status) || pub.approval || !work) {
    throw new Error('未承認の改訂通常動画だけQA結果を記録できる');
  }
  if (!Number.isFinite(avg) || avg < 0 || avg > 3 || !Number.isInteger(blocks) || blocks < 0) {
    throw new Error('QAの平均0〜3とBLOCK件数を指定してください');
  }
  const qa = { avg, blocks, at, by: 'Claude Code video-content-qa' };
  const status = avg >= 2 && blocks === 0 ? 'qa_passed' : 'qa_blocked';
  if (commit) {
    upsertWorks(root, pub.exam, [{ ...work, qa }]);
    upsertPublications(root, 'youtube', pub.exam, [{ ...pub, status }]);
  }
  return { publicationId: pubId, qa, status, written: commit ? 1 : 0, dryRun: !commit };
}
