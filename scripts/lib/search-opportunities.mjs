/**
 * search-opportunities.mjs — 検索キーワード戦略（config/search-strategy.json）のクラスター別集計と改善候補。
 * ---------------------------------------------------------------------------
 * GSC の検索語×ページ集計（data/gsc/reports/<日付>.json の page-query・CI 供給）を読み、
 * クラスター（検索語の正規表現）ごとに 表示・クリック・上位の帯の件数・改善候補の帯の件数を出す。帯の境目は config の striking だけが持つ。
 * 改善候補は「改善候補の帯で表示がある検索語」をページ単位に束ねたもの（既存ページの手直しで上位へ上げる対象）。
 * 直した改善の段階・前回の判定は実験台帳（kind: search-strategy・search-improvement.mjs）から ID で引く。SEO Rank Watch で観察中のページにも印を付ける。
 * 読み手: 週次レビュー（fileable の上位をその週に直して record・triage の要処置を 0 に）・月次レビュー（クラスター別の推移と判定）・管理画面 検索 ＞ キーワード戦略。
 * ---------------------------------------------------------------------------
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { datasetPath, latestFile } from './datasets.mjs';
import { listReports } from './metric-reports.mjs';
import { SITE_ORIGIN } from './site-identity.mjs';
import { readJson } from './json-io.mjs';
import { readDatasetIf } from './dataset-io.mjs';
import { isLegacyPath } from './legacy-routes.mjs';
import { escapeRegExp } from './regexp-escape.mjs';
import { LEGACY_REDIRECTED_AT } from './legacy-sitemap.mjs';
import { buildContentIndex } from './content-index.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from './repository-paths.mjs';
import { jstDayOf, todayJst } from './jst-date.mjs';
import { PHASES, RESULTS, dispatchIndex, experimentsByPage, implementationOf, isSearchExperiment, latestMeasurement, phaseOf, weeklyQuota } from './search-improvement.mjs';

export const CONFIG = datasetPath('config.search-strategy');

const pathOf = (url) => String(url).replace(SITE_ORIGIN, '') || '/';
const DAY = 86_400_000;
const windowDays = (p) => Math.round((Date.parse(p.endDate) - Date.parse(p.startDate)) / DAY) + 1;
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

/** 受け皿外の候補に週次レビューが下した判断（pageDecisions のうちページに当たる最後のもの） */
export const decisionFor = (cluster, page) => (cluster.pageDecisions ?? []).filter((d) => page.startsWith(d.path)).at(-1) ?? null;
/** 受け皿の中か（設計した pagePrefixes か、受け皿に加えると決めたページ） */
export const inTargetOf = (cluster, page) => cluster.pagePrefixes.some((p) => page.startsWith(p)) || decisionFor(cluster, page)?.decision === 'accept';

/**
 * 週次の処置（唯一の判定）。status: action＝今週処置が要る・observe＝処置済みで観察中・none＝通常の候補。
 * 旧 URL は転送・転送先の公開・サイト内リンクを確かめ、転送（か登録リクエスト）から graceDays を過ぎても候補に残れば登録リクエストを促す。
 * 受け皿外は受け皿に加えるか誘導するかを決める。誘導は決めてから graceDays を過ぎても残れば見直す。
 */
export function triageCandidate(p, { today, graceDays, redirectedAt = LEGACY_REDIRECTED_AT }) {
  if (p.legacyUrl) {
    const l = p.legacy ?? {};
    if (!l.to) return { kind: 'legacy', status: 'action', action: '転送先が無い → public/_redirects に 301 を足す' };
    if (!l.published) return { kind: 'legacy', status: 'action', action: `転送先 ${l.to} が公開されていない → 公開するか転送先を直す` };
    if (l.inboundLinks) return { kind: 'legacy', status: 'action', action: `サイト内の ${l.inboundLinks} 本が旧 URL を指している → ${l.to} へ張り替える` };
    const requested = l.requestedAt && l.requestedAt > redirectedAt;
    const days = daysBetween(requested ? l.requestedAt : redirectedAt, today);
    if (days < graceDays) return { kind: 'legacy', status: 'observe', note: `${requested ? `登録リクエスト ${l.requestedAt}` : '転送済み'}・置き換え待ち（あと ${graceDays - days} 日）` };
    return { kind: 'legacy', status: 'action', action: `${requested ? '登録リクエスト' : '転送'}から ${days} 日たっても旧 URL が出ている → npm run gsc-indexing:request -- --urls ${l.to} --commit` };
  }
  const d = p.decision;
  if (d?.decision === 'route') {
    const days = daysBetween(d.decidedAt, today);
    if (days < graceDays) return { kind: 'routed', status: 'observe', note: `誘導済み → ${d.to}（${d.decidedAt}・あと ${graceDays - days} 日）` };
    return { kind: 'routed', status: 'action', action: `誘導（${d.decidedAt}）から ${days} 日たっても ${p.page} が出ている → 受け皿に加えるか誘導を強める（decide をやり直す）` };
  }
  if (!p.inTarget) return { kind: 'off-target', status: 'action', action: '受け皿に加える（decide --accept）か、狙いのページへ誘導する（decide --route-to）' };
  return { kind: 'none', status: 'none' };
}

/** 上位の帯（minPosition より上）。帯の判定はこの 2 つだけ */
export const inTop = (position, striking) => position < striking.minPosition;
/** 改善候補の帯（minPosition〜maxPosition） */
export const inStriking = (position, striking) => position >= striking.minPosition && position <= striking.maxPosition;
/** 帯の表示名（設定から作る。画面・CLI・カードに順位の数字を直書きしない） */
export function bandLabels(striking) {
  const from = Math.ceil(striking.minPosition);
  return { top: `${from - 1}位以内`, striking: `${from}〜${striking.maxPosition}位` };
}

/** 期間の異なる検索語×ページ集計の一覧（新しい順）。同じ期間の重複取得は最新の 1 本だけ。 */
export function listPageQuerySnapshots(root) {
  const seen = new Set();
  return listReports(root, 'gsc.page-query')
    .map((r) => ({ file: r.ref, data: r.data }))
    .filter(({ data }) => {
      const key = `${data.meta?.startDate}/${data.meta?.endDate}`;
      if (!data.meta?.startDate || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * クラスター 1 つ分の集計（純関数）。rows は GSC の { keys: [page, query], clicks, impressions, position }。
 * byPage は experimentsByPage（ページ → 計測中の EXP と最後に判定した EXP）、dispatchById は dispatch-log の索引。
 */
export function summarizeCluster(cluster, rows, striking, { watchedPaths = new Set(), byPage = new Map(), dispatchById = new Map() } = {}) {
  const re = new RegExp(cluster.queryPattern, 'i');
  const mine = rows.filter((r) => re.test(r.keys[1]));
  const impressions = mine.reduce((s, r) => s + r.impressions, 0);
  const clicks = mine.reduce((s, r) => s + r.clicks, 0);
  const weightedPos = impressions ? mine.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : null;
  const inRange = mine.filter((r) => inStriking(r.position, striking));

  const grouped = new Map();
  for (const r of inRange) {
    const page = pathOf(r.keys[0]);
    const g = grouped.get(page) ?? { page, queries: [], impressions: 0, clicks: 0 };
    g.queries.push({ query: r.keys[1], position: Math.round(r.position * 10) / 10, impressions: r.impressions, clicks: r.clicks });
    g.impressions += r.impressions;
    g.clicks += r.clicks;
    grouped.set(page, g);
  }
  const candidates = [...grouped.values()]
    .filter((g) => g.impressions >= striking.minImpressions)
    .map((g) => {
      const exp = byPage.get(g.page) ?? {};
      const watched = watchedPaths.has(g.page);
      const legacyUrl = isLegacyPath(g.page);
      const inTarget = inTargetOf(cluster, g.page);
      const experiment = exp.open ? { id: exp.open.id, phase: phaseOf(exp.open, dispatchById), card: exp.open.searchStrategy.card ?? null, nextCheck: exp.open.next_check_date ?? null } : null;
      return {
        ...g,
        queries: g.queries.sort((a, b) => b.impressions - a.impressions),
        bestPosition: Math.min(...g.queries.map((q) => q.position)),
        inTarget,
        decision: decisionFor(cluster, g.page),
        legacyUrl,
        watched,
        experiment,
        lastResult: exp.closed ? { id: exp.closed.id, result: exp.closed.result, closedAt: exp.closed.closed_at } : null,
        // 受け皿外は週次の判断（受け皿に加える）が先。誘導すると決めたページも直さない
        fileable: !watched && !legacyUrl && !experiment && inTarget,
      };
    })
    .sort((a, b) => b.impressions - a.impressions || a.bestPosition - b.bestPosition);

  return {
    id: cluster.id,
    label: cluster.label,
    queries: mine.length,
    impressions,
    clicks,
    top10: mine.filter((r) => inTop(r.position, striking)).length,
    striking: inRange.length,
    avgPosition: weightedPos == null ? null : Math.round(weightedPos * 10) / 10,
    candidates,
  };
}

/**
 * 週次の処置のうち実験の段（唯一の判定）。判定待ちは close する。カード完了から graceDays を過ぎても本番デプロイに入らなければ確かめる
 * （commit が develop・main に無い＝squash マージで変わった・未 push など）。それまでは観察（CI の sync が毎週探す）。
 */
export function triageExperiment(e, { today, graceDays }) {
  if (e.phase === 'filed') return { kind: 'unrecorded', status: 'action', action: `${e.id} に改善の記録が無い → 直して develop に入れ、npm run search-improvement -- record --id ${e.id} --sha <commit> --change "…" --commit` };
  if (e.phase === 'verdict-due') {
    const m = e.measurement ?? {};
    return { kind: 'verdict', status: 'action', action: `${e.id} の事後窓が確定（${m.pre ?? '—'}→${m.post ?? '—'}・目安 ${m.verdictHint ?? '—'}）→ npm run search-improvement -- close --id ${e.id} --result <success|partial|no-effect|negative> --learning "…" --commit` };
  }
  if (e.phase === 'implemented' && e.implementedAt) {
    const days = daysBetween(e.implementedAt, today);
    if (days < graceDays) return { kind: 'deploy-wait', status: 'observe', note: `${e.id} 改善 ${e.implementedAt}・本番反映待ち` };
    return { kind: 'deploy-wait', status: 'action', action: `${e.id} の改善（${e.implementedAt}）から ${days} 日たっても本番デプロイに入っていない → 記録した commit が develop・main にあるか確かめ（squash で変わっていれば record をやり直す）、本番へ出して npm run search-improvement -- sync を回す` };
  }
  return { kind: 'none', status: 'none' };
}

/** 印の意味（管理画面のツールチップ・CLI の凡例）。印を足したらここにも足す */
export const MARK_HINTS = {
  experiment: '直した改善の実験の段階（本番反映待ち→計測中→判定待ち）',
  watched: 'SEO Rank Watch で 1 キーワードを観察中。ここからは直さない',
  'legacy-action': '旧 URL（/docs/）で今週の処置が要る（転送・転送先の公開・サイト内リンク・登録リクエスト）。週次レビューで処置する',
  'legacy-wait': '旧 URL（/docs/）。転送・公開・サイト内リンクは確認済みで、Google の置き換え待ち（期限を過ぎたら登録リクエスト）',
  'off-target': '受け皿（設定の pagePrefixes）の外のページ。週次レビューで受け皿に加えるか、狙いのページへ誘導するかを決める',
  routed: '狙いのページへ誘導すると決めて観察中（期限を過ぎても出ていれば判断を見直す）',
  'routed-action': '誘導してから期限を過ぎても出ている。週次レビューで判断を見直す',
  last: '前回の実験の判定。同じ直し方を繰り返さない',
  todo: '直してよい候補。週次レビューが表示の多い順に improvePerWeek 件をその週に直し、search-improvement record で記録する',
};

/** 候補の印（唯一の判定。CLI・管理画面・週次の下書きが使う）。key は表示の色分け、hint は意味。triage は triageCandidate の結果 */
export function candidateMarks(p) {
  const out = [];
  const t = p.triage ?? { kind: 'none' };
  if (p.experiment) out.push({ key: 'experiment', label: `${PHASES[p.experiment.phase]} ${p.experiment.id}` });
  if (p.watched) out.push({ key: 'watched', label: '観察中' });
  if (t.kind === 'legacy') out.push(t.status === 'action' ? { key: 'legacy-action', label: '旧URL・要処置' } : { key: 'legacy-wait', label: '旧URL・置き換え待ち' });
  if (t.kind === 'off-target') out.push({ key: 'off-target', label: '受け皿外・要処置' });
  if (t.kind === 'routed') out.push(t.status === 'action' ? { key: 'routed-action', label: '誘導・要見直し' } : { key: 'routed', label: `誘導済 → ${p.decision.to}` });
  if (p.lastResult) out.push({ key: 'last', label: `前回 ${RESULTS[p.lastResult.result] ?? p.lastResult.result} ${p.lastResult.id}` });
  if (p.fileable) out.push({ key: 'todo', label: '未着手' });
  return out.map((m) => ({ ...m, hint: MARK_HINTS[m.key] }));
}

/**
 * 旧 URL の候補の転送の確認（入出力あり）。転送先・転送先の公開・旧 URL を指すサイト内リンクの本数・
 * 転送先の最後の登録リクエスト（gsc.indexing-history の commit の run）を返す。
 */
const linkMemo = new Map();
/** git grep -E（POSIX 拡張正規表現）に渡すページの逃がし（共通部品 escapeRegExp。記号とバックスラッシュをすべて逃がす）。テストの入口として再輸出する */
export const escapeEre = escapeRegExp;
export function legacyStatus(root, pages) {
  if (!pages.length) return new Map();
  const { index, legacy } = buildContentIndex(root);
  const runs = (readDatasetIf(root, 'gsc.indexing-history')?.runs ?? []).filter((r) => r.mode === 'commit');
  // 旧 URL を指すサイトの記事（HEAD の commit に対する git grep。見つからなければ exit 1）。commit が同じなら結果も同じなので使い回す
  const siteDir = relative(REPO_ROOT, SITE_CONTENT_ROOT).split('\\').join('/');
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const head = git(['rev-parse', 'HEAD']).trim();
  const linkingFiles = (page) => {
    const key = `${root}:${head}:${page}`;
    if (!linkMemo.has(key)) {
      try {
        linkMemo.set(key, git(['grep', '-l', '-E', `${escapeEre(page)}([)"'#?[:space:]/]|$)`, 'HEAD', '--', siteDir]).split('\n').filter(Boolean).length);
      } catch (e) {
        if (e.status !== 1) throw e;
        linkMemo.set(key, 0);
      }
    }
    return linkMemo.get(key);
  };
  return new Map(pages.map((page) => {
    const to = legacy.get(page) ?? null;
    const file = to ? index.get(to) : null;
    const published = Boolean(file) && /^published:\s*true\s*$/m.test(readFileSync(join(root, file), 'utf8'));
    const inboundLinks = linkingFiles(page);
    const last = to ? runs.filter((r) => (r.slugs ?? []).includes(to)).map((r) => r.collectedAt).sort().at(-1) : null;
    return [page, { to, published, inboundLinks, requestedAt: last ? jstDayOf(new Date(last)) : null }];
  }));
}

/**
 * Bing の検索語の候補（改善候補の帯・クラスター別）。Bing Webmaster は検索語とページが別の集計で、
 * 検索語×ページの組が無いので、ページには束ねず検索語だけを出す（週次の行を GSC と同じ日数で合算・順位は表示回数で重み付け）。
 * rows = bing-*.json の sections.query.rows（{ date, query, impressions, clicks, avgImpressionPosition }）。
 */
export function summarizeBing(cluster, rows, striking, days, endDate) {
  const re = new RegExp(cluster.queryPattern, 'i');
  const end = Date.parse(endDate ?? rows.map((r) => r.date).sort().at(-1));
  const byQuery = new Map();
  for (const r of rows) {
    if (!re.test(r.query ?? '') || !(r.avgImpressionPosition > 0)) continue;
    const age = (end - Date.parse(r.date)) / DAY;
    if (!(age >= 0 && age < days)) continue;
    const g = byQuery.get(r.query) ?? { query: r.query, impressions: 0, clicks: 0, posSum: 0 };
    g.impressions += r.impressions ?? 0;
    g.clicks += r.clicks ?? 0;
    g.posSum += (r.avgImpressionPosition ?? 0) * (r.impressions ?? 0);
    byQuery.set(r.query, g);
  }
  const all = [...byQuery.values()].map((g) => ({ query: g.query, impressions: g.impressions, clicks: g.clicks, position: g.impressions ? Math.round((g.posSum / g.impressions) * 10) / 10 : null }));
  const candidates = all
    .filter((q) => q.position != null && inStriking(q.position, striking) && q.impressions >= striking.minImpressions)
    .sort((a, b) => b.impressions - a.impressions);
  return { queries: all.length, top10: all.filter((q) => q.position != null && inTop(q.position, striking)).length, candidates };
}

/** 最新の Bing Webmaster の記録（台帳 bing.snapshots）。無ければ null。 */
function latestBing(root) {
  const file = latestFile(root, 'bing.snapshots');
  if (!file) return null;
  const data = JSON.parse(readFileSync(join(root, file), 'utf8'));
  return data.sections?.query?.ok ? { file, rows: data.sections.query.rows ?? [] } : null;
}

/** 直してよい候補（全クラスター・表示の多い順・同じページは表示の多いクラスターの 1 件だけ）。 */
export function fileableCandidates(clusters) {
  const best = new Map();
  for (const c of clusters) for (const p of c.allCandidates ?? c.candidates) {
    if (!p.fileable) continue;
    const prev = best.get(p.page);
    if (!prev || p.impressions > prev.impressions) best.set(p.page, { ...p, cluster: c.id, clusterLabel: c.label });
  }
  return [...best.values()].sort((a, b) => b.impressions - a.impressions || a.bestPosition - b.bestPosition);
}

/** 実験台帳の検索改善（kind: search-strategy）の一覧行（段階・最後の自動計測つき）。 */
export function experimentRows(experiments, dispatchById, clusters) {
  const labelOf = new Map(clusters.map((c) => [c.id, c.label]));
  return experiments.filter(isSearchExperiment).map((e) => {
    const m = latestMeasurement(e);
    return {
      id: e.id,
      phase: phaseOf(e, dispatchById),
      cluster: e.searchStrategy?.cluster ?? null,
      clusterLabel: labelOf.get(e.searchStrategy?.cluster) ?? e.searchStrategy?.cluster ?? null,
      page: e.searchStrategy?.page ?? null,
      card: e.searchStrategy?.card ?? null,
      implementedAt: implementationOf(e, dispatchById)?.at ?? null,
      change: e.implementation?.change ?? null,
      closedAt: e.closed_at ? jstDayOf(new Date(e.closed_at)) : null,
      queries: e.measure?.scope?.queries?.length ?? 0,
      createdAt: e.created_at ?? null,
      startedAt: e.started_at ?? null,
      nextCheck: e.next_check_date ?? null,
      metric: e.measure?.metric ?? null,
      measurement: m ? { pre: m.pre?.value ?? null, post: m.post?.value ?? null, deltaPct: m.deltaPct, verdictHint: m.verdictHint, complete: m.complete } : null,
      result: e.result ?? null,
    };
  });
}

/**
 * maxCandidates はクラスターごとに返す候補の上限（既定は config の maxCandidatesPerCluster。管理画面は表で全件を出すので Infinity）。
 * asOf（YYYY-MM-DD）を渡すと、その日より前に終わる集計を最新として扱う（直した日より前の状態を基準にする record が使う）。
 */
export function buildSearchOpportunities(root, { maxCandidates, asOf } = {}) {
  const config = readJson(root, CONFIG);
  const limit = maxCandidates ?? config.striking.maxCandidatesPerCluster;
  const bands = bandLabels(config.striking);
  const ledger = readDatasetIf(root, 'business.experiments') ?? { experiments: [] };
  const dispatchById = dispatchIndex((readDatasetIf(root, 'state.dispatch-log') ?? { entries: [] }).entries);
  const experiments = experimentRows(ledger.experiments, dispatchById, config.clusters);
  const snaps = listPageQuerySnapshots(root).filter((s) => !asOf || s.data.meta.endDate < asOf);
  if (!snaps.length) return { config, bands, period: null, source: null, previous: null, clusters: [], fileable: [], triage: [], quota: null, experiments };
  const latest = snaps[0];
  // 比べる相手は最新と重ならない直前の期間（日数は集計の窓から決める）
  const prev = snaps.find((s) => s.data.meta.endDate < latest.data.meta.startDate) ?? null;
  const watch = readDatasetIf(root, 'config.seo-watchwords') ?? { watchwords: [] };
  const watchedPaths = new Set((watch.watchwords ?? []).map((w) => w.targetPath));
  const byPage = experimentsByPage(ledger.experiments);

  const bing = latestBing(root);
  const days = windowDays(latest.data.meta);
  const all = config.clusters.map((c) => {
    const now = summarizeCluster(c, latest.data.rows, config.striking, { watchedPaths, byPage, dispatchById });
    const b = bing ? summarizeBing(c, bing.rows, config.striking, days) : null;
    const before = prev ? summarizeCluster(c, prev.data.rows, config.striking) : null;
    return {
      ...now,
      allCandidates: now.candidates,
      candidates: now.candidates.slice(0, limit),
      candidateTotal: now.candidates.length,
      bing: b ? { queries: b.queries, top10: b.top10, candidates: b.candidates.slice(0, limit), candidateTotal: b.candidates.length } : null,
      previous: before ? { impressions: before.impressions, clicks: before.clicks, top10: before.top10, striking: before.striking, avgPosition: before.avgPosition } : null,
    };
  });
  // 週次の処置: 旧 URL の転送を確かめ（入出力）、全候補に処置の状態を付ける
  const legacy = legacyStatus(root, [...new Set(all.flatMap((c) => c.allCandidates.filter((p) => p.legacyUrl).map((p) => p.page)))]);
  const today = todayJst();
  for (const c of all) for (const p of c.allCandidates) {
    if (p.legacyUrl) p.legacy = legacy.get(p.page) ?? null;
    p.triage = triageCandidate(p, { today, graceDays: config.cycle.legacyGraceDays });
  }
  const triage = [
    ...all.flatMap((c) => c.allCandidates.filter((p) => p.triage.status !== 'none').map((p) => ({ cluster: c.id, clusterLabel: c.label, page: p.page, impressions: p.impressions, ...p.triage }))),
    ...experiments.map((e) => ({ cluster: e.cluster, clusterLabel: e.clusterLabel, page: e.page, impressions: null, ...triageExperiment(e, { today, graceDays: config.cycle.legacyGraceDays }) })).filter((t) => t.status !== 'none'),
  ];
  const fileable = fileableCandidates(all);
  // 週次の改善の件数（週次レビューの完了条件 triage --check --weekly が見る）
  const quota = weeklyQuota({ rows: experiments, fileable: fileable.length, perWeek: config.cycle.improvePerWeek, today });
  const clusters = all.map(({ allCandidates, ...c }) => c);
  return {
    config,
    bands,
    period: { startDate: latest.data.meta.startDate, endDate: latest.data.meta.endDate },
    source: latest.file,
    previous: prev ? { startDate: prev.data.meta.startDate, endDate: prev.data.meta.endDate, source: prev.file } : null,
    bingSource: bing?.file ?? null,
    clusters,
    fileable,
    triage,
    quota,
    experiments,
  };
}
