/**
 * X の返信候補を選ぶ純関数（通信とファイルを持たない）。
 * 入力は Yahoo!リアルタイム検索のページ。配慮が要る投稿は本文を残さず件数だけ返す。
 */
import { createHash } from 'node:crypto';
import { jstDayOf } from './jst-date.mjs';

const NEXT_DATA = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

const includesAny = (text, words) => words.some((w) => text.includes(w));

export function cleanText(raw) {
  return String(raw ?? '').replace(/\t(?:START|END)\t/g, '').replace(/\s+/g, ' ').trim();
}

/** 検索ページから投稿を取り出す。構造が変わったら null を返し、呼び出し側が失敗として数える。 */
export function parseRealtimeHtml(html) {
  const match = NEXT_DATA.exec(html);
  if (!match) return null;
  let entries;
  try {
    entries = JSON.parse(match[1])?.props?.pageProps?.pageData?.timeline?.entry;
  } catch {
    return null;
  }
  if (!Array.isArray(entries)) return null;
  return entries.map((e) => ({
    id: String(e.id),
    user: String(e.screenName ?? ''),
    text: cleanText(e.displayTextBody ?? e.displayText),
    createdAt: Number(e.createdAt) * 1000,
    replyCount: Number(e.replyCount ?? 0),
    likes: Number(e.likesCount ?? 0),
    inReplyTo: String(e.inReplyTo ?? ''),
    url: `https://x.com/${e.screenName}/status/${e.id}`,
  }));
}

export function hashUser(user) {
  return createHash('sha256').update(String(user).toLowerCase()).digest('hex').slice(0, 12);
}

/** care は supplier より先に判定する。配慮が要る本人の投稿を「宣伝」に落とさないため。 */
export function classifyPost(post, config) {
  const { text, user } = post;
  if (config.excludeAccounts.includes(user)) return 'supplier';
  if (post.inReplyTo || text.startsWith('RT @')) return 'reply';
  if (includesAny(text, config.careWords)) return 'care';
  if (includesAny(text, config.supplierWords)) return 'supplier';
  if (includesAny(text, config.askWords)) return 'ask';
  if (includesAny(text, config.failWords)) return 'fail';
  if (includesAny(text, config.passWords)) return 'pass';
  return 'other';
}

const ORDER = { ask: 0, pass: 1, fail: 2 };

/** 1 アカウント 1 件。尋ねている投稿 → 合格 → 不合格 → 新しい順に並べて上限で切る。 */
export function selectCandidates(posts, config, { now, repliedHashes = new Set(), skippedHashes = new Set() }) {
  const since = now - config.limits.lookbackHours * 3600_000;
  const counts = { total: 0, old: 0, replied: 0, skipped: 0, care: 0, supplier: 0, reply: 0, other: 0 };
  const seen = new Set();
  const byUser = new Map();
  for (const post of posts) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    counts.total += 1;
    if (post.createdAt < since) { counts.old += 1; continue; }
    const hash = hashUser(post.user);
    if (repliedHashes.has(hash)) { counts.replied += 1; continue; }
    if (skippedHashes.has(hash)) { counts.skipped += 1; continue; }
    const kind = classifyPost(post, config);
    if (!(kind in ORDER)) { counts[kind] += 1; continue; }
    const prev = byUser.get(post.user);
    const better = !prev || ORDER[kind] < ORDER[prev.kind]
      || (ORDER[kind] === ORDER[prev.kind] && post.createdAt > prev.createdAt);
    if (better) byUser.set(post.user, { ...post, kind });
  }
  const candidates = [...byUser.values()]
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || b.createdAt - a.createdAt)
    .slice(0, config.limits.candidatesPerRun);
  return { candidates, counts };
}

/** 送信の前に通す門番。理由があれば文字列を返す。 */
export function checkSendAllowed(log, { user, now, limits, trial, skips = [] }) {
  const day = jstDayOf(now);
  if (day < trial.from || day > trial.to) return `試行期間（${trial.from}〜${trial.to}）の外です`;
  const sameDay = log.filter((r) => jstDayOf(Date.parse(r.at)) === day);
  if (sameDay.length >= limits.maxPerDay) return `今日はすでに ${sameDay.length} 件送っています（上限 ${limits.maxPerDay} 件）`;
  const last = Math.max(0, ...log.map((r) => Date.parse(r.at)));
  const waited = (now - last) / 60_000;
  if (waited < limits.minIntervalMinutes) return `前の返信から ${Math.floor(waited)} 分です（${limits.minIntervalMinutes} 分あけます）`;
  if (log.some((r) => r.userHash === hashUser(user))) return 'この相手にはすでに返信しています';
  if (skips.some((r) => r.userHash === hashUser(user))) return 'この相手は見送りにしています';
  return null;
}
