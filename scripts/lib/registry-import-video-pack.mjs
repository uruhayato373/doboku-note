/**
 * registry-import-video-pack.mjs — 動画パック 1 本（content/sns/video-packs/{exam}/{packId}/）を、コンテンツ台帳の
 * 作品・公開の行に変換する（P1 は試行の 1 本、P2 は全パックの一括取り込みが使う）。書き込みはしない。
 *
 * 状態・外部 ID・予定は今の動画の台帳（.claude/state/video-content-status.json）から写す。切り替え前は台帳の行が
 * その写しで、ずれは check-content-registry の R09 が止める。過去の承認はハッシュの無い grandfathered で取り込む。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { idShapeIssues, pubIdOf } from './content-registry.mjs';
import { readJsonIf } from './json-io.mjs';

const fromLegacyStatus = (s) => (s === 'measured' ? 'published' : s);

function approvalOf(d) {
  if (d?.approvedBy !== 'user') return undefined;
  const at = d.approvedAt ?? d.renderedAt ?? d.scheduledAt;
  if (!at) return undefined;
  return { by: 'user', at: new Date(at).toISOString(), contentSha256: null, grandfathered: true };
}

function platformOf(d) {
  if (!d?.videoId) return undefined;
  const status = fromLegacyStatus(d.status);
  const privacy = d.privacyStatus ?? (status === 'published' ? 'public' : undefined);
  const out = { id: d.videoId };
  if (privacy) out.privacy = privacy;
  if (d.url) out.url = d.url;
  if (status === 'published') {
    if (d.publishedAt) out.publishedAt = new Date(d.publishedAt).toISOString();
    out.evidence = { kind: 'legacy-ledger', ref: 'video-content-status.json' };
  }
  return out;
}

/**
 * @param {string} root
 * @param {string} packDir リポジトリ相対の動画パックのフォルダ
 * @param {{ state: object, rules: object }} ctx
 * @returns {{ exam: string, work: object, publications: object[] }}
 */
export function videoPackRows(root, packDir, { state, rules }) {
  const manifest = JSON.parse(readFileSync(join(root, packDir, 'video-pack.json'), 'utf8'));
  const youtube = readJsonIf(root, `${packDir}/youtube.json`);
  const exam = manifest.exam;
  const workId = manifest.packId;
  const d = state?.packs?.[workId]?.derivatives ?? {};

  const work = { id: workId, kind: 'video-pack', definition: packDir };
  if (existsSync(join(root, packDir, 'compilation.json'))) work.format = 'compilation';
  if (d.longform?.qa) work.qa = { avg: d.longform.qa.avg, blocks: d.longform.qa.blocks, at: String(d.longform.qa.at).slice(0, 10), by: d.longform.qa.by };
  if (idShapeIssues('work', workId, rules).length) work.idException = 'imported-before-cutover';

  const publications = [];
  const longformId = pubIdOf({ exam, work: workId, channel: 'youtube', format: 'longform' });
  if (manifest.outputs?.longform) {
    const l = d.longform ?? { status: 'draft' };
    const pub = { id: longformId, work: workId, account: 'youtube:main', format: 'longform', status: fromLegacyStatus(l.status) };
    if (youtube?.longform) pub.copy = `${packDir}/youtube.json#longform`;
    const publishAt = l.publishAt ?? youtube?.longform?.publishAt;
    if (publishAt) pub.publishAt = publishAt;
    const approval = approvalOf(l);
    if (approval) pub.approval = approval;
    const platform = platformOf(l);
    if (platform) pub.platform = platform;
    publications.push(pub);
  }

  const shortKeys = new Set([...(youtube?.shorts ?? []).map((s) => s.key), ...(d.shorts ?? []).map((s) => s.key)]);
  for (const key of [...shortKeys].sort()) {
    const s = (d.shorts ?? []).find((x) => x.key === key) ?? { status: 'draft' };
    const plan = (youtube?.shorts ?? []).find((x) => x.key === key);
    const pub = {
      id: pubIdOf({ exam, work: workId, channel: 'youtube', format: 'short', variant: key }),
      work: workId, account: 'youtube:main', format: 'short', variant: key, status: fromLegacyStatus(s.status),
    };
    if (plan) pub.copy = `${packDir}/youtube.json#shorts/${key}`;
    const publishAt = s.publishAt ?? plan?.publishAt;
    if (publishAt) pub.publishAt = publishAt;
    const approval = approvalOf(s);
    if (approval) pub.approval = approval;
    const platform = platformOf(s);
    if (platform) pub.platform = platform;
    if (manifest.outputs?.longform) pub.relatedTo = longformId;
    if (idShapeIssues('variant', key, rules).length) pub.idException = 'imported-before-cutover';
    publications.push(pub);
  }
  return { exam, work, publications };
}
