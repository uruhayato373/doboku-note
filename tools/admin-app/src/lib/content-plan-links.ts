/** 制作管理と年間計画を行き来するリンク。予定・公開の状態は各台帳が持つ。 */
export const LONGFORM_PLAN_PATH = '/sns/youtube/longform';

export function longformPlanHref({ m, e, library }: { m?: string; e?: string; library?: string } = {}) {
  const query = new URLSearchParams();
  if (m) query.set('m', m);
  if (e) query.set('e', e);
  if (library === '1') query.set('library', '1');
  return LONGFORM_PLAN_PATH + (query.size ? `?${query}` : '');
}

export const roadmapHref = (month?: string) => `/plan/roadmap${month ? `#month-${month}` : ''}`;
