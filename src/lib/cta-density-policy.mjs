// 2026-11-14 運営者決定。除外は指定したルール・面だけに限定し、商品重複は免除しない。
export const NOTE_LIST_ARTICLES = [
    'exam/civil-construction-2/secondary/experience-writing-examples',
    'exam/civil-construction-2/secondary/experience-writing-guide',
    'exam/civil-construction-2/secondary/r07',
    'exam/concrete-chief-engineer/guide/essay',
    'exam/concrete-diagnostician/guide/essay',
    'exam/pe-comprehensive-management/guide/essay-persona-guide',
    'exam/rccm/guide/mondai1-keiken-ronbun',
  ].map(page => ({ page, legacySlug: page.replace(/^exam\//, '').replace('pe-comprehensive-management/guide/', 'pe-comprehensive-management/').replaceAll('/', '-'), rules: ['note-non-footer'], reason: '商品一覧型の記事。構成として手書き4枚以上を許すが、同一商品の重複は検査する' }));

export const PAGE_ALLOWLIST = [
  { prefix: 'standards/', rules: ['note-total', 'note-non-footer', 'note-before-first-h2', 'note-product-dup', 'note-article-footer', 'note-article-sidebar', 'affiliate-forbidden-surface', 'affiliate-slots'], reason: '基準書は DocPage と別実装。広告面は配置ルールで管理する' },
  { page: 'links', rules: ['note-total'], reason: '商品一覧ページのため総数上限の対象外' },
  ...NOTE_LIST_ARTICLES,
];
export const SURFACE_ALLOWLIST = {
  'article-end-offsite': 'ココナラの添削導線であり、転職アフィリエイトではない',
  'career-multi-register': '転職を主導線とするキャリア記事の複数登録案内（訴求設計 §12）',
};

