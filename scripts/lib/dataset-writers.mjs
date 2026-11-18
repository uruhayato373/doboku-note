/**
 * dataset-writers.mjs — データセットごとの「書き手」の宣言（DN-1240）。台帳 scripts/lib/datasets.mjs が読み込み、各行の writer・writerNote に合成する。
 *
 * なぜ要るか: 台帳は「どのファイルが何のデータか」を決めるが、「誰が書くか」が無かった。価格の正本を 3 体のエージェントが書く、
 * 実験の台帳に書き手が 4 つある、といった重なりが散文の中でしか分からず、照合できなかった（2026-11-18 の役割分担の見直し・DN-1240）。
 * 書き手はここだけに書く。config/automations.json は書く先を持たない（管理画面・検査はここからの逆引き）。
 *
 * 書き手の書き方（接頭辞つき）:
 *   script:<npm script 名>      書き込む実装（package.json の scripts に実在）
 *   file:<リポジトリ相対パス>   書き込む実装で、npm script を持たないスクリプト
 *   automation:<id>             定期実行で書く（config/automations.json の id。土曜の収集は weekly-review）
 *   skill:<名前>                スキルの手順で、親がファイルを直接書き換える
 *   agent:<名前>                エージェントがファイルを直接書き換える
 *   human                       運営者か親が手で編集する（設定・一回きりの調査）
 * スキル・エージェントが npm script を呼ぶだけのときは、書き手は script: で書く（呼ぶ側は書き手にしない）。
 *
 * 値は配列か { writer: [...], note: '…' }。automation: 以外の書き手が 2 つ以上あるときは note が必須（どの欄・どの場面を誰が書くか）。
 * 分からない行は推測で書かず、載せない。載っていない行の数は .claude/config/dataset-writer-baseline.json が持ち、増やせない
 * （npm run check-datasets。埋めたら基準線を下げる）。依存ゼロに保つ（datasets.mjs が読む）。
 */

/** 書き手の接頭辞 → 画面に出す呼び名 */
export const WRITER_KINDS = {
  script: 'スクリプト',
  file: 'スクリプト',
  automation: '定期実行',
  skill: 'スキル',
  agent: 'エージェント',
  human: '手で編集',
};

export const WRITERS = {
  // ===== 戦略 =====
  'config.business-direction': ['skill:monthly-review'],
  'config.qualification-registry': ['skill:monthly-review'],
  'config.exam-calendar': ['human'],
  'config.exam-formats': ['human'],
  'config.exam-stats': ['human'],
  'config.market-scan': ['skill:competitor-review'],
  'config.demand-map': ['skill:monthly-review'],
  'config.competitors': ['skill:competitor-review'],
  'config.competitor-positions': ['skill:competitor-review'],
  'config.issue-map': { writer: ['skill:weekly-review', 'skill:monthly-review'], note: '状態（state）と根拠（evidence）は週次レビュー、承認待ちの指標の移入は月次レビュー' },
  'config.operating-costs': ['human'],
  'config.channel-strategy': ['human'],
  'note.competitors': ['script:scout-note-competitors'],
  'coconala.competitors': ['script:scout-coconala-competitors'],
  'courses.competitors': ['human'],
  'coconala.blog-competitors': ['script:scout-coconala-blogs'],
  'coconala.market-research': ['script:coconala-research', 'automation:weekly-review'],
  'coconala.market-summary': ['script:coconala-research', 'automation:weekly-review'],
  'x.competitors': ['script:scout-x-competitors'],
  'instagram.competitors': ['script:scout-ig-competitors'],
  'youtube.competitors': ['script:scout-youtube-competitors'],
  'business.measurement': {
    writer: ['script:fetch-business-metrics', 'script:record-net-receipts', 'script:record-operating-costs', 'automation:fetch-metrics', 'automation:weekly-review'],
    note: 'サイトと販売の計測は fetch-business-metrics（CI の fetch-metrics）、受取額と費用は record-net-receipts・record-operating-costs（土曜の収集）',
  },
  'business.snapshot': ['script:business-review', 'automation:fetch-metrics'],
  'business.target': ['script:business-review'],
  'business.review': ['script:business-review'],
  'business.site-to-sales': ['script:report-site-to-sales'],
  'business.product-sales': ['script:product-sales', 'automation:weekly-review'],
  'business.checks-monthly': ['script:review-checks'],
  'business.checks-weekly': ['script:review-checks'],
  'business.experiments': {
    writer: ['script:measure-experiments', 'script:growth-triage', 'script:search-improvement', 'skill:nsm-experiment', 'automation:fetch-metrics'],
    note: '計測値（measurements）は measure-experiments（CI の fetch-metrics）。起票・開始・判定・中止は nsm-experiment。種類が search-strategy の実験だけ search-improvement。growth-triage は改善候補からの起票',
  },
  'business.weekly': ['file:.claude/scripts/snapshot-weekly-metrics.mjs', 'automation:fetch-metrics'],
  'analysis.qualification-market': ['script:scan-qualification-market'],
  'analysis.civil-service-applicants': ['human'],

  // ===== 計画 =====
  'config.revenue-calendar': ['human'],
  'config.channel-annual-plan': ['human'],
  'config.annual-roadmap': ['human'],
  'state.todo-claims': { writer: ['script:todo:claim', 'script:todo:complete', 'script:todo:release'], note: 'claim が記録を足し、complete と release が外す' },
  'state.weekly-review-draft': ['script:weekly-review:draft'],
  'state.backlog-verify-status': ['script:check-backlog-verify'],

  // ===== 商品 =====
  'config.products': { writer: ['script:product'], note: '価格・公開状態の変更は npm run product だけ。note・ココナラ・KDP の運用スクリプトも同じ保存関数（scripts/lib/product-registry.mjs）を通す' },
  'config.product-lineup': ['human'],
  'config.sales-product-map': ['human'],
  'config.content-themes': ['human'],
  'config.note-funnel': ['human'],
  'config.site-cta-surfaces': ['human'],
  'config.note-membership': ['human'],
  'config.note-magazine-membership': ['human'],
  'config.note-price-consistency': ['human'],
  'config.note-intro-standard': ['script:product'],
  'config.note-covers': ['script:product'],
  'config.coconala-account': ['human'],
  'config.coconala-listings': ['human'],
  'config.coconala-blog': ['human'],
  'config.keiken-answer-sheet-limits': ['human'],
  'config.pe-answer-sheets': ['human'],
  'config.cce-essay-history': ['human'],
  'note.sales': {
    writer: ['script:note-sales-fetch', 'skill:record-sales', 'automation:weekly-review'],
    note: '当月分は note-sales-fetch（土曜の収集）が差し替える。運営者が貼った販売履歴は record-sales の手順で親が追記する',
  },
  'note.magazines': ['automation:weekly-review'],
  'note.status': ['script:verify-note-status', 'automation:weekly-review'],
  'note.sync-log': ['script:note-sync-routine', 'automation:weekly-review'],
  'note.articles-pv': ['script:note-traffic-fetch', 'automation:weekly-review'],
  'note.traffic-period': ['script:note-traffic-fetch', 'automation:weekly-review'],
  'note.referrers': ['script:note-traffic-fetch', 'automation:weekly-review'],
  'kdp.royalties': ['script:kdp-report', 'automation:weekly-review'],
  'coconala.seller-profile': ['script:coconala-seller-profile', 'automation:weekly-review'],
  'coconala.revenue': ['script:coconala-revenue', 'automation:weekly-review'],
  'coconala.orders-snapshot': ['script:coconala-orders', 'automation:weekly-review'],
  'coconala.kpi': {
    writer: ['script:coconala-analytics', 'skill:coconala-status', 'automation:weekly-review'],
    note: '土曜の収集の coconala-analytics --append-kpi が追記する。運営者が数値を貼ったときだけ coconala-status の手順で親が 1 行足す',
  },
  'coconala.analytics': ['script:coconala-analytics', 'automation:weekly-review'],
  'coconala.resolved-inquiries': ['human'],
  'pastexams.inventory': ['script:past-exam-fetch'],
  'analysis.monetization-coverage': ['script:report-monetization-coverage', 'automation:fetch-metrics'],
  'analysis.monetization-report': ['script:report-monetization-coverage', 'automation:fetch-metrics'],
  'state.note-attachments-missing': ['script:check-note-attachments', 'automation:weekly-review'],

  // ===== アフィリエイト =====
  'config.affiliate-asp': ['human'],
  'config.a8-report-automation': ['human'],
  'config.career-funnel': ['human'],
  'config.affiliate-mats': ['human'],
  'config.affiliate-placements': ['human'],
  'config.cta-placements': ['human'],
  'a8.report-log': ['script:a8-ui:normalize', 'automation:weekly-review'],
  'a8.catalog': ['skill:scout-asp'],
  'a8.ui-last-run': ['script:a8-ui:fetch', 'automation:weekly-review'],
  'a8.ui-raw': { writer: ['script:a8-ui:fetch', 'script:a8-ui:normalize'], note: 'CSV は a8-ui:fetch、正規化した結果は a8-ui:normalize' },
  'moshimo.reports': ['script:moshimo-report', 'automation:weekly-review'],
  'afb.outcomes': ['script:fetch-afb-outcomes'],
  'affiliate.layout-shots': ['script:affiliate:shots'],
  'affiliate.catalog': { writer: ['script:affiliate:apply', 'script:affiliate:status'], note: '提携の申請結果は affiliate:apply、提携状態の照合結果は affiliate:status --write' },
  'analysis.career-funnel': ['script:report-career-funnel', 'automation:fetch-metrics'],
  'analysis.career-funnel-report': ['script:report-career-funnel', 'automation:fetch-metrics'],
  'analysis.career-funnel-baseline': ['script:report-career-funnel', 'automation:fetch-metrics'],
  'analysis.buildjob-report': ['script:report-buildjob-affiliate'],
  'analysis.affiliate-opportunities': ['human'],
  'analysis.affiliate-research': ['human'],

  // ===== サイト（検索の集客） =====
  'ga4.reports': ['automation:fetch-metrics'],
  'ga4.admin-inventory': ['automation:fetch-metrics'],
  'gsc.reports': ['automation:fetch-metrics', 'automation:index-coverage'],
  'gsc.sitemaps': ['automation:fetch-metrics'],
  'gsc.index-coverage-history': ['automation:index-coverage'],
  'gsc.url-inspection': ['file:.claude/scripts/inspection-cycle.mjs', 'automation:index-coverage'],
  'gsc.indexing-priority': ['script:gsc-indexing:priority', 'automation:index-coverage'],
  'gsc.indexing-priority-list': ['script:gsc-indexing:priority', 'automation:index-coverage'],
  'gsc.indexing-requests': ['script:gsc-indexing:request', 'automation:weekly-review'],
  'gsc.indexing-history': ['script:gsc-indexing:request', 'automation:weekly-review'],
  'psi.batch': ['script:fetch-psi-data', 'automation:psi-audit'],
  'analysis.seo-build-summary': ['automation:seo-build-summary'],
  'analysis.seo-meta': ['script:check-seo-meta'],
  // ===== そのほか（自動化の台帳 config/automations.json の writes から移した分・公開の事実の台帳） =====
  'state.weekly-collect': ['automation:weekly-review'],
  'state.improvements': ['automation:weekly-review'],
  'cloudflare.zone': ['automation:cloudflare-metrics'],
  'state.cloudflare-zone-config': ['automation:cloudflare-metrics'],
  'rum.web-vitals': ['automation:fetch-metrics'],
  'analysis.quiz-premium-funnel': ['automation:fetch-metrics'],
  'analysis.growth-pack': ['automation:fetch-metrics'],
  'analysis.growth-digest': ['automation:fetch-metrics'],
  'bing.snapshots': ['automation:fetch-metrics'],
  'youtube.analytics': ['automation:fetch-metrics'],
  'analysis.psi-report': ['automation:psi-audit'],
  'youtube.own-videos': ['automation:youtube-own-metrics'],
  'registry.youtube': {
    writer: ['script:registry', 'script:media', 'automation:youtube-single-publish', 'automation:youtube-reschedule-batch'],
    note: '公開の事実は npm run registry、媒体の記録は npm run media だけが書く（content-registry.md）。予約と公開の自動化も同じ 2 本を通す',
  },
  'registry.instagram': { writer: ['script:registry', 'script:media'], note: '公開の事実は npm run registry、媒体の記録は npm run media だけが書く（content-registry.md）' },
  'registry.x': { writer: ['script:registry', 'script:media'], note: '公開の事実は npm run registry、媒体の記録は npm run media だけが書く（content-registry.md）' },
};

/** 1 行の宣言を { writer, writerNote } に揃える。載っていなければ空 */
export function writerDeclOf(id) {
  const v = WRITERS[id];
  if (!v) return {};
  if (Array.isArray(v)) return { writer: v };
  return { writer: v.writer, ...(v.note ? { writerNote: v.note } : {}) };
}

/** 'script:product' → { kind: 'script', name: 'product' }。human は name が空。形が違えば null */
export function parseWriter(value) {
  if (value === 'human') return { kind: 'human', name: '' };
  const m = /^(script|file|automation|skill|agent):(.+)$/.exec(String(value ?? ''));
  return m ? { kind: m[1], name: m[2] } : null;
}

/**
 * 書き手の宣言の違反を返す（pure）。known: { scripts, files, automations, skills, agents } はそれぞれ実在する名前の Set
 * （files だけは (path) => boolean の関数）。
 */
export function writerProblems(row, known) {
  const problems = [];
  const writers = row.writer;
  if (writers === undefined) {
    if (row.writerNote) problems.push('writerNote だけがあり writer が無い');
    return problems;
  }
  if (!Array.isArray(writers) || writers.length === 0) return ['writer は 1 つ以上の配列で書く'];
  if (new Set(writers).size !== writers.length) problems.push('writer に同じ値が 2 回ある');
  for (const w of writers) {
    const p = parseWriter(w);
    if (!p) { problems.push(`writer「${w}」の形が違う（script:・file:・automation:・skill:・agent: か human）`); continue; }
    if (p.kind === 'script' && !known.scripts.has(p.name)) problems.push(`writer「${w}」が package.json の scripts に無い`);
    if (p.kind === 'file' && !known.files(p.name)) problems.push(`writer「${w}」のファイルが無い`);
    if (p.kind === 'automation' && !known.automations.has(p.name)) problems.push(`writer「${w}」が自動化の台帳（データセット config.automations）に無い`);
    if (p.kind === 'skill' && !known.skills.has(p.name)) problems.push(`writer「${w}」のスキルが .claude/skills に無い`);
    if (p.kind === 'agent' && !known.agents.has(p.name)) problems.push(`writer「${w}」のエージェントが .claude/agents に無い`);
  }
  const hands = writers.filter((w) => !String(w).startsWith('automation:'));
  if (hands.length >= 2 && !row.writerNote) problems.push(`書き手が ${hands.length} つある（${hands.join('・')}）。どの欄・どの場面を誰が書くかを note に書く`);
  return problems;
}

/**
 * 未記入の基準線との食い違いを返す（pure）。rows は DATASETS、baseline は未記入を許す id の配列。
 * 基準線に無い未記入（＝新しい行に書き手が無い）と、基準線に残った記入済み・台帳に無い id（＝下げ忘れ）の両方を止める。
 */
export function writerBaselineProblems(rows, baseline) {
  const allowed = new Set(baseline);
  const ids = new Set(rows.map((x) => x.id));
  const missing = rows.filter((x) => !x.writer).map((x) => x.id);
  const problems = [];
  for (const id of missing) if (!allowed.has(id)) problems.push(`${id}: 書き手が無い。scripts/lib/dataset-writers.mjs の WRITERS に書く（新しいデータセットは書き手が必須）`);
  for (const id of allowed) {
    if (!ids.has(id)) problems.push(`基準線の ${id} は台帳に無い。missing から消す`);
    else if (!missing.includes(id)) problems.push(`基準線の ${id} は書き手を書いたので missing から消す（基準線を下げる）`);
  }
  return { problems, missing };
}

/** 自動化の id → それが書くデータセットの id（台帳の順）。rows は DATASETS */
export function datasetsWrittenByAutomation(rows, automationId) {
  return rows.filter((x) => (x.writer ?? []).includes(`automation:${automationId}`)).map((x) => x.id);
}
