/**
 * shorts-release.mjs — 在庫に入れたショートを、初回の投稿・予約の段へ進める準備の判定（DN-1002）。
 * 書くのは registry.mjs の prepare-short（台帳の書き手）。ここは検査と、書く中身の組み立てだけ。
 *
 * 決まり:
 * - 在庫（Drive）の動画・表紙・画面の一覧・字幕を、公開行の素材として台帳に結ぶ（sha と大きさは Drive の台帳から取る）
 * - 関連動画（Shorts → 通常動画）は、同じ作品の通常動画のうち予約済みか公開済みの行（読み修正などの改訂版を含む）
 * - 公開日時は、親の公開より後・予約の関門の余裕（minLeadHours）より先・同じ時刻に別の動画が無い・1 日の上限（maxPublishPerDay）まで
 */
import { loadRegistry } from './content-registry.mjs';
import { loadDriveManifest } from './drive-vault.mjs';
import { readJson } from './json-io.mjs';
import { audioProblems, readPolicy } from './video-publish-gate.mjs';
import { jstDayOf } from './jst-date.mjs';
import { aiProvenance } from './image-origin.mjs';

const VIDEO_ID = /^[\w-]{11}$/;

/** 同じ作品の、関連動画にできる通常動画（予約済みか公開済み・外部 ID あり）。改訂版も含む */
export function liveParents(publications, exam, work) {
  const base = `${exam}/${work}/youtube.longform`;
  return publications.filter((p) => p.channel === 'youtube' && p.format === 'longform' && (p.id === base || p.revisionOf === base) &&
    ['scheduled', 'published'].includes(p.status) && VIDEO_ID.test(p.platform?.id ?? ''));
}

/** 公開日時の問題。空なら予約してよい */
export function slotProblems(publications, pub, publishAt, parent, { now = Date.now(), leadHours = 24, dailyMax = 3 } = {}) {
  const at = Date.parse(publishAt ?? '');
  if (!Number.isFinite(at) || !/(Z|[+-]\d\d:\d\d)$/.test(publishAt)) return ['公開日時は時差つきの ISO 8601 で書く'];
  const problems = [];
  if (at - now < leadHours * 3_600_000) problems.push(`公開日時が近すぎる（${leadHours} 時間以上先にする）`);
  if (!(at > Date.parse(parent.publishAt ?? parent.platform?.publishedAt ?? ''))) problems.push(`親の通常動画（${parent.id}）の公開より後にする`);
  const others = publications.filter((p) => p.id !== pub.id && p.channel === 'youtube' && p.status !== 'stopped' && p.publishAt);
  const clash = others.find((p) => Date.parse(p.publishAt) === at);
  if (clash) problems.push(`同じ公開日時に別の動画がある: ${clash.id}`);
  const day = jstDayOf(publishAt);
  const sameDay = others.filter((p) => jstDayOf(p.publishAt) === day).length;
  if (sameDay + 1 > dailyMax) problems.push(`${day} は既に ${sameDay} 本（1 日 ${dailyMax} 本まで）`);
  return problems;
}

/** 採用したショートの品質の記録（画面確認・音声）が、今の動画のものか */
export function qualityProblems(revision, videoSha256, policy) {
  const problems = [];
  if (!revision?.render || revision.render.videoSha256 !== videoSha256) problems.push('描画の記録が今の動画と合わない');
  if (revision?.screenReview?.verdict !== 'pass' || revision.screenReview.videoSha256 !== videoSha256) problems.push('今の動画の画面確認 pass が無い');
  problems.push(...audioProblems(revision?.audio, videoSha256, policy));
  if (!revision?.stock?.cloudVerified) problems.push('在庫（Drive）に入っていない');
  return problems;
}

/** prepare-short が書く中身を組み立てる。問題があれば投げる（何も書かない） */
export function prepareShortPlan(root, { pubId, publishAt, now = Date.now() }) {
  const reg = loadRegistry(root);
  const pub = reg.publications.find((p) => p.id === pubId);
  if (!pub || pub.channel !== 'youtube' || pub.format !== 'short' || !pub.variant || pub.revisionOf) throw new Error(`初回のショートの公開行ではない: ${pubId}`);
  if (!['draft', 'qa_passed'].includes(pub.status) || pub.approval || pub.platform?.id) throw new Error(`${pub.id}: 承認・投稿の後は準備し直さない（${pub.status}）`);
  const work = reg.works.find((w) => w.id === pub.work && w.exam === pub.exam);
  if (work?.kind !== 'video-pack') throw new Error(`${pub.id}: 作品の定義が無い`);
  const dir = work.definition;
  const record = readJson(root, `${dir}/pop-image.json`);
  const revision = record.revisions?.[record.activeShorts?.[pub.variant]];
  const release = readJson(root, `${dir}/youtube.json`);
  const item = release.shorts?.find((s) => s.key === pub.variant);
  if (!item) throw new Error(`${pub.id}: youtube.json に ${pub.variant} が無い`);
  if (pub.copy !== `${dir}/youtube.json#shorts/${pub.variant}`) throw new Error(`${pub.id}: 文面の置き場が作品と一致しない`);
  const quality = qualityProblems(revision, item.sha256, readPolicy(root));
  if (quality.length) throw new Error(`${pub.id}: ${quality.join('・')}`);
  const { stock } = revision;
  if (item.thumbnailSha256 !== stock.thumbnail.sha256 || stock.video.sha256 !== item.sha256) throw new Error(`${pub.id}: youtube.json と在庫の sha が違う`);

  const parents = liveParents(reg.publications, pub.exam, pub.work);
  if (parents.length !== 1) throw new Error(`${pub.id}: 関連動画にできる通常動画が ${parents.length} 本（予約済みか公開済みの 1 本が要る）`);
  const parent = parents[0];
  const policy = readPolicy(root);
  const problems = slotProblems(reg.publications, pub, publishAt, parent, { now, leadHours: policy.minLeadHours ?? 24, dailyMax: policy.maxPublishPerDay });
  if (problems.length) throw new Error(`${pub.id}: ${problems.join('・')}`);

  const { entries } = loadDriveManifest();
  const vault = (asset, role) => {
    const e = entries[asset.path];
    if (!e || e.sha256 !== asset.sha256 || !(e.bytes > 0)) throw new Error(`${pub.id}: ${role} が Drive の台帳に無いか sha が違う（${asset.path}）`);
    return e;
  };
  const cover = revision.images.find((i) => i.role === 'cover');
  if (cover?.output?.sha256 !== stock.thumbnail.sha256 || cover.review?.status !== 'ai-reviewed') throw new Error(`${pub.id}: 表紙の採用記録が無い`);
  const spec = `${dir}/shorts-design.json`;
  const v = vault(stock.video, 'video'), c = vault(stock.thumbnail, 'cover'), f = vault(stock.frames, 'contact-sheet'), s = vault(stock.subtitles, 'subtitles');
  const rendered = { kind: 'render', by: 'shorts-factory', spec };
  const media = [
    { id: `${pub.id}/video`, role: 'video', type: 'video/mp4', sha256: stock.video.sha256, bytes: v.bytes, store: { tier: 'drive', path: stock.video.path },
      provenance: rendered, durationSec: Math.round(revision.render.durationSeconds * 1000) / 1000 },
    { id: `${pub.id}/cover`, role: 'cover', type: 'image/png', sha256: stock.thumbnail.sha256, bytes: c.bytes, store: { tier: 'drive', path: stock.thumbnail.path },
      provenance: aiProvenance({ prompt: cover.generation.prompt, generatedAt: cover.generation.generatedAt }),
      width: c.width, height: c.height },
    { id: `${pub.id}/contact-sheet`, role: 'contact-sheet', type: 'image/png', sha256: stock.frames.sha256, bytes: f.bytes, store: { tier: 'drive', path: stock.frames.path },
      provenance: rendered, ...(f.width ? { width: f.width, height: f.height } : {}) },
    { id: `${pub.id}/subtitles`, role: 'subtitles', type: 'text/x-ssa', sha256: stock.subtitles.sha256, bytes: s.bytes, store: { tier: 'drive', path: stock.subtitles.path }, provenance: rendered },
  ];
  // 表紙は AI 生成なので、承認は画像の判定 ok を求める（approve）。shorts-factory の監査の判定を同じ台帳へ写す
  const ledger = { key: `media:${pub.id}/cover`, value: { sha: stock.thumbnail.sha256.slice(0, 16), verdict: 'ok', reason: cover.review.reason, reviewedAt: cover.review.checkedAt } };
  return {
    pub, exam: pub.exam, dir, parent, media, ledger,
    patch: { media: Object.fromEntries(media.map((m) => [m.role, m.id])), relatedTo: parent.id, publishAt, status: 'qa_passed' },
    summary: { pub: pub.id, publishAt, relatedTo: parent.id, parentVideoId: parent.platform.id, parentPublishAt: parent.publishAt ?? null, media: media.map((m) => `${m.role} ${m.sha256.slice(0, 8)}`) },
  };
}
