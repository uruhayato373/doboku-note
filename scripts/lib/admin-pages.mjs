/** 管理画面の全ルートと台帳の照合。画面は 1 問いにし、上限を超えて増やさない */
const COUNTED = new Set(['page', 'detail']);

export function auditAdminPages(ledger, routes) {
  const errors = [];
  const found = new Map(routes.map((r) => [r.route, r]));
  for (const { route } of routes) {
    if (!ledger.pages[route]) errors.push(`台帳に無い画面: ${route}（既存の画面で答えられないかを確かめ、問いを画面の台帳に書く）`);
  }
  const questions = new Map();
  for (const [route, page] of Object.entries(ledger.pages)) {
    const real = found.get(route);
    if (!real) { errors.push(`台帳だけに残る画面: ${route}`); continue; }
    if (page.kind === 'redirect' && !real.redirects) errors.push(`転送と書いたが転送していない: ${route}`);
    if (COUNTED.has(page.kind)) {
      const same = questions.get(page.question);
      if (same) errors.push(`同じ問いの画面: ${same} と ${route}（統合する）`);
      questions.set(page.question, route);
    }
  }
  const counted = Object.values(ledger.pages).filter((p) => COUNTED.has(p.kind)).length;
  if (counted > ledger.limit) errors.push(`画面の上限を超えた: ${counted} 本 / 上限 ${ledger.limit} 本（統合するか、limit を上げて理由を changes に残す）`);
  return { errors, counted };
}
