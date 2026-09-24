// growth-opportunities（純粋ロジック）— 成長パック（GA4 × GSC の週・基線）と既存の計測成果物から、
// 週次レビューでトリアージする改善機会を決定的に抽出する。I/O は scripts/build-growth-digest.mjs。
//
// 設計:
// - 閾値判定はコードで決める（CLAUDE.md §5）。意味の判断（なぜ・何を変えるか）は週次レビューとエージェントが担う
// - 機会は安定 ID（OPP- + sha256(type|key)）を持ち、同じ機会は毎週同じ ID になる。triage-log の処分で抑止する
// - 期待効果は「週あたりの増分」。単位が違う（検索クリック / CTA クリック / 演習完了）のでカテゴリ内でだけ順位付けする
// - 自然検索の分母は google（GSC と突合できる）。GA4 の bing は bot 疑いがあるため Bing Webmaster と別照合する
// - 欠測は 0 にしない。入力が無い・打ち切り・thresholding は measurement カテゴリの機会として必ず表に出す
import { createHash } from 'node:crypto';
import { inferIntent } from './seo-watch-strategy.mjs';
import { judgeLedger } from './experiment-due.mjs';
import { addDays } from './business-direction.mjs';

export const oppId = (type, key) => `OPP-${createHash('sha256').update(`${type}|${key}`).digest('hex').slice(0, 10)}`;

const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const pct = (a, b) => (b > 0 ? round(((a - b) / b) * 100, 1) : null);

/** 掲載順位の期待 CTR（1〜10 位は設定の曲線、それ以降は一定）。 */
export function expectedCtr(position, seo) {
  const p = Math.max(1, Math.round(position));
  return p <= seo.expectedCtrByPosition.length ? seo.expectedCtrByPosition[p - 1] : seo.expectedCtrBeyond10;
}

/**
 * GSC の行を正規 URL へ寄せて (page, query) ごとに合算する（加重平均順位）。
 * 2026-08-22 の URL 移行後も Google は旧 /docs/ URL を表示し続けており（表示の約 3 割）、旧 URL を除外すると
 * 表示の多いクエリがほぼ消える。逆に別ページとして扱うと、旧 URL の減少と正規 URL の増加が「急落」「共食い」に見える。
 * legacy（旧 URL → 正規 URL）で寄せ、寄せた行には legacy: true を立てる。
 */
export function combineGscRows(rowSets, legacy = new Map()) {
  const byKey = new Map();
  for (const r of rowSets.flat()) {
    const page = legacy.get(r.page) ?? r.page;
    const key = `${page}\u0000${r.query ?? ''}`;
    const cur = byKey.get(key) ?? { page, query: r.query, clicks: 0, impressions: 0, posWeighted: 0, legacy: false };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.posWeighted += r.position * r.impressions;
    cur.legacy ||= page !== r.page;
    byKey.set(key, cur);
  }
  return [...byKey.values()].map((r) => ({ page: r.page, query: r.query, clicks: r.clicks, impressions: r.impressions, ctr: r.impressions ? r.clicks / r.impressions : 0, position: r.impressions ? r.posWeighted / r.impressions : null, legacy: r.legacy }));
}

const qualificationOf = (page, qualifications) => qualifications.find((id) => page.startsWith(`/exam/${id}/`)) ?? null;

function seoItem(type, key, fields, ctx) {
  const { page, query } = fields.key;
  const qualification = qualificationOf(page, ctx.qualifications);
  const intent = query ? inferIntent(query) : null;
  const contentPath = ctx.contentIndex.get(page) ?? null;
  const improvable = Boolean(query && qualification && contentPath && ['exam-task', 'exam-topic'].includes(intent));
  return {
    id: oppId(type, key),
    category: 'seo',
    type,
    ...fields,
    qualification,
    contentPath,
    suggest: improvable ? ['watchword', 'backlog'] : ['backlog'],
    watchwordDraft: improvable ? { keyword: query, targetPath: page, contentPath, qualification, intent, evidence: { kind: 'gsc', source: ctx.packFile } } : null,
  };
}

/** SEO の機会（35 日の page×query と週／基線の page）。旧 URL は正規 URL へ寄せ、既に監視中の語は除く。 */
export function detectSeo(pack, ctx) {
  const seo = ctx.config.seo;
  const s = pack.sections;
  const out = [];
  const legacy = ctx.legacy ?? new Map();
  const watched = new Set((ctx.watchwords ?? []).map((w) => `${w.targetPath}\u0000${w.keyword}`));
  if (s.gscPageQueryWeek?.ok && s.gscPageQueryBase?.ok) {
    const rows = combineGscRows([s.gscPageQueryWeek.rows, s.gscPageQueryBase.rows], legacy)
      .filter((r) => r.query && !r.page.startsWith('/docs/') && !watched.has(`${r.page}\u0000${r.query}`));
    for (const r of rows) {
      if (r.impressions < seo.minImpressions || r.position == null) continue;
      const weeklyImpr = r.impressions / 5;
      const metrics = { impressions35d: r.impressions, clicks35d: r.clicks, ctr: round(r.ctr * 100, 2), position: round(r.position), ...(r.legacy ? { includesLegacyUrl: true } : {}) };
      const exp = expectedCtr(r.position, seo);
      if (r.position <= 10 && r.ctr < exp * seo.lowCtrRatio) {
        out.push(seoItem('seo-high-impr-low-ctr', `${r.page}|${r.query}`, {
          key: { page: r.page, query: r.query },
          title: `「${r.query}」は平均 ${round(r.position)} 位なのに CTR ${metrics.ctr}%（期待 ${round(exp * 100, 1)}%）`,
          metrics, expectedWeeklyGain: { value: round(weeklyImpr * (exp - r.ctr)), unit: 'searchClicks' },
        }, ctx));
      } else if (r.position >= seo.strikingPositionMin && r.position <= seo.strikingPositionMax) {
        const target = expectedCtr(seo.strikingTargetPosition, seo);
        out.push(seoItem('seo-striking-distance', `${r.page}|${r.query}`, {
          key: { page: r.page, query: r.query },
          title: `「${r.query}」が平均 ${round(r.position)} 位（${seo.strikingTargetPosition} 位圏へ上げる余地）`,
          metrics, expectedWeeklyGain: { value: round(weeklyImpr * Math.max(0, target - r.ctr)), unit: 'searchClicks' },
        }, ctx));
      }
    }
    // 共食い: 同じクエリで複数ページが表示されている
    const byQuery = new Map();
    for (const r of rows) {
      if (r.impressions < seo.cannibalMinImpressionsPerPage || r.position == null || r.position > seo.cannibalMaxPosition) continue;
      byQuery.set(r.query, [...(byQuery.get(r.query) ?? []), r]);
    }
    for (const [query, pages] of byQuery) {
      if (pages.length < 2) continue;
      const impr = pages.reduce((a, r) => a + r.impressions, 0), clicks = pages.reduce((a, r) => a + r.clicks, 0);
      const best = Math.min(...pages.map((r) => r.position));
      const top = [...pages].sort((a, b) => b.impressions - a.impressions);
      out.push(seoItem('seo-cannibalization', query, {
        key: { page: top[0].page, query },
        title: `「${query}」で ${pages.length} ページが競合（${top.map((r) => r.page).join(' / ')}）`,
        metrics: { impressions35d: impr, clicks35d: clicks, pages: top.map((r) => ({ page: r.page, impressions: r.impressions, position: round(r.position) })) },
        expectedWeeklyGain: { value: round((impr / 5) * Math.max(0, expectedCtr(best, seo) - clicks / impr)), unit: 'searchClicks' },
      }, ctx));
    }
  }
  // 週の急落（ページ単位の GSC クリック・旧 URL は正規 URL へ寄せる）
  if (s.gscPageWeek?.ok && s.gscPageBase?.ok) {
    const week = new Map(combineGscRows([s.gscPageWeek.rows], legacy).map((r) => [r.page, r]));
    for (const b of combineGscRows([s.gscPageBase.rows], legacy)) {
      if (b.page.startsWith('/docs/')) continue;
      const baseWeekly = b.clicks / 4;
      const w = week.get(b.page)?.clicks ?? 0;
      if (baseWeekly < seo.dropMinBaseWeeklyClicks || w > baseWeekly * (1 - seo.dropRatio)) continue;
      out.push(seoItem('seo-traffic-drop', b.page, {
        key: { page: b.page, query: null },
        title: `${b.page} の検索クリックが週 ${w}（基線の週平均 ${round(baseWeekly)}・${pct(w, baseWeekly)}%）`,
        metrics: { weekClicks: w, baseWeeklyClicks: round(baseWeekly), deltaPct: pct(w, baseWeekly) },
        expectedWeeklyGain: { value: round(baseWeekly - w), unit: 'searchClicks' },
      }, ctx));
    }
  }
  // 継続的な減衰（過去パックの週次クリックが decayWeeks 回連続で減少）
  const series = [...(ctx.history ?? []), pack].filter((p) => p.sections?.gscPageWeek?.ok).slice(-(seo.decayWeeks + 1));
  if (series.length === seo.decayWeeks + 1) {
    const maps = series.map((p) => new Map(combineGscRows([p.sections.gscPageWeek.rows], legacy).map((r) => [r.page, r.clicks])));
    for (const [page, first] of maps[0]) {
      if (page.startsWith('/docs/') || first < seo.decayMinWeeklyClicks) continue;
      const vals = maps.map((m) => m.get(page) ?? 0);
      if (!vals.every((v, i) => i === 0 || v < vals[i - 1])) continue;
      out.push(seoItem('seo-decay', page, {
        key: { page, query: null },
        title: `${page} の検索クリックが ${seo.decayWeeks} 週連続で減少（${vals.join(' → ')}）`,
        metrics: { weeklyClicks: vals, weeks: series.map((p) => p.week) },
        expectedWeeklyGain: { value: vals[0] - vals.at(-1), unit: 'searchClicks' },
      }, ctx));
    }
  }
  return out;
}

const sumEvents = (rows, events, which) => rows.filter((r) => events.includes(r.event)).reduce((a, r) => a + r[which].count, 0);

/** 収益導線の機会（ページ別 CTA 率・配置別 CTR・導線ゼロの高流入ページ・演習ファネル）。 */
export function detectRevenue(pack, ctx) {
  const rv = ctx.config.revenue;
  const out = [];
  const ev = pack.sections.ga4Events;
  let siteCtr = null;
  if (ev?.ok) {
    const byPage = new Map();
    for (const r of ev.rows) byPage.set(r.page, [...(byPage.get(r.page) ?? []), r]);
    const totalImp = sumEvents(ev.rows, rv.ctaImpressionEvents, 'week') + sumEvents(ev.rows, rv.ctaImpressionEvents, 'base');
    const totalClk = sumEvents(ev.rows, rv.ctaClickEvents, 'week') + sumEvents(ev.rows, rv.ctaClickEvents, 'base');
    siteCtr = totalImp > 0 ? totalClk / totalImp : null;
    if (siteCtr != null) {
      for (const [page, rows] of byPage) {
        const imp = sumEvents(rows, rv.ctaImpressionEvents, 'week') + sumEvents(rows, rv.ctaImpressionEvents, 'base');
        const clk = sumEvents(rows, rv.ctaClickEvents, 'week') + sumEvents(rows, rv.ctaClickEvents, 'base');
        if (imp < rv.minCtaImpressions) continue;
        const ctr = clk / imp;
        if (ctr >= siteCtr * rv.lowPageCtrRatio) continue;
        out.push({
          id: oppId('revenue-page-cta-rate', page), category: 'revenue', type: 'revenue-page-cta-rate', key: { page },
          title: `${page} の CTA クリック率 ${round(ctr * 100, 2)}%（サイト平均 ${round(siteCtr * 100, 2)}%）`,
          metrics: { ctaImpressions35d: imp, ctaClicks35d: clk, ctrPct: round(ctr * 100, 2), siteCtrPct: round(siteCtr * 100, 2) },
          expectedWeeklyGain: { value: round((imp / 5) * (siteCtr - ctr), 1), unit: 'ctaClicks' },
          suggest: ['backlog', 'experiment'], watchwordDraft: null,
        });
      }
    }
    // 演習ファネル（/tools/kakomon-quiz 配下の開始→完了）
    const quiz = ev.rows.filter((r) => r.page.startsWith('/tools/kakomon-quiz'));
    const q = (event, which) => quiz.filter((r) => r.event === event).reduce((a, r) => a + r[which].count, 0);
    const ws = q('quiz_start', 'week'), wc = q('quiz_complete', 'week'), bs = q('quiz_start', 'base'), bc = q('quiz_complete', 'base');
    if (ws >= rv.quizMinStarts && bs > 0) {
      const wr = wc / ws, br = bc / bs;
      if (br > 0 && wr < br * (1 - rv.quizDropRatio)) {
        out.push({
          id: oppId('revenue-quiz-funnel-drop', '/tools/kakomon-quiz'), category: 'revenue', type: 'revenue-quiz-funnel-drop', key: { page: '/tools/kakomon-quiz' },
          title: `演習の完了率が ${round(wr * 100)}%（基線 ${round(br * 100)}%）に低下`,
          metrics: { weekStarts: ws, weekCompletions: wc, baseStarts: bs, baseCompletions: bc },
          expectedWeeklyGain: { value: round(ws * (br - wr)), unit: 'quizCompletions' },
          suggest: ['backlog'], watchwordDraft: null,
        });
      }
    }
  }
  const cov = ctx.coverage;
  if (cov) {
    const sessionsCtr = siteCtr ?? 0.01;
    for (const r of cov.rows ?? []) {
      if (!(r.gap || r.noteGap)) continue;
      out.push({
        id: oppId('revenue-no-cta', r.page), category: 'revenue', type: 'revenue-no-cta', key: { page: r.page },
        title: `${r.page} は流入 ${r.users} 人（28 日）なのに${r.gap ? '収益導線' : 'note 導線'}が無い`,
        metrics: { users28d: r.users, sessions28d: r.sessions, gap: Boolean(r.gap), noteGap: Boolean(r.noteGap) },
        expectedWeeklyGain: { value: round(((r.sessions ?? r.users) / 4) * sessionsCtr, 1), unit: 'ctaClicks' },
        suggest: ['backlog'], watchwordDraft: null,
      });
    }
    const placements = (cov.placementCtr ?? []).filter((p) => p.impressions >= rv.minPlacementImpressions28d);
    const ctrs = placements.map((p) => p.clicks / p.impressions).sort((a, b) => a - b);
    const median = ctrs.length ? ctrs[Math.floor(ctrs.length / 2)] : null;
    for (const p of placements) {
      const ctr = p.clicks / p.impressions;
      if (median == null || ctr >= median * rv.lowPlacementCtrRatio) continue;
      out.push({
        id: oppId('revenue-placement-ctr', p.placement), category: 'revenue', type: 'revenue-placement-ctr', key: { placement: p.placement },
        title: `配置 ${p.placement} は表示 ${p.impressions}（28 日）で CTR ${round(ctr * 100, 2)}%（配置の中央値 ${round(median * 100, 2)}%）`,
        metrics: { impressions28d: p.impressions, clicks28d: p.clicks, ctrPct: round(ctr * 100, 2), medianCtrPct: round(median * 100, 2) },
        expectedWeeklyGain: { value: round((p.impressions / 4) * (median - ctr), 1), unit: 'ctaClicks' },
        suggest: ['experiment', 'backlog'], watchwordDraft: null,
      });
    }
  }
  return out;
}

/** 計測の欠陥（区画の取得失敗・打ち切り・thresholding・入力欠落・イベント消失・bing の食い違い）。全件表に出す。 */
export function detectMeasurement(pack, ctx) {
  const m = ctx.config.measurement;
  const out = [];
  const add = (type, key, title, metrics = {}) => out.push({ id: oppId(type, key), category: 'measurement', type, key: { subject: key }, title, metrics, expectedWeeklyGain: null, suggest: ['backlog'], watchwordDraft: null });
  for (const [name, s] of Object.entries(pack.sections ?? {})) {
    if (!s.ok) add('measurement-section-failed', name, `成長パックの ${name} が取得失敗: ${s.error}`);
    else if (s.truncated) add('measurement-truncated', name, `成長パックの ${name} が打ち切り（${s.rows.length}/${s.rowCount ?? '?'} 行）`);
    else if (s.limited) add('measurement-thresholded', name, `成長パックの ${name} に GA4 の thresholding/sampling（値は下限・partial）`);
  }
  for (const input of ctx.inputs.filter((i) => i.coverage === 'missing')) add('measurement-input-missing', input.name, `入力 ${input.name} が無いか古い（${input.note}）`);
  const ev = pack.sections.ga4Events;
  if (ev?.ok) {
    const events = [...new Set(ev.rows.map((r) => r.event))];
    for (const e of events) {
      const w = ev.rows.filter((r) => r.event === e).reduce((a, r) => a + r.week.count, 0);
      const bw = ev.rows.filter((r) => r.event === e).reduce((a, r) => a + r.base.count, 0) / 4;
      if (bw >= m.vanishMinBaseWeekly && w === 0) add('measurement-event-vanished', e, `イベント ${e} が今週 0 件（基線の週平均 ${round(bw)}）＝計測の破損を疑う`, { week: w, baseWeekly: round(bw) });
    }
  }
  const rec = ctx.bingReconciliation;
  if (rec?.ratio != null && rec.ratio > m.bingSessionsPerClickMax) {
    add('measurement-bing-mismatch', 'bing', `GA4 の bing 自然検索セッション ${rec.ga4Sessions} に対し Bing Webmaster のクリックは ${rec.wmtClicks}（${rec.ratio} 倍）＝bot 混入を疑う`, rec);
  }
  return out;
}

/** 期限を過ぎた実験（MEASURE_DUE / CLOSE_DUE / DECIDE_DUE / PENDING / NO_BASELINE / VERDICT_DUE）。 */
export function detectExperiments(experiments, nowMs) {
  return judgeLedger(experiments, nowMs).due.map((d) => {
    const kinds = d.reasons.map((r) => r.kind).sort().join('+');
    return {
      id: oppId('experiment-due', `${d.id}|${kinds}`), category: 'experiment', type: 'experiment-due', key: { experiment: d.id, reasons: kinds },
      title: `${d.id}（${d.title}）: ${d.reasons.map((r) => r.detail).join(' / ')}`,
      metrics: { status: d.status, nextCheckDate: d.nextCheckDate }, expectedWeeklyGain: null,
      suggest: ['verdict', 'defer'], watchwordDraft: null, review: d.review,
    };
  });
}

/** 週の差（startDate 同士）。 */
const weeksBetween = (fromWeekStart, toWeekStart) => Math.round((Date.parse(toWeekStart) - Date.parse(fromWeekStart)) / (7 * 86400000));

/**
 * triage-log の最新処分でこの週に表示すべきでないか。
 * defer は until まで、reject は suppressWeeks.reject 週、その他（起票・束ね・裁定）は suppressWeeks.adopted 週。
 * 同じ週（week）の処分では抑止しない＝トリアージ後に fetch-metrics を再実行しても表示対象が入れ替わらない。
 */
export function isSuppressed(id, log, { weekStart, today, suppressWeeks, week = null }) {
  const last = (log?.entries ?? []).filter((e) => e.id === id && (week == null || e.week !== week)).at(-1);
  if (!last) return false;
  if (last.action === 'defer') return Boolean(last.until && today < last.until);
  const since = weeksBetween(last.weekStart ?? weekStart, weekStart);
  return since < (last.action === 'reject' ? suppressWeeks.reject : suppressWeeks.adopted);
}

/**
 * カテゴリ内で期待効果の大きい順に並べ、SEO は 1 ページ 1 件に絞って表示件数を上限で切る。
 * measurement / experiment は全件。
 */
export function selectSurfaced(items, { log, weekStart, today, config, week = null }) {
  const live = items.filter((i) => !isSuppressed(i.id, log, { weekStart, today, suppressWeeks: config.suppressWeeks, week }));
  const suppressed = items.length - live.length;
  const byGain = (a, b) => (b.expectedWeeklyGain?.value ?? 0) - (a.expectedWeeklyGain?.value ?? 0) || a.id.localeCompare(b.id);
  const pick = (category, cap, onePerPage) => {
    const seen = new Set();
    const sorted = live.filter((i) => i.category === category).sort(byGain).filter((i) => {
      if (!onePerPage) return true;
      const p = i.key.page ?? i.id;
      if (seen.has(p)) return false;
      seen.add(p); return true;
    });
    return { surfaced: cap == null ? sorted : sorted.slice(0, cap), rest: cap == null ? 0 : Math.max(0, sorted.length - cap) };
  };
  const seo = pick('seo', config.surface.seo, true), rev = pick('revenue', config.surface.revenue, false);
  const meas = pick('measurement', null, false), exp = pick('experiment', null, false);
  return {
    surfaced: [...meas.surfaced, ...exp.surfaced, ...seo.surfaced, ...rev.surfaced],
    notSurfaced: { seo: seo.rest, revenue: rev.rest },
    suppressed,
  };
}

/** GA4（流入元グループ別）と GSC の週 vs 基線の週平均。 */
export function summarizeKpis(pack, rv) {
  const s = pack.sections;
  const kpi = { ga4: null, gsc: null, cta: null };
  if (s.ga4Landing?.ok) {
    const groups = {};
    for (const r of s.ga4Landing.rows) {
      const g = (groups[r.group] ??= { weekSessions: 0, baseSessions: 0, weekEngaged: 0, weekKeyEvents: 0, baseKeyEvents: 0 });
      g.weekSessions += r.week.sessions ?? 0; g.baseSessions += r.base.sessions ?? 0;
      g.weekEngaged += r.week.engagedSessions ?? 0;
      g.weekKeyEvents += r.week.keyEvents ?? 0; g.baseKeyEvents += r.base.keyEvents ?? 0;
    }
    kpi.ga4 = Object.fromEntries(Object.entries(groups).map(([g, v]) => [g, {
      sessions: v.weekSessions, baseWeeklySessions: round(v.baseSessions / 4), deltaPct: pct(v.weekSessions, v.baseSessions / 4),
      engagementRatePct: v.weekSessions ? round((v.weekEngaged / v.weekSessions) * 100) : null,
      keyEvents: v.weekKeyEvents, baseWeeklyKeyEvents: round(v.baseKeyEvents / 4),
    }]));
  }
  if (s.gscPageWeek?.ok && s.gscPageBase?.ok) {
    const t = (rows) => rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
    const w = t(s.gscPageWeek.rows), b = t(s.gscPageBase.rows);
    kpi.gsc = { clicks: w.clicks, baseWeeklyClicks: round(b.clicks / 4), deltaPct: pct(w.clicks, b.clicks / 4), impressions: w.impressions, baseWeeklyImpressions: round(b.impressions / 4), ctrPct: w.impressions ? round((w.clicks / w.impressions) * 100, 2) : null };
  }
  if (s.ga4Events?.ok) {
    const events = [...new Set([...rv.ctaClickEvents, ...rv.ctaImpressionEvents, 'quiz_start', 'quiz_complete', 'standards_data_download'])];
    kpi.cta = Object.fromEntries(events.map((e) => {
      const rows = s.ga4Events.rows.filter((r) => r.event === e);
      const w = rows.reduce((a, r) => a + r.week.count, 0), b = rows.reduce((a, r) => a + r.base.count, 0);
      return [e, { week: w, baseWeekly: round(b / 4), deltaPct: pct(w, b / 4) }];
    }));
  }
  return kpi;
}

/** 週の上位変動ページ（google 自然検索のランディングセッション）。情報であり機会ではない。 */
export function topMovers(pack, n = 5) {
  const s = pack.sections.ga4Landing;
  if (!s?.ok) return null;
  const rows = s.rows.filter((r) => r.group === 'google').map((r) => ({ page: r.page, week: r.week.sessions ?? 0, baseWeekly: round((r.base.sessions ?? 0) / 4) }))
    .map((r) => ({ ...r, delta: round(r.week - r.baseWeekly) })).filter((r) => r.week + r.baseWeekly >= 5);
  return {
    gainers: [...rows].sort((a, b) => b.delta - a.delta).slice(0, n).filter((r) => r.delta > 0),
    losers: [...rows].sort((a, b) => a.delta - b.delta).slice(0, n).filter((r) => r.delta < 0),
  };
}

/** GA4 の bing 自然検索セッション（週）と Bing Webmaster のクリック（週に掛かるバケット）の照合。 */
export function reconcileBing(pack, bing) {
  const ga4Sessions = pack.sections.ga4Landing?.ok ? pack.sections.ga4Landing.rows.filter((r) => r.group === 'bing').reduce((a, r) => a + (r.week.sessions ?? 0), 0) : null;
  const traffic = bing?.sections?.traffic;
  if (!traffic?.ok) return { ga4Sessions, wmtClicks: null, ratio: null, note: 'Bing Webmaster 未取得（欠測）' };
  const { startDate, endDate } = pack.period;
  const days = traffic.rows.filter((r) => r.date >= startDate && r.date <= endDate);
  const wmtClicks = days.reduce((a, r) => a + r.clicks, 0);
  return { ga4Sessions, wmtClicks, days: days.length, ratio: ga4Sessions != null && wmtClicks > 0 ? round(ga4Sessions / wmtClicks, 1) : null, note: days.length < 7 ? `Bing の日次が ${days.length}/7 日分` : null };
}

/** 入力ファイルの鮮度（欠測は measurement 機会になる）。 */
export function inputCoverage(name, file, isoTime, today, maxAgeDays) {
  if (!file) return { name, file: null, coverage: 'missing', note: '未取得' };
  if (isoTime && isoTime.slice(0, 10) < addDays(today, -maxAgeDays)) return { name, file, coverage: 'missing', note: `${isoTime.slice(0, 10)} 取得（${maxAgeDays} 日超）` };
  return { name, file, coverage: 'complete', note: null };
}
