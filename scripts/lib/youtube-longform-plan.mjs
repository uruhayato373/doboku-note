/** 通常動画の編集予定を公開IDで台帳へ結ぶ。試験日・対象期間・実予約は複製しない。 */
import { loadRegistry, resolveCopy } from './content-registry.mjs';
import { readDataset } from './dataset-io.mjs';
import { readJson } from './json-io.mjs';
import { loadRoadmap } from './annual-roadmap.mjs';
import { ConfigYoutubeLongformPlan } from './dataset-schemas-content.mjs';
import { jstDayOf, jstLabel, todayJst } from './jst-date.mjs';

export const PLAN_ACTIONS = { finish: '既存を仕上げる', revise: '年度・内容を更新', new: '新規制作', reuse: '既存を再案内', scheduled: '予約済み', library: '公開済み', unplanned: '日程未設定' };

/** 純粋な join。参照切れ・資格取り違えを黙って除外しない。 */
export function joinLongformPlan(plan, publications, period, today = todayJst()) {
  const byId = new Map(publications.map((p) => [p.id, p]));
  const planned = new Set();
  const rows = [];
  const rowOf = (entry, p) => {
    const actual = p?.status === 'published' ? p.platform?.publishedAt ?? p.publishAt : p?.status === 'scheduled' ? p.publishAt : null;
    const date = entry.action === 'reuse' ? entry.target : actual ? jstDayOf(actual) : entry.target ?? null;
    const blocked = entry.action === 'reuse' && p?.status !== 'published';
    return {
      ...entry, title: entry.title ?? p?.title ?? p?.work ?? entry.id,
      publicationId: p?.id ?? null, status: p?.status ?? 'proposal', date,
      actual: actual ? jstLabel(actual) : null,
      href: p ? `/content/items/${encodeURIComponent(p.exam)}/${encodeURIComponent(p.work)}` : null,
      url: p?.platform?.url ?? null,
      warning: blocked ? '元動画が未公開。再案内は保留' : ['stopped', 'failed', 'qa_blocked'].includes(p?.status) ? '台帳の停止・失敗・QAを解消するまで保留' : entry.action === 'unplanned' ? '制作・公開日を設定する' : !actual && entry.action !== 'reuse' && entry.ready < today ? '確認期限超過・公開準備を確認' : null,
      inPeriod: !!date && date.slice(0, 7) >= period.start && date.slice(0, 7) <= period.end,
    };
  };
  for (const entry of plan.entries) {
    const p = entry.publicationId ? byId.get(entry.publicationId) : null;
    if (entry.publicationId && (!p || p.exam !== entry.exam)) throw new Error(`通常動画計画の参照不整合: ${entry.id} → ${entry.publicationId}`);
    if (entry.action !== 'reuse' && p) {
      if (planned.has(p.id)) throw new Error(`同じ動画の制作予定が重複: ${p.id}`);
      planned.add(p.id);
    }
    rows.push(rowOf(entry, p));
  }
  for (const p of publications) {
    if (planned.has(p.id)) continue;
    rows.push(rowOf({ id: p.id, exam: p.exam, action: p.status === 'published' ? 'library' : p.status === 'scheduled' ? 'scheduled' : 'unplanned', priority: null, start: null, ready: null, target: null, note: p.status === 'scheduled' ? '公開台帳の予約日。公開前に表紙・動画・教材導線を確認。' : p.status === 'published' ? '既存動画の資産。台帳から最新状態を表示。' : '年間計画への配分が必要。' }, p));
  }
  rows.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.id.localeCompare(b.id));
  return { plan, period, rows, inventory: publications.length, scheduled: publications.filter((p) => p.status === 'scheduled').length, published: publications.filter((p) => p.status === 'published').length };
}

export function loadLongformPlan(root, today = todayJst()) {
  const plan = ConfigYoutubeLongformPlan.parse(readDataset(root, 'config.youtube-longform-plan'));
  const registry = loadRegistry(root);
  const works = new Map(registry.works.map((w) => [`${w.exam}/${w.id}`, w]));
  // 改訂行（revisionOf）は既存動画の差し替えで、制作計画の在庫には数えない。
  const publications = registry.publications.filter((p) => p.channel === 'youtube' && p.format === 'longform' && !p.revisionOf).map((p) => {
    const work = works.get(`${p.exam}/${p.work}`);
    const manifest = work?.definition ? readJson(root, `${work.definition}/video-pack.json`) : null;
    return { ...p, title: manifest?.title ?? resolveCopy(root, p.copy)?.title ?? p.work };
  });
  if (!publications.length) throw new Error('通常動画の台帳を1件も読み取れていません');
  return joinLongformPlan(plan, publications, loadRoadmap(root).period, today);
}
