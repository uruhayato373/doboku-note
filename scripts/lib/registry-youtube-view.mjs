/**
 * registry-youtube-view.mjs — コンテンツ台帳の YouTube の公開を、読み手（予定の集約・公開中の一覧・サムネイルの展開・管理画面）が
 * 使う平らな形で返す唯一の入口（DN-0610）。旧 Shorts の台帳（.claude/state/youtube-schedule.json）を読んでいた箇所はここへ切り替える。
 * 依存ゼロ（zod を読まない。管理画面からも import する）。
 */
import { loadRegistry, publicationStage, resolveCopy } from './content-registry.mjs';

/**
 * @param {string} root
 * @param {{ reg?: object, legacyOnly?: boolean }} [opts] legacyOnly: 動画パック以前の旧 Shorts（作品の kind が legacy-short）だけ
 * @returns {{ id: string, exam: string, work: string, workKind: string|null, format: string, variant: string|null, status: string, stage: string,
 *   stopReason: string|null, publishAt: string|null, videoId: string|null, url: string|null, privacy: string|null, publishedAt: string|null,
 *   title: string|null, legacyKey: string|null, legacy: boolean, media: Record<string,string> }[]}
 */
export function youtubePublications(root, opts = {}) {
  const reg = opts.reg ?? loadRegistry(root);
  const kindOf = new Map(reg.works.map((w) => [`${w.exam}/${w.id}`, w.kind]));
  const out = [];
  for (const p of reg.publications) {
    if (p.channel !== 'youtube') continue;
    const workKind = kindOf.get(`${p.exam}/${p.work}`) ?? null;
    const legacy = workKind === 'legacy-short';
    if (opts.legacyOnly && !legacy) continue;
    out.push({
      id: p.id, exam: p.exam, work: p.work, workKind, format: p.format, variant: p.variant ?? null,
      status: p.status, stage: publicationStage(p.status), stopReason: p.stopReason ?? null,
      publishAt: p.publishAt ?? null, videoId: p.platform?.id ?? null, url: p.platform?.url ?? null,
      privacy: p.platform?.privacy ?? null, publishedAt: p.platform?.publishedAt ?? null,
      title: resolveCopy(root, p.copy)?.title ?? null, legacyKey: p.legacyKey ?? null, legacy, media: p.media ?? {},
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}
