#!/usr/bin/env node
/**
 * site-layout-census.mjs — sitemap 全ページの本文・右欄・目次・回遊・広告の配置を読み取り専用で実測する。
 * 用途: DN-1218 のレイアウト改修前に運営者が report.md と samples.json を読む。
 * 使い方: npm run site-layout-census -- --sample 2 / --report .tmp/site-layout-census/<UTC>
 * 罠: クリックせず計測通信を遮断する。フォントと段階スクロールは待つが画像完了は待たない。
 * 高さは CSS/画像属性に依存。width は pc/sp。非表示の右欄の空きは null（0 と混ぜない）。
 * --resume は成功済み URL×幅だけをスキップ。末尾の未完 JSON 行は再開時に切り戻す。
 * 集計は成功行だけ、ページ数は URL のユニーク数、位置・リンク数は URL×幅の観測単位。
 * exit 0=成立 / 1=対象ゼロ・実測ゼロ・取得失敗率超過 / 2=接続不能（sitemap/ブラウザ起動）。
 */
/* global console, process, URL, document, window, getComputedStyle, NodeFilter, setTimeout */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { guardBrowserLaunch, mergeLeanOptions } from './lib/playwright-launch.mjs';
import { fetchFailDominant, MAX_FETCH_FAIL_RATE } from './lib/inconclusive-gate.mjs';
import { SITE_ORIGIN } from './lib/site-identity.mjs';
import { isCliEntry } from './lib/cli-run.mjs';

const VIEWPORTS = { pc: { width: 1440, height: 900 }, sp: { width: 375, height: 812 } };
// affiliate-layout-shots と同じ遮断対象に afb の計測を追加。バナー画像は取得する。
export const BLOCK = /googletagmanager|google-analytics|analytics\.google|doubleclick|googlesyndication|cloudflareinsights|\/0\.gif\?a8mat=|moshimo\.com\/af\/i\/impression|(?:afi-b\.com|afb\.jp)\/(?:lead|track|impression|[a-z]+\/impression)/i;

export function classifyPath(path) {
  const p = path.split('?')[0].split('/').filter(Boolean);
  let pageKind = 'other';
  if (!p.length) pageKind = 'home';
  else if (p[0] === 'exam' && p.length === 2) pageKind = 'exam-category';
  else if ((p[0] === 'exam' && p.length === 4) || (['practice', 'laws'].includes(p[0]) && p.length === 2)) pageKind = 'doc';
  else if (p[0] === 'standards') pageKind = p[3] === 'chapters' && p[5] === 'sections' && p.length === 7 ? 'standards-section' : p[3] === 'chapters' && p.length === 5 ? 'standards-chapter' : 'standards-list';
  else if (p[0] === 'topics') pageKind = p.length > 1 ? 'topic' : 'topic-list';
  else if (p[0] === 'laws') pageKind = 'laws-list';
  else if (p[0] === 'tools') pageKind = 'tool';
  return { pageKind, category: p[0] === 'exam' ? p[1] ?? null : ['standards', 'practice', 'laws'].includes(p[0]) ? (p[0] === 'standards' ? p[1] ?? null : p[0]) : null, group: p[0] === 'exam' ? p[2] ?? null : null };
}

const keyOf = (r) => `${r.url}\t${r.width}`;
const successful = (r) => !r.error && r.status >= 200 && r.status < 400 && Number.isFinite(r.docH);
export function latestRows(rows) {
  return [...new Map(rows.map(r => [keyOf(r), r])).values()];
}
export function censusExitCode({ target, measured, failed, connectionError = false }) {
  if (connectionError) return 2;
  return !target || !measured || fetchFailDominant(failed, target) ? 1 : 0;
}
export function stats(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { median: null, p90: null, max: null };
  const m = Math.floor(v.length / 2);
  return { median: v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2, p90: v[Math.ceil(v.length * 0.9) - 1], max: v.at(-1) };
}
const groupBy = (rows, key) => {
  const groups = new Map();
  for (const r of rows) { const k = key(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  return groups;
};
const ref = r => ({ path: r.path, url: r.url, width: r.width, pageKind: r.pageKind, category: r.category, docH: r.docH, railContentEnd: r.railContentEnd, railEmptyPx: r.railEmptyPx, railEmptyRatio: r.railEmptyRatio });
export function buildReport(input) {
  const all = latestRows(input), rows = all.filter(successful);
  const groups = [...groupBy(rows, r => JSON.stringify([r.pageKind, r.category, r.width])).values()].map(rs => ({
    pageKind: rs[0].pageKind, category: rs[0].category, width: rs[0].width, count: rs.length,
    docH: stats(rs.map(r => r.docH)), railEmptyPx: stats(rs.map(r => r.railEmptyPx)), railEmptyRatio: stats(rs.map(r => r.railEmptyRatio)),
    railHalfEmpty: rs.filter(r => r.hasRail && r.railEmptyRatio >= 0.5).length,
  }));
  const toc = [...groupBy(rows, r => `${r.pageKind}/${r.width}`).values()].map(rs => ({
    pageKind: rs[0].pageKind, width: rs[0].width, count: rs.length,
    body: rs.filter(r => r.tocInBody?.visible).length, rail: rs.filter(r => r.tocInRail?.count > 0).length,
    none: rs.filter(r => !r.tocInBody?.visible && !r.tocInRail?.count).length,
  }));
  const surfaces = (field) => [...groupBy(rows.flatMap(r => (r[field] ?? []).map(s => ({ ...s, row: r }))), s => JSON.stringify([s.label ?? s.placement, s.inRail, s.row.width])).values()].map(ss => ({
    label: ss[0].label ?? ss[0].placement, inRail: ss[0].inRail, width: ss[0].row.width,
    pages: new Set(ss.map(s => s.row.url)).size, observations: ss.length,
    ...(field === 'navigation' ? { links: ss.reduce((n, s) => n + s.links, 0), withThumb: ss.reduce((n, s) => n + s.withThumb, 0), thumbRatio: ss.reduce((n, s) => n + s.withThumb, 0) / (ss.reduce((n, s) => n + s.links, 0) || 1) } : { meanPositionRatio: ss.reduce((n, s) => n + s.top / s.row.docH, 0) / ss.length }),
  }));
  const samples = [];
  for (const rs of groupBy(rows, r => JSON.stringify([r.pageKind, r.category])).values()) {
    // PC に右欄があるときは PC を代表にする。右欄がない種類は文書高で選ぶ。
    const candidates = rs.some(r => r.hasRail) ? rs.filter(r => r.hasRail) : rs.filter(r => r.width === (rs.some(s => s.width === 'pc') ? 'pc' : rs[0].width));
    const metric = r => r.hasRail ? r.railEmptyPx : r.docH;
    const median = stats(candidates.map(metric)).median;
    const near = [...candidates].sort((a, b) => Math.abs(metric(a) - median) - Math.abs(metric(b) - median) || a.path.localeCompare(b.path))[0];
    const max = [...candidates].sort((a, b) => metric(b) - metric(a) || a.path.localeCompare(b.path))[0];
    samples.push({ ...ref(near), reason: 'median', metric: near.hasRail ? 'railEmptyPx' : 'docH' });
    if (keyOf(near) !== keyOf(max)) samples.push({ ...ref(max), reason: 'max', metric: max.hasRail ? 'railEmptyPx' : 'docH' });
  }
  return {
    counts: { target: all.length, measured: rows.length, failed: all.length - rows.length },
    failures: all.filter(r => !successful(r)), groups,
    emptiest: rows.filter(r => r.hasRail).sort((a, b) => b.railEmptyPx - a.railEmptyPx).slice(0, 30).map(ref), toc,
    missingToc: rows.filter(r => r.h2Count >= 5 && !r.tocInBody?.visible && !r.tocInRail?.count).map(ref),
    navigation: surfaces('navigation'), ads: surfaces('ads'), notes: surfaces('notes'),
    noAds: [...groupBy(rows.filter(r => !r.ads?.length), r => `${r.pageKind}/${r.width}`).values()].map(rs => ({ pageKind: rs[0].pageKind, width: rs[0].width, count: rs.length, examples: rs.slice(0, 5).map(ref) })),
    noFirstViewBody: [...groupBy(rows.filter(r => r.articleTop !== null && !r.firstViewHasBody), r => r.width).values()].map(rs => ({ width: rs[0].width, count: rs.length, top: rs.sort((a, b) => b.articleTop - a.articleTop).slice(0, 30).map(r => ({ ...ref(r), articleTop: r.articleTop })) })),
    overflow: rows.filter(r => r.overflowX > 0).map(r => ({ ...ref(r), overflowX: r.overflowX })),
    brokenImages: rows.filter(r => r.brokenImages > 0).map(r => ({ ...ref(r), brokenImages: r.brokenImages })), samples,
  };
}

/** ブラウザ内だけで呼ぶ。画面外も含めた「CSS 上表示される要素」を文書座標で測る。 */
export function measureInPage() {
  const visible = el => {
    if (!el || !el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, w: r.width, h: r.height }; };
  const main = document.querySelector('main');
  if (!main) throw new Error('main が無い');
  const rail = [...document.querySelectorAll('aside')].find(el => el.classList.contains('w-[316px]') && visible(el));
  const inRail = el => Boolean(rail?.contains(el));
  const prose = [...main.querySelectorAll('.prose-blog, .prose')].find(visible);
  let articleTop = null;
  if (prose) {
    const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      const offset = text.textContent.search(/\S/);
      if (offset < 0 || !visible(text.parentElement) || text.parentElement.closest('script,style')) continue;
      const range = document.createRange(); range.setStart(text, offset); range.setEnd(text, offset + 1);
      const r = range.getBoundingClientRect();
      if (r.width && r.height) { articleTop = r.top + window.scrollY; break; }
    }
  }
  const all = (selector, root = document) => [...root.querySelectorAll(selector)].filter(visible);
  const tocs = all('.toc-content, nav[aria-label*="目次"], [data-cta-label*="toc"]');
  // 折り畳み目次は表題が見えていれば存在と数を記録。開く操作はしない。
  const tocRoots = tocs.filter(el => !tocs.some(other => other !== el && other.contains(el)));
  const bodyStartEnd = prose?.querySelector('h2') ? rect(prose.querySelector('h2')).top : articleTop;
  const bodyToc = tocRoots.filter(el => !inRail(el) && main.contains(el) && (bodyStartEnd === null || rect(el).top <= bodyStartEnd));
  const railToc = tocRoots.filter(inRail);
  const countLinks = els => els.reduce((n, el) => n + el.querySelectorAll('a[href]').length, 0);
  const label = el => el.getAttribute('data-cta-label') || el.querySelector('[data-cta-label]')?.getAttribute('data-cta-label') || el.querySelector('h2,h3,h4,.toc-title')?.textContent.trim() || el.textContent.trim().slice(0, 80);
  const blockKind = el => {
    const ctas = [el, ...el.querySelectorAll('[data-cta]')].map(e => e.getAttribute('data-cta'));
    if (ctas.includes('affiliate')) return 'ad';
    if (ctas.includes('note')) return 'note';
    if (el.matches('.toc-content,.toc-scroll') || el.querySelector('.toc-content') || /目次/.test(label(el))) return 'toc';
    if (/著者|運営者|プロフィール|author/i.test(label(el))) return 'author';
    return ctas.includes('nav') ? 'nav' : 'other';
  };
  // shell 直下の単なるスタックをほどき、カード境界（border/背景/section/nav）で止める。
  const blocks = el => [...el.children].filter(visible).flatMap(child => {
    const cs = getComputedStyle(child);
    const boundary = child.matches('section,nav,[data-cta],[data-article-sidebar-card],.toc-scroll') || parseFloat(cs.borderTopWidth) > 0 || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
    return !boundary && child.children.length && !child.matches('a,p,h2,h3,img') ? blocks(child) : [child];
  });
  const railBlocks = rail ? blocks(rail).sort((a, b) => rect(a).top - rect(b).top).map(el => ({ kind: blockKind(el), label: label(el), h: rect(el).h })) : [];
  // 伸びた wrapper を含めると空きが消えるため、可視の末端要素の下端を使う。
  const ends = rail ? all('*', rail).filter(el => ![...el.children].some(visible)).map(el => rect(el).bottom) : [];
  const railContentEnd = rail ? Math.max(rect(rail).top, ...ends) : null;
  const mainBox = rect(main), railEmptyPx = rail ? Math.max(0, mainBox.bottom - railContentEnd) : null;
  return {
    docH: document.documentElement.scrollHeight, mainH: mainBox.h, articleTop,
    firstViewHasBody: articleTop === null ? null : articleTop < window.innerHeight && articleTop >= 0,
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    hasRail: Boolean(rail), railContentEnd, railEmptyPx, railEmptyRatio: rail ? railEmptyPx / mainBox.h : null, railBlocks,
    tocInBody: { visible: bodyToc.length > 0, count: countLinks(bodyToc) }, tocInRail: { count: countLinks(railToc), h: railToc.reduce((n, el) => n + rect(el).h, 0) },
    h2Count: all('h2', prose ?? main).length,
    navigation: all('[data-cta="nav"]').map(el => { const links = all('a', el); return { label: label(el), links: links.length, withThumb: links.filter(a => a.hasAttribute('data-thumb') || a.querySelector('img')).length, inRail: inRail(el), top: rect(el).top }; }),
    ads: all('a[data-cta="affiliate"]').map(el => ({ placement: el.dataset.ctaPlacement ?? '', program: el.dataset.ctaProgram ?? '', kind: all('img', el).some(i => rect(i).w > 2 && rect(i).h > 2) ? 'img' : 'card', ...rect(el), inRail: inRail(el) })),
    notes: all('a[data-cta="note"]').map(el => ({ placement: el.dataset.ctaPlacement ?? '', label: label(el), ...rect(el), inRail: inRail(el) })),
    brokenImages: all('img').filter(i => i.complete && i.naturalWidth === 0 && rect(i).w > 2 && rect(i).h > 2 && Boolean(i.currentSrc || i.getAttribute('src')) && !/0\.gif\?a8mat=|impression|google-analytics|afi-b\.com\/lead/i.test(i.currentSrc || i.src)).length,
  };
}

export function loadSitemap(base, getText = url => execFileSync('curl', ['--ssl-no-revoke', '-fsSL', '--max-time', '30', url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })) {
  const seen = new Set(), urls = new Set();
  // &amp; は最後に戻す（先に戻すと &amp;lt; が < まで二重に戻る。CodeQL js/double-escaping）
  const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const visit = url => {
    if (seen.has(url)) return;
    seen.add(url);
    const xml = getText(url);
    if (!/<(?:\w+:)?(?:urlset|sitemapindex)\b/.test(xml)) throw new Error(`sitemap XML ではない: ${url}`);
    const locs = [...xml.matchAll(/<(?:\w+:)?loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/(?:\w+:)?loc>/gs)].map(m => new URL(decode(m[1].trim()), url));
    for (const loc of locs) {
      // ローカル --base でも本番 origin の sitemap を使えるよう origin を指定先に揃える。
      const target = new URL(loc.pathname + loc.search, base).href;
      if (/<(?:\w+:)?sitemapindex\b/.test(xml)) visit(target); else urls.add(target);
    }
  };
  visit(new URL('/sitemap.xml', base).href);
  return [...urls].sort();
}

export function readRows(file, repair = false) {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, 'utf8'), lines = text.split('\n'), rows = [];
  let valid = '';
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    try { rows.push(JSON.parse(lines[i])); valid += `${lines[i]}\n`; }
    catch (e) { if (i !== lines.length - 1) throw e; if (repair) writeFileSync(file, valid); return rows; }
  }
  if (repair && text && !text.endsWith('\n')) appendFileSync(file, '\n');
  return rows;
}
const writeJson = (dir, name, data) => writeFileSync(join(dir, name), `${JSON.stringify(data, null, 2)}\n`);
function writeReport(dir) {
  const report = buildReport(readRows(join(dir, 'rows.jsonl')));
  writeJson(dir, 'report.json', report); writeJson(dir, 'samples.json', report.samples);
  const headings = { groups: '種類 × カテゴリ × 幅（P90 は nearest-rank）', emptiest: '右欄の空き 上位30', toc: '目次（本文と右欄は重複あり）', missingToc: 'H2 が5個以上で目次なし', navigation: '回遊の面', ads: '広告の面', notes: 'note の面', noAds: '広告なし', noFirstViewBody: '最初の画面に本文なし', overflow: '横はみ出し', brokenImages: '読み込めない画像', failures: '計測失敗', samples: '目視候補（全種類 × カテゴリ、上限による切捨てなし）' };
  const md = ['# サイトレイアウト実測', '', `対象 ${report.counts.target}・実測 ${report.counts.measured}・失敗 ${report.counts.failed}`, '', '件数は URL × 幅。pages は URL のユニーク数。右欄なしは null として空きの統計から除外。'];
  for (const [key, title] of Object.entries(headings)) md.push('', `## ${title}`, '', '```json', JSON.stringify(report[key], null, 2), '```');
  writeFileSync(join(dir, 'report.md'), `${md.join('\n')}\n`);
  return report.counts;
}

export async function main(argv = process.argv.slice(2)) {
  const flags = parseCliArgs({ help: { type: 'boolean' }, base: { type: 'string', default: SITE_ORIGIN }, only: { type: 'string', default: '' }, limit: { type: 'number', default: 0 }, sample: { type: 'number', default: 0 }, widths: { type: 'string', default: 'pc,sp' }, concurrency: { type: 'number', default: 4 }, out: { type: 'string' }, resume: { type: 'string' }, report: { type: 'string' } }, argv);
  if (flags.help) {
    console.log('Usage: npm run site-layout-census -- [--base URL] [--only 部分一致] [--limit N] [--sample N（種類ごと）] [--widths pc,sp] [--concurrency 4] [--out DIR] [--resume DIR] [--report DIR]\n出力: .tmp/site-layout-census/<UTC>/ rows.jsonl・summary.json。--report はブラウザ不要。'); return 0;
  }
  const print = counts => console.log(`対象 ${counts.target}・実測 ${counts.measured}・失敗 ${counts.failed}`);
  if (flags.report) { const counts = writeReport(resolve(REPO_ROOT, flags.report)); print(counts); return censusExitCode(counts); }
  const widths = [...new Set(flags.widths.split(','))];
  if (widths.some(w => !VIEWPORTS[w]) || ![flags.limit, flags.sample, flags.concurrency].every(Number.isInteger) || flags.limit < 0 || flags.sample < 0 || flags.concurrency < 1) throw new Error('widths/limit/sample/concurrency が不正');
  const dir = resolve(REPO_ROOT, flags.resume || flags.out || `.tmp/site-layout-census/${new Date().toISOString().replace(/:/g, '-')}`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'rows.jsonl');
  if (!flags.resume && existsSync(file)) throw new Error('rows.jsonl が既存。--resume を使ってください');
  const old = flags.resume ? latestRows(readRows(file, true)) : [];
  let urls;
  const finish = (rows, target, error = null, connectionError = false) => {
    const failures = rows.filter(r => !successful(r));
    const counts = { target, measured: rows.filter(successful).length, failed: failures.length };
    const notMeasured = Math.max(0, target - rows.length);
    writeJson(dir, 'summary.json', { ...counts, notMeasured, failures, error, connectionError, maxFetchFailRate: MAX_FETCH_FAIL_RATE, generatedAt: new Date().toISOString() }); print(counts);
    return censusExitCode({ ...counts, connectionError });
  };
  let tasks;
  const planFile = join(dir, 'plan.json');
  if (flags.resume && existsSync(planFile)) {
    tasks = JSON.parse(readFileSync(planFile, 'utf8')).tasks;
  } else {
    try { urls = loadSitemap(flags.base).filter(url => url.includes(flags.only)); }
    catch (e) { return finish([], 0, e.message, true); }
    if (flags.sample) urls = [...groupBy(urls, u => classifyPath(new URL(u).pathname).pageKind).values()].flatMap(rs => rs.slice(0, flags.sample));
    if (flags.limit) urls = urls.slice(0, flags.limit);
    tasks = urls.flatMap(url => widths.map(width => ({ url, path: new URL(url).pathname, width, ...classifyPath(new URL(url).pathname) })));
    writeJson(dir, 'plan.json', { base: flags.base, tasks });
  }
  const wanted = new Set(tasks.map(keyOf)), results = new Map(old.filter(r => wanted.has(keyOf(r))).map(r => [keyOf(r), r]));
  const pending = tasks.filter(t => !successful(results.get(keyOf(t)) ?? {}));
  if (!pending.length) return finish([...results.values()], tasks.length);
  let browser;
  try { guardBrowserLaunch(); const { chromium } = await import('playwright'); browser = await chromium.launch(mergeLeanOptions({ headless: true })); }
  catch (e) { return finish([...results.values()], tasks.length, e.message, true); }
  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const task = pending[cursor++]; let context, status = null, row;
      try {
        context = await browser.newContext({ viewport: VIEWPORTS[task.width], serviceWorkers: 'block', locale: 'ja-JP' });
        await context.route(BLOCK, route => route.abort());
        const page = await context.newPage();
        const response = await page.goto(task.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        status = response?.status() ?? null;
        if (!status || status >= 400) throw new Error(`HTTP ${status}`);
        await page.addStyleTag({ content: '*{scroll-behavior:auto!important}' });
        await page.evaluate(async () => {
          await Promise.race([document.fonts.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('フォント待機 timeout')), 30000))]);
          const step = Math.max(400, window.innerHeight - 100);
          let y = 0;
          for (let i = 0; i < 2000; i++) {
            window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30));
            if (y >= document.documentElement.scrollHeight - window.innerHeight) break;
            y += step;
            if (i === 1999) throw new Error('スクロールが収束しない');
          }
          window.scrollTo(0, 0);
        });
        // content-visibility:auto の推定高さへ戻らないよう、全段落の実レイアウトを固定する。
        await page.addStyleTag({ content: '*{content-visibility:visible!important;scroll-behavior:auto!important}' });
        row = { ...task, status, ...await page.evaluate(measureInPage) };
      } catch (e) { row = { ...task, status, error: e.message }; }
      finally { if (context) await context.close().catch(() => {}); }
      appendFileSync(file, `${JSON.stringify(row)}\n`); results.set(keyOf(row), row);
    }
  };
  try { await Promise.all(Array.from({ length: Math.min(flags.concurrency, pending.length) }, worker)); }
  finally { await browser.close(); }
  return finish([...results.values()], tasks.length);
}
if (isCliEntry(import.meta.url)) {
  main().then(code => { process.exitCode = code; }).catch(e => { console.error(e.message); console.log('対象 0・実測 0・失敗 0（検査不成立）'); process.exitCode = 1; });
}
