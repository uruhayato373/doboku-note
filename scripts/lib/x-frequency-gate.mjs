/**
 * x-frequency-gate.mjs — X 投稿の頻度・重複ゲート（CI cron 経路専用・純関数）
 * ---------------------------------------------------------------------------
 * 背景（2026-06-12 凍結事故）: 短時間の連投・同一テンプレ反復・毎日同時刻の機械的投稿は
 * X の spam / platform manipulation 判定に触れる。手元 Playwright 実行では人が都度目視して
 * いた歯止めを、CI（cron・Playwright・encrypted-state）で自動投稿するときはコードで再現する。
 *
 * 方針:
 *   1. `evaluateXFrequencyGate` は fs・ネットワークを一切触らない純関数。live 取得
 *      （readOwnTimeline 等）と ledger 読込（loadLedger）は呼び出し側の責務として分離する。
 *   2. **判定不能は必ず block**（allow:false）。live が取得できない／台帳が読めない／
 *      アカウント状態が ok でない、のいずれも「投稿しない」側に倒す。
 *   3. limits は呼び出し側の CLI 引数で下げる方向（より安全側）にだけ動かせる。
 *      DEFAULT_LIMITS を超えて緩める（investigate/上限を上げる・ガードを緩める）ことは
 *      `clampLimits` が機械的に禁止する。
 *
 * isSales の判定基準（loadLedger）: title または text に「販売」「¥」「円」「マガジン」「購入」の
 * いずれかを含むかどうか。posted-log.jsonl 由来のエントリ（本文を保持しない）は判定材料が
 * ないため isSales:false 扱いにする（過剰カウントより過小カウントを優先＝sales-per-day を
 * 誤って block しない側に倒す。台帳の正が status.json 側にあるため実害は小さい）。
 * ---------------------------------------------------------------------------
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { jstDayTime } from './jst-date.mjs';
import { normalize, trigrams, jaccard } from './x-text-similarity.mjs';

export const DEFAULT_LIMITS = Object.freeze({
  maxPerDay: 2,
  maxSalesPerDay: 1,
  maxPerWeek: 3,
  minGapMinutes: 60,
  nearDupBlock: 0.62,
  nearDupWindowDays: 30,
  sameMinuteRepeat: 3,
  sameMediaRepeat: 3,
});

// 各キーの「安全側」の向き。true = 既定値以下にしか下げられない（count 系）。
// false = 既定値以上にしか上げられない（間隔・窓・しきい値を緩める方向を禁止）。
const CLAMP_DOWN_ONLY = Object.freeze({
  maxPerDay: true,
  maxSalesPerDay: true,
  maxPerWeek: true,
  minGapMinutes: false,
  nearDupBlock: true,
  nearDupWindowDays: false,
  sameMinuteRepeat: true,
  sameMediaRepeat: true,
});

const SALES_KEYWORD_RE = /(販売|¥|円|マガジン|購入)/;

/**
 * limits を DEFAULT_LIMITS より緩めない方向にクランプする。
 * count 系（maxPerDay 等）は既定値を超えられない（下げるのは可）。
 * 間隔・窓（minGapMinutes / nearDupWindowDays）は既定値を下回れない（伸ばすのは可）。
 * @param {Partial<typeof DEFAULT_LIMITS>} input
 */
export function clampLimits(input) {
  const out = { ...DEFAULT_LIMITS };
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(DEFAULT_LIMITS)) {
    const v = input[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const def = DEFAULT_LIMITS[key];
    out[key] = CLAMP_DOWN_ONLY[key] ? Math.min(v, def) : Math.max(v, def);
  }
  return out;
}

function toMs(iso) {
  if (typeof iso !== 'string' || !iso) return NaN;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : NaN;
}

function jstDate(iso) {
  const d = jstDayTime(iso);
  return d ? d.date : null;
}

function jstTime(iso) {
  const d = jstDayTime(iso);
  return d ? d.time : null;
}

function isPosted(entry) {
  return !!entry && entry.status === 'posted' && typeof entry.postedAt === 'string' && !Number.isNaN(toMs(entry.postedAt));
}

/**
 * X 投稿の頻度・重複ゲート本体。副作用なし。
 * @returns {{allow:boolean, blocks:Array<{rule:string, detail:string}>, warns:Array<{rule:string, detail:string}>, counts:object}}
 */
export function evaluateXFrequencyGate({ ledger, live, candidate, now, limits, paused }) {
  const L = clampLimits(limits);
  const blocks = [];
  const warns = [];
  const block = (rule, detail) => blocks.push({ rule, detail });

  const nowMs = toMs(now);
  const nowDate = jstDate(now);
  const nowTime = jstTime(now);
  const candidateText = (candidate && candidate.text) || '';
  const candidateMedia = Array.isArray(candidate && candidate.mediaSha256) ? candidate.mediaSha256 : [];
  const candidateKind = (candidate && candidate.kind) || 'post';

  // 0. ledger 未取得（判定不能）。列挙ルールには無いが「判定不能は必ず block」を機械で保証する。
  const ledgerOk = Array.isArray(ledger);
  if (!ledgerOk) block('ledger-unavailable', 'ledger を取得できなかった');
  const list = ledgerOk ? ledger : [];

  // 1. paused
  if (paused) block('paused', '.claude/state/x-repost/PAUSED が存在する');

  // 2. account-state
  const accountState = live && live.accountState;
  if (accountState !== 'ok') block('account-state', `accountState=${accountState ?? 'unknown'}`);

  // 3. live-unavailable
  const liveOk = !!(live && live.ok === true && typeof live.todayCount === 'number');
  if (!live || live.ok !== true || live.todayCount === null || live.todayCount === undefined) {
    block('live-unavailable', 'live が取得できないか todayCount が null');
  }

  const posted = list.filter(isPosted);
  const ledgerToday = Number.isFinite(nowMs) ? posted.filter((e) => jstDate(e.postedAt) === nowDate).length : 0;

  // 4. ledger-live-mismatch（live が読めているときだけ意味がある比較）
  if (liveOk && Number.isFinite(nowMs)) {
    if (ledgerToday !== live.todayCount) {
      block('ledger-live-mismatch', `台帳 ${ledgerToday} / live ${live.todayCount}`);
    }
  }

  // 5. per-day
  const perDayCount = ledgerToday + 1;
  if (perDayCount > L.maxPerDay) {
    block('per-day', `当日 ${ledgerToday}件 + 候補1件 = ${perDayCount} > 上限${L.maxPerDay}`);
  }

  // 6. sales-per-day
  const salesToday = Number.isFinite(nowMs) ? posted.filter((e) => jstDate(e.postedAt) === nowDate && e.isSales).length : 0;
  if (candidate && candidate.isSales && salesToday >= L.maxSalesPerDay) {
    block('sales-per-day', `当日の販売系 posted ${salesToday}件 ≥ 上限${L.maxSalesPerDay}`);
  }

  // 7. per-week（直近7日）
  const weekWindowMs = 7 * 24 * 60 * 60 * 1000;
  const weekCount = Number.isFinite(nowMs)
    ? posted.filter((e) => {
        const ms = toMs(e.postedAt);
        return Number.isFinite(ms) && ms <= nowMs && nowMs - ms < weekWindowMs;
      }).length
    : 0;
  const perWeekCount = weekCount + 1;
  if (perWeekCount > L.maxPerWeek) {
    block('per-week', `直近7日 ${weekCount}件 + 候補1件 = ${perWeekCount} > 上限${L.maxPerWeek}`);
  }

  // 8. min-gap（直近の posted からの経過分）
  let gapMinutes = null;
  if (Number.isFinite(nowMs)) {
    const pastPostedMs = posted.map((e) => toMs(e.postedAt)).filter((ms) => Number.isFinite(ms) && ms <= nowMs);
    if (pastPostedMs.length > 0) {
      const lastMs = Math.max(...pastPostedMs);
      gapMinutes = (nowMs - lastMs) / 60000;
      if (gapMinutes < L.minGapMinutes) {
        block('min-gap', `直近投稿から${gapMinutes.toFixed(1)}分 < 下限${L.minGapMinutes}分`);
      }
    }
  }

  // 9. near-dup（直近 nearDupWindowDays 日の posted text とのトライグラム Jaccard）
  let maxJaccard = 0;
  if (Number.isFinite(nowMs) && candidateText) {
    const dupWindowMs = L.nearDupWindowDays * 24 * 60 * 60 * 1000;
    const candGrams = trigrams(normalize(candidateText));
    for (const e of posted) {
      const ms = toMs(e.postedAt);
      if (!Number.isFinite(ms) || nowMs - ms > dupWindowMs || ms > nowMs) continue;
      const sim = jaccard(candGrams, trigrams(normalize(e.text || e.title || '')));
      if (sim > maxJaccard) maxJaccard = sim;
    }
    if (maxJaccard >= L.nearDupBlock) {
      block('near-dup', `直近${L.nearDupWindowDays}日の posted と類似度${(maxJaccard * 100).toFixed(0)}% ≥ ${(L.nearDupBlock * 100).toFixed(0)}%`);
    }
  }

  // 10. same-minute（直近7日の posted に同じ HH:MM が sameMinuteRepeat-1 件以上）
  let sameMinuteHits = 0;
  if (Number.isFinite(nowMs) && candidate && candidate.scheduledAtJst) {
    const candTime = jstTime(candidate.scheduledAtJst);
    if (candTime) {
      const weekPosted = posted.filter((e) => {
        const ms = toMs(e.postedAt);
        return Number.isFinite(ms) && ms <= nowMs && nowMs - ms < weekWindowMs;
      });
      sameMinuteHits = weekPosted.filter((e) => jstTime(e.postedAt) === candTime).length;
      if (sameMinuteHits >= L.sameMinuteRepeat - 1) {
        block('same-minute', `直近7日に同時刻(${candTime})が${sameMinuteHits}件（上限${L.sameMinuteRepeat - 1}件で block）`);
      }
    }
  }

  // 11. same-media（直近 sameMediaRepeat-1 件の posted が全て候補と同じ mediaSha256 を含む）
  if (candidateMedia.length > 0) {
    const recentPosted = [...posted]
      .filter((e) => Number.isFinite(toMs(e.postedAt)))
      .sort((a, b) => toMs(b.postedAt) - toMs(a.postedAt))
      .slice(0, Math.max(0, L.sameMediaRepeat - 1));
    if (recentPosted.length >= L.sameMediaRepeat - 1 && L.sameMediaRepeat - 1 > 0) {
      const allMatch = recentPosted.every((e) => {
        const media = Array.isArray(e.mediaSha256) ? e.mediaSha256 : [];
        return media.some((h) => candidateMedia.includes(h));
      });
      if (allMatch) {
        block('same-media', `直近${L.sameMediaRepeat - 1}件の posted が候補と同一画像`);
      }
    }
  }

  // 12. kind-cap
  if (candidateKind === 'article' || candidateKind === 'reply') {
    block('kind-cap', `kind=${candidateKind} は cron 経路では常に block`);
  } else if (candidateKind === 'quote') {
    const quoteToday = Number.isFinite(nowMs)
      ? posted.filter((e) => jstDate(e.postedAt) === nowDate && e.kind === 'quote').length
      : 0;
    if (quoteToday >= 1) {
      block('kind-cap', `kind=quote は1日1本（当日既に${quoteToday}件）`);
    }
  }

  return {
    allow: blocks.length === 0,
    blocks,
    warns,
    counts: {
      today: ledgerToday,
      week: weekCount,
      gapMinutes,
      maxJaccard,
      sameMinuteHits,
      liveToday: live && live.todayCount,
    },
  };
}

/**
 * status=scheduled|queued かつ scheduled_at が [now-windowMinutes, now] の帯にある
 * 最古の1本を返す（0件は null。2本以上あっても1本だけ＝次の run が拾う）。
 * @param {Array<object>} ledger loadLedger の出力
 * @param {string} nowJst JST ISO
 * @param {{windowMinutes?: number}} [opts]
 */
export function selectDueTweet(ledger, nowJst, { windowMinutes = 30 } = {}) {
  const nowMs = toMs(nowJst);
  if (!Array.isArray(ledger) || !Number.isFinite(nowMs)) return null;
  const windowMs = windowMinutes * 60 * 1000;
  const due = ledger
    .filter((e) => e && (e.status === 'scheduled' || e.status === 'queued'))
    .map((e) => ({ e, ms: toMs(e.scheduledAt) }))
    .filter(({ ms }) => Number.isFinite(ms) && ms >= nowMs - windowMs && ms <= nowMs)
    .sort((a, b) => a.ms - b.ms);
  return due.length > 0 ? due[0].e : null;
}

function readJsonSafe(fs, file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * content/sns/x/{draft,published}/*\/status.json（_archive* 除外）と
 * .claude/state/x-publish/posted-log.jsonl を合成し、url で重複排除した配列を返す。
 * @param {{root: string, fs?: object}} opts fs は node:fs 互換オブジェクトを注入可能
 */
export function loadLedger({ root, fs: fsImpl } = {}) {
  const fs = fsImpl || { existsSync, readFileSync, readdirSync };
  const entries = [];
  const bases = ['content/sns/x/draft', 'content/sns/x/published'];
  for (const base of bases) {
    const dir = join(root, base);
    if (!fs.existsSync(dir)) continue;
    let names = [];
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (name.startsWith('_')) continue; // _archive* 除外
      const file = join(dir, name, 'status.json');
      if (!fs.existsSync(file)) continue;
      const raw = readJsonSafe(fs, file);
      if (!raw || !raw.tweets) continue;
      const tweetEntries = Array.isArray(raw.tweets)
        ? raw.tweets.map((t, i) => [String(i), t])
        : Object.entries(raw.tweets);
      for (const [key, t] of tweetEntries) {
        if (!t) continue;
        const text = t.text || '';
        const title = t.title || '';
        entries.push({
          draft: name,
          key,
          title,
          text,
          status: t.status,
          scheduledAt: t.scheduled_at ?? null,
          postedAt: t.posted_at ?? null,
          url: t.url ?? null,
          kind: t.kind ?? 'post',
          isSales: SALES_KEYWORD_RE.test(`${title}${text}`),
          mediaSha256: Array.isArray(t.mediaSha256) ? t.mediaSha256 : [],
        });
      }
    }
  }

  const logFile = join(root, '.claude/state/x-publish/posted-log.jsonl');
  if (fs.existsSync(logFile)) {
    const raw = fs.readFileSync(logFile, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let rec;
      try {
        rec = JSON.parse(trimmed);
      } catch {
        continue;
      }
      entries.push({
        draft: rec.draft ?? null,
        key: rec.key ?? null,
        title: '',
        text: '',
        status: 'posted',
        scheduledAt: null,
        postedAt: rec.at ?? null,
        url: rec.url ?? null,
        kind: rec.kind ?? 'post',
        isSales: false, // posted-log は本文を保持しない（ヘッダの isSales 判定基準を参照）
        mediaSha256: Array.isArray(rec.mediaSha256) ? rec.mediaSha256 : [],
      });
    }
  }

  // url で重複排除（先勝ち = status.json 側の情報量が多い方を優先）
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    if (e.url) {
      if (seen.has(e.url)) continue;
      seen.add(e.url);
    }
    out.push(e);
  }
  return out;
}

/**
 * posted-log.jsonl に1行追記する（append-only）。
 * @param {{root: string, entry: object, fs?: object}} opts
 */
export function appendPostedLog({ root, entry, fs: fsImpl } = {}) {
  const fs = fsImpl || { existsSync, readFileSync, appendFileSync, mkdirSync };
  const dir = join(root, '.claude/state/x-publish');
  const file = join(dir, 'posted-log.jsonl');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf-8');
}
