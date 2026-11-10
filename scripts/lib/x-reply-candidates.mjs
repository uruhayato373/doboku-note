/**
 * X の返信候補を選ぶ純関数（通信とファイルを持たない）。
 * 入力は Yahoo!リアルタイム検索のページと、内蔵ブラウザで読んだ X のタイムライン・検索の投稿（parseXPosts）。
 * 話題（config.topics＝資格のまとまり）ごとに振り分けて上限で切る。配慮が要る投稿は本文を残さず件数だけ返す。
 */
import { createHash } from 'node:crypto';
import { jstDayOf } from './jst-date.mjs';

const NEXT_DATA = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

const includesAny = (text, words) => words.some((w) => text.includes(w));

/**
 * 返信の下書きに含まれる、相手を評価する・指図する言い方（config の toneWords）を返す。
 * 合格者が受験者を採点しているように読める言い方を、確認画面を作る前に止める（2026-11-09 運営者の指摘）。
 */
export function toneIssues(text, config) {
  return (config.toneWords ?? []).filter((w) => text.includes(w));
}

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
  return entries.map(entryToPost);
}

const entryToPost = (e) => ({
  id: String(e.id),
  user: String(e.screenName ?? ''),
  name: String(e.name ?? ''),
  text: cleanText(e.displayTextBody ?? e.displayText),
  createdAt: Number(e.createdAt) * 1000,
  replyCount: Number(e.replyCount ?? 0),
  likes: Number(e.likesCount ?? 0),
  inReplyTo: String(e.inReplyTo ?? ''),
  url: `https://x.com/${e.screenName}/status/${e.id}`,
});

/** 検索の続き（`/realtime/api/v1/pagination?p=…&oldestTweetId=…`・10 件ずつ）の応答から投稿を取り出す。形が違えば null。 */
export function parseRealtimeApi(json) {
  const entries = json?.timeline?.entry;
  return Array.isArray(entries) ? entries.map(entryToPost) : null;
}

/**
 * Yahoo!リアルタイム検索を、最初のページ（約 40 件）のあと「続き」で since まで古い方へたどる。
 * 1 ページ目は約 40 件で止まり、「技術士」だけで 8 時間分にしかならなかった（2026-11-10 実測）ので、続きを読まないと取りこぼす。
 * fetchFirst() は 1 ページ目の投稿、fetchNext(oldestId) は続きの投稿（どちらも失敗なら null か例外）を返す。
 * 返り値の stop は止めた理由: since（読み切った）・end（続きが無い）・maxPages（上限で打ち切り）・error（続きの取得に失敗）。
 */
export async function paginateRealtime({ fetchFirst, fetchNext, since, maxPages }) {
  const first = await fetchFirst();
  if (!first) throw new Error('ページの構造が想定と違います');
  const posts = [...first];
  const oldest = () => posts.reduce((a, p) => (BigInt(p.id) < BigInt(a.id) ? p : a));
  let pages = 0;
  let stop = 'end';
  while (posts.length) {
    if (oldest().createdAt < since) { stop = 'since'; break; }
    if (pages >= maxPages) { stop = 'maxPages'; break; }
    let next;
    try {
      next = await fetchNext(oldest().id);
    } catch {
      next = null;
    }
    pages += 1;
    if (!next) { stop = 'error'; break; }
    const fresh = next.filter((p) => !posts.some((q) => q.id === p.id));
    if (!fresh.length) { stop = 'end'; break; }
    posts.push(...fresh);
  }
  return { posts, pages, stop, oldestAt: posts.length ? Math.min(...posts.map((p) => p.createdAt)) : null };
}

/**
 * 内蔵ブラウザで X のタイムライン・検索から取り出した投稿（scripts/lib/x-reply-screens.mjs の buildExtractorJs の出力）を検査して揃える。
 * 形の合わない行は捨て、捨てた数を返す（黙って 0 件にしない）。
 */
export function parseXPosts(rows) {
  const posts = [];
  let invalid = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    const ok = r && /^\d+$/.test(String(r.id)) && /^[A-Za-z0-9_]{1,15}$/.test(String(r.user)) && typeof r.text === 'string' && Number.isFinite(Number(r.createdAt));
    if (!ok) { invalid += 1; continue; }
    posts.push({
      id: String(r.id),
      user: String(r.user),
      name: String(r.name ?? ''),
      text: cleanText(r.text),
      createdAt: Number(r.createdAt),
      replyCount: 0,
      likes: 0,
      inReplyTo: r.isReply ? 'x' : '',
      url: `https://x.com/${r.user}/status/${r.id}`,
      source: 'x',
    });
  }
  return { posts, invalid };
}

/**
 * 投稿をどの話題（資格）に振り分けるか。本文に話題の語（match）が入っているときに振り分ける。
 * 検索語で取った投稿は、その検索語の話題を先に見る（「施工管理 勉強」で建築・電気の投稿まで拾うので、語の確認を省かない）。
 * 本文に資格の語が無くても、表示名に資格の語があり（「技術士目指してます」など）本文に試験の文脈の語（contextWords）があれば振り分ける。
 * 受験者は「筆記通った」とだけ書くことが多く、本文だけでは取りこぼす（2026-11-10 X の検索で実測）。
 */
export function topicOf(post, topics, contextWords = []) {
  const first = post.topic ? topics.filter((t) => t.id === post.topic) : [];
  const ordered = [...first, ...topics];
  const byText = ordered.find((t) => includesAny(post.text, t.match));
  if (byText) return byText;
  if (!post.name || !includesAny(post.text, contextWords)) return null;
  return ordered.find((t) => includesAny(post.name, t.match)) ?? null;
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
  if (includesAny(text, config.failWords) || (config.failPatterns ?? []).some((p) => new RegExp(p, 'u').test(text))) return 'fail';
  if (includesAny(text, config.passWords)) return 'pass';
  if (includesAny(text, config.studyWords ?? [])) return 'study';
  return 'other';
}

const ORDER = { ask: 0, pass: 1, fail: 2, study: 3 };

/**
 * 1 アカウント 1 件。尋ねている投稿 → 合格 → 不合格 → 勉強・直前 → 新しい順に並べ、話題ごとの上限（perTopic）と全体の上限で切る。
 * どの話題（資格）にも当たらない投稿は「無関係」に数える。
 */
export function selectCandidates(posts, config, { now, repliedHashes = new Set(), skippedHashes = new Set() }) {
  const since = now - config.limits.lookbackHours * 3600_000;
  const counts = { total: 0, old: 0, replied: 0, skipped: 0, care: 0, supplier: 0, reply: 0, other: 0, offTopic: 0, overTopicLimit: 0 };
  // 外した投稿を理由つきで残す（語の調整に使う）。配慮の投稿は本文を残さない
  const excluded = [];
  const drop = (post, reason) => { counts[reason] += 1; if (reason !== 'care') excluded.push({ id: post.id, user: post.user, reason, text: post.text, url: post.url, source: post.source ?? 'yahoo' }); };
  const topics = config.topics ?? [];
  const seen = new Set();
  const byUser = new Map();
  for (const post of posts) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    counts.total += 1;
    if (post.createdAt < since) { drop(post, 'old'); continue; }
    const hash = hashUser(post.user);
    if (repliedHashes.has(hash)) { drop(post, 'replied'); continue; }
    if (skippedHashes.has(hash)) { drop(post, 'skipped'); continue; }
    const topic = topics.length ? topicOf(post, topics, config.nameContextWords) : null;
    if (topics.length && !topic) { drop(post, 'offTopic'); continue; }
    const kind = classifyPost(post, config);
    if (!(kind in ORDER)) { drop(post, kind); continue; }
    const prev = byUser.get(post.user);
    const better = !prev || ORDER[kind] < ORDER[prev.kind]
      || (ORDER[kind] === ORDER[prev.kind] && post.createdAt > prev.createdAt);
    if (better) byUser.set(post.user, { ...post, kind, topic: topic?.id ?? null, topicLabel: topic?.label ?? null });
  }
  const sorted = [...byUser.values()].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || b.createdAt - a.createdAt);
  const perTopic = new Map();
  const candidates = [];
  for (const c of sorted) {
    const n = perTopic.get(c.topic) ?? 0;
    if (config.limits.perTopic && n >= config.limits.perTopic) { drop(c, 'overTopicLimit'); continue; }
    if (candidates.length >= config.limits.candidatesPerRun) { drop(c, 'overTopicLimit'); continue; }
    perTopic.set(c.topic, n + 1);
    candidates.push(c);
  }
  return { candidates, counts, excluded };
}

/** 送信の前に通す門番。理由があれば文字列を返す。 */
/**
 * answer=true は、返信した相手からの質問に答える返事（2026-11-08 運営者の判断「質問には答える」）。
 * 同じ相手への 2 回目を通すのは、その相手にすでに返信している（＝相手が質問してきた会話がある）ときだけ。間隔と見送りはそのまま効かせる。
 */
export function checkSendAllowed(log, { user, now, limits, trial, skips = [], answer = false }) {
  const day = jstDayOf(now);
  // to が無ければ終わりを決めない（2026-11-11 に試行から継続の運用へ）
  if (day < trial.from || (trial.to && day > trial.to)) return `送信してよい期間（${trial.from}〜${trial.to ?? ''}）の外です`;
  const last = Math.max(0, ...log.map((r) => Date.parse(r.at)));
  const waited = (now - last) / 60_000;
  if (waited < limits.minIntervalMinutes) return `前の返信から ${Math.floor(waited)} 分です（${limits.minIntervalMinutes} 分あけます）`;
  const replied = log.some((r) => r.userHash === hashUser(user));
  if (answer && !replied) return 'この相手にはまだ返信していません（質問への答えは返信した相手にだけ送ります）';
  if (!answer && replied) return 'この相手にはすでに返信しています（相手からの質問に答えるなら --answer）';
  if (skips.some((r) => r.userHash === hashUser(user))) return 'この相手は見送りにしています';
  return null;
}
