/**
 * egov-laws.mjs — 記事の e-Gov 法令検索へのリンクと、参考文献の台帳の法令を、e-Gov 法令 API の写し
 * （config/egov-laws.json）と照合する唯一の実装。
 *
 * 2026-10-13 に、記事の e-Gov へのリンクのうち 13 法令（17 記事・26 か所）の法令 ID が存在しなかった
 * （議員立法の AC1 と内閣提出の AC0 の取り違えなど）。e-Gov の画面は存在しない ID でも HTTP 200 を返すので、
 * リンク切れの検査では見つからない。法令 ID と条の番号は API の写しと照合する。
 *
 * 読み手: scripts/egov-laws.mjs（--check は CI・--drift は ops）。
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const EGOV_API = 'https://laws.e-gov.go.jp/api/2';
/** 記事の e-Gov 法令検索へのリンク（法令 ID と、条のアンカー #Mp-At_<番号>）。 */
const LINK = /https?:\/\/laws\.e-gov\.go\.jp\/law\/([0-9A-Z]+)(?:\/[^\s)"'#]*)?(?:#Mp-At_([0-9_]+))?/g;

/** 参考文献の台帳で法令として扱う項目（e-Gov の法令 ID を持つべきもの）。 */
export function isLawSource(source) {
  return source.class === 'external-primary' && (/-(act|order|rules)$/.test(source.id) || source.id === 'japan-constitution');
}

/** 本文の e-Gov へのリンクを行番号つきで拾う。 */
export function egovLinksOf(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(LINK)) out.push({ lawId: m[1], article: m[2] ?? null, line: i + 1 });
  });
  return out;
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/**
 * e-Gov 法令 API から 1 法令を取る。取れなければ { error }（ID が無いときは missing: true）。
 * 続けて取ると API が応答を返さなくなるので、間を空け、取れなければ間を延ばして 3 回まで取り直す。
 */
export function fetchEgovLaw(lawId, { tries = 3, gapMs = 400 } = {}) {
  let last = null;
  for (let i = 0; i < tries; i += 1) {
    sleep(gapMs * (i === 0 ? 1 : 5 * i));
    last = fetchOnce(lawId);
    if (!last.error || last.missing) return last;
  }
  return last;
}

function fetchOnce(lawId) {
  let body;
  try {
    body = execFileSync('curl', ['-s', '--ssl-no-revoke', '--max-time', '60', `${EGOV_API}/law_data/${lawId}?law_full_text_format=json`], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  } catch (e) {
    return { error: `取得できない（${e.message.split('\n')[0]}）` };
  }
  let d;
  try {
    d = JSON.parse(body);
  } catch {
    return { error: '応答が JSON でない' };
  }
  if (!d.law_full_text) return { error: d.message ?? '本文が無い', missing: true };
  const articles = [];
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    // 本則の条だけ（附則の条は番号が重なるので数えない）
    if (n.tag === 'SupplProvision') return;
    if (n.tag === 'Article' && n.attr?.Num) articles.push(n.attr.Num);
    for (const c of n.children ?? []) walk(c);
  };
  walk(d.law_full_text);
  return {
    title: d.revision_info?.law_title ?? d.law_info?.law_title ?? lawId,
    lawNum: d.law_info?.law_num ?? '',
    enforced: d.revision_info?.amendment_enforcement_date ?? null,
    articles: [...new Set(articles)],
  };
}

/** 記事のリンクの違反（法令 ID が写しに無い・条が無い）。 */
export function linkIssues(files, laws) {
  const issues = [];
  let links = 0;
  for (const file of files) {
    for (const l of egovLinksOf(readFileSync(file.abs, 'utf8'))) {
      links += 1;
      const law = laws[l.lawId];
      if (!law) issues.push(`${file.rel}:${l.line}: 法令 ID ${l.lawId} が e-Gov の写しに無い（存在しない ID か、--sync 前の新しいリンク）`);
      else if (l.article && !law.articles.includes(l.article)) issues.push(`${file.rel}:${l.line}: ${law.title} に条 ${l.article.replace(/_/g, 'の')} が無い（#Mp-At_${l.article}）`);
    }
  }
  return { issues, links };
}

/** 参考文献の台帳の法令の違反（e-Gov の法令 ID が無い・写しに無い）。 */
export function registryIssues(sources, laws) {
  const issues = [];
  const lawSources = sources.filter(isLawSource);
  for (const s of lawSources) {
    if (!s.egov) issues.push(`参考文献 ${s.id}（${s.title}）: e-Gov の法令 ID（egov.lawId）か、無い理由（egov.none）が無い`);
    else if (s.egov.lawId && !laws[s.egov.lawId]) issues.push(`参考文献 ${s.id}（${s.title}）: 法令 ID ${s.egov.lawId} が e-Gov の写しに無い（--sync）`);
  }
  return { issues, checked: lawSources.length };
}

/** 写しより後に改正が施行された法令（e-Gov の今の施行日と比べる）。 */
export function amendedSince(laws, fresh) {
  return Object.entries(fresh)
    .filter(([id, f]) => !f.error && laws[id] && f.enforced && f.enforced !== laws[id].enforced)
    .map(([id, f]) => ({ lawId: id, title: f.title, before: laws[id].enforced, now: f.enforced }));
}
