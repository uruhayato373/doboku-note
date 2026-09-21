import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  evaluateXFrequencyGate,
  selectDueTweet,
  loadLedger,
  appendPostedLog,
  clampLimits,
  DEFAULT_LIMITS,
} from '../scripts/lib/x-frequency-gate.mjs';
import { normalize, trigrams, jaccard } from '../scripts/lib/x-text-similarity.mjs';

const NOW = '2026-09-21T12:00:00+09:00';
const LIVE_OK = (todayCount) => ({ ok: true, todayCount, statuses: [], accountState: 'ok' });
const CAND = (over = {}) => ({
  draft: 'cand',
  key: '1',
  text: '候補の本文です',
  kind: 'post',
  mediaSha256: [],
  scheduledAtJst: NOW,
  isSales: false,
  ...over,
});
const posted = (over = {}) => ({
  draft: 'd', key: 'k', title: '', text: 'いつもの投稿本文', status: 'posted',
  scheduledAt: null, postedAt: NOW, url: null, kind: 'post', isSales: false, mediaSha256: [],
  ...over,
});
const hoursAgo = (h) => new Date(Date.parse(NOW) - h * 3600 * 1000).toISOString();
const daysAgo = (d) => hoursAgo(d * 24);

function baseArgs(over = {}) {
  return {
    ledger: [],
    live: LIVE_OK(0),
    candidate: CAND(),
    now: NOW,
    limits: DEFAULT_LIMITS,
    paused: false,
    ...over,
  };
}

// ── 上限系の境界 ─────────────────────────────────────────────────────────
test('maxPerDay: ちょうど上限でblock、1つ下でallow', () => {
  const atLimit = Array.from({ length: DEFAULT_LIMITS.maxPerDay }, () => posted());
  const belowLimit = Array.from({ length: DEFAULT_LIMITS.maxPerDay - 1 }, () => posted());
  const r1 = evaluateXFrequencyGate(baseArgs({ ledger: atLimit, live: LIVE_OK(atLimit.length) }));
  assert.equal(r1.allow, false);
  assert.ok(r1.blocks.some((b) => b.rule === 'per-day'));
  const r2 = evaluateXFrequencyGate(baseArgs({ ledger: belowLimit, live: LIVE_OK(belowLimit.length) }));
  assert.equal(r2.blocks.some((b) => b.rule === 'per-day'), false);
});

test('maxSalesPerDay: ちょうど上限でblock、1つ下(0件)でallow', () => {
  const salesPosted = Array.from({ length: DEFAULT_LIMITS.maxSalesPerDay }, () => posted({ isSales: true }));
  const r1 = evaluateXFrequencyGate(baseArgs({
    ledger: salesPosted, live: LIVE_OK(salesPosted.length), candidate: CAND({ isSales: true }),
  }));
  assert.ok(r1.blocks.some((b) => b.rule === 'sales-per-day'));
  const r2 = evaluateXFrequencyGate(baseArgs({
    ledger: [], live: LIVE_OK(0), candidate: CAND({ isSales: true }),
  }));
  assert.equal(r2.blocks.some((b) => b.rule === 'sales-per-day'), false);
});

test('maxPerWeek: ちょうど上限でblock、1つ下でallow', () => {
  const atLimit = Array.from({ length: DEFAULT_LIMITS.maxPerWeek }, (_, i) => posted({ postedAt: daysAgo(i + 1) }));
  const belowLimit = Array.from({ length: DEFAULT_LIMITS.maxPerWeek - 1 }, (_, i) => posted({ postedAt: daysAgo(i + 1) }));
  const r1 = evaluateXFrequencyGate(baseArgs({ ledger: atLimit, live: LIVE_OK(0) }));
  assert.ok(r1.blocks.some((b) => b.rule === 'per-week'));
  const r2 = evaluateXFrequencyGate(baseArgs({ ledger: belowLimit, live: LIVE_OK(0) }));
  assert.equal(r2.blocks.some((b) => b.rule === 'per-week'), false);
});

test('minGapMinutes: 下限未満でblock、下限ちょうどでallow', () => {
  const tooSoon = [posted({ postedAt: hoursAgo(DEFAULT_LIMITS.minGapMinutes / 60 - 1 / 60) })];
  const exact = [posted({ postedAt: hoursAgo(DEFAULT_LIMITS.minGapMinutes / 60) })];
  const r1 = evaluateXFrequencyGate(baseArgs({ ledger: tooSoon, live: LIVE_OK(1) }));
  assert.ok(r1.blocks.some((b) => b.rule === 'min-gap'));
  const r2 = evaluateXFrequencyGate(baseArgs({ ledger: exact, live: LIVE_OK(1) }));
  assert.equal(r2.blocks.some((b) => b.rule === 'min-gap'), false);
});

test('nearDupWindowDays: 窓内はblock対象、窓外は対象外', () => {
  const insideWindow = [posted({ postedAt: daysAgo(DEFAULT_LIMITS.nearDupWindowDays - 1), text: '候補の本文です' })];
  const outsideWindow = [posted({ postedAt: daysAgo(DEFAULT_LIMITS.nearDupWindowDays + 1), text: '候補の本文です' })];
  const r1 = evaluateXFrequencyGate(baseArgs({ ledger: insideWindow, live: LIVE_OK(0) }));
  assert.ok(r1.blocks.some((b) => b.rule === 'near-dup'));
  const r2 = evaluateXFrequencyGate(baseArgs({ ledger: outsideWindow, live: LIVE_OK(0) }));
  assert.equal(r2.blocks.some((b) => b.rule === 'near-dup'), false);
});

// ── 判定不能・異常系 ─────────────────────────────────────────────────────
test('live.ok=false は必ずblock', () => {
  const r = evaluateXFrequencyGate(baseArgs({ live: { ok: false, todayCount: null, statuses: [], accountState: 'ok' } }));
  assert.equal(r.allow, false);
  assert.ok(r.blocks.some((b) => b.rule === 'live-unavailable'));
});

test('todayCount が null は必ずblock', () => {
  const r = evaluateXFrequencyGate(baseArgs({ live: { ok: true, todayCount: null, statuses: [], accountState: 'ok' } }));
  assert.ok(r.blocks.some((b) => b.rule === 'live-unavailable'));
});

test('台帳1件/live2件はmismatchでblock', () => {
  const r = evaluateXFrequencyGate(baseArgs({ ledger: [posted()], live: LIVE_OK(2) }));
  assert.ok(r.blocks.some((b) => b.rule === 'ledger-live-mismatch'));
});

test('PAUSED はblock', () => {
  const r = evaluateXFrequencyGate(baseArgs({ paused: true }));
  assert.equal(r.allow, false);
  assert.ok(r.blocks.some((b) => b.rule === 'paused'));
});

test('accountState locked はblock', () => {
  const r = evaluateXFrequencyGate(baseArgs({ live: { ok: true, todayCount: 0, statuses: [], accountState: 'locked' } }));
  assert.ok(r.blocks.some((b) => b.rule === 'account-state'));
});

test('ledger 未取得(null)はblock', () => {
  const r = evaluateXFrequencyGate(baseArgs({ ledger: null }));
  assert.equal(r.allow, false);
  assert.ok(r.blocks.some((b) => b.rule === 'ledger-unavailable'));
});

// ── same-minute / same-media / near-dup ────────────────────────────────
test('同じHH:MMが3回目でblock(sameMinuteRepeat=3)', () => {
  const twoAtSameTime = [
    posted({ postedAt: daysAgo(1) }),
    posted({ postedAt: daysAgo(2) }),
  ];
  const oneAtSameTime = [posted({ postedAt: daysAgo(1) })];
  const cand = CAND({ scheduledAtJst: NOW });
  const r1 = evaluateXFrequencyGate(baseArgs({ ledger: twoAtSameTime, live: LIVE_OK(0), candidate: cand }));
  assert.ok(r1.blocks.some((b) => b.rule === 'same-minute'));
  const r2 = evaluateXFrequencyGate(baseArgs({ ledger: oneAtSameTime, live: LIVE_OK(0), candidate: cand }));
  assert.equal(r2.blocks.some((b) => b.rule === 'same-minute'), false);
});

test('同一画像3連でblock(sameMediaRepeat=3)', () => {
  const sameMediaTwo = [
    posted({ postedAt: hoursAgo(3), mediaSha256: ['abc'] }),
    posted({ postedAt: hoursAgo(5), mediaSha256: ['abc'] }),
  ];
  const sameMediaOne = [posted({ postedAt: hoursAgo(3), mediaSha256: ['abc'] })];
  const cand = CAND({ mediaSha256: ['abc'] });
  const r1 = evaluateXFrequencyGate(baseArgs({ ledger: sameMediaTwo, live: LIVE_OK(0), candidate: cand }));
  assert.ok(r1.blocks.some((b) => b.rule === 'same-media'));
  const r2 = evaluateXFrequencyGate(baseArgs({ ledger: sameMediaOne, live: LIVE_OK(0), candidate: cand }));
  assert.equal(r2.blocks.some((b) => b.rule === 'same-media'), false);
});

test('near-dup: しきい値ちょうどでblock、しきい値超過(=しきい値を下回るしきい値設定)でallow', () => {
  // 実測の類似度を求め、limits.nearDupBlock をその値に厳密一致させて境界を検証する
  // （x-schedule-guard.mjs と同じ normalize/trigrams/jaccard を使う）。
  const prevText = '技術士二次試験は答案構成が合否を分けます';
  const candText = '技術士一次試験は基礎知識の暗記が合否を分けます';
  const sim = jaccard(trigrams(normalize(prevText)), trigrams(normalize(candText)));
  assert.ok(sim > 0 && sim < 1, `setup sanity: sim=${sim}`);

  const ledger = [posted({ postedAt: hoursAgo(2), text: prevText })];
  const candidate = CAND({ text: candText });

  // しきい値を実測値ちょうどに設定 → ≥ で block
  const rBlock = evaluateXFrequencyGate(baseArgs({
    ledger, live: LIVE_OK(1), candidate, limits: { ...DEFAULT_LIMITS, nearDupBlock: sim },
  }));
  assert.ok(rBlock.blocks.some((b) => b.rule === 'near-dup'));
  assert.ok(Math.abs(rBlock.counts.maxJaccard - sim) < 1e-9);

  // しきい値を実測値よりわずかに高く設定 → 実測値 < しきい値 で allow
  const rAllow = evaluateXFrequencyGate(baseArgs({
    ledger, live: LIVE_OK(1), candidate, limits: { ...DEFAULT_LIMITS, nearDupBlock: sim + 0.001 },
  }));
  assert.equal(rAllow.blocks.some((b) => b.rule === 'near-dup'), false);
});

// ── kind-cap ─────────────────────────────────────────────────────────────
test('kind article はcron経路で常にblock', () => {
  const r = evaluateXFrequencyGate(baseArgs({ candidate: CAND({ kind: 'article' }) }));
  assert.ok(r.blocks.some((b) => b.rule === 'kind-cap'));
});

test('kind reply はcron経路で常にblock', () => {
  const r = evaluateXFrequencyGate(baseArgs({ candidate: CAND({ kind: 'reply' }) }));
  assert.ok(r.blocks.some((b) => b.rule === 'kind-cap'));
});

test('kind quote は1日1本まで', () => {
  const r1 = evaluateXFrequencyGate(baseArgs({
    ledger: [posted({ kind: 'quote' })], live: LIVE_OK(1), candidate: CAND({ kind: 'quote' }),
  }));
  assert.ok(r1.blocks.some((b) => b.rule === 'kind-cap'));
  const r2 = evaluateXFrequencyGate(baseArgs({
    ledger: [], live: LIVE_OK(0), candidate: CAND({ kind: 'quote' }),
  }));
  assert.equal(r2.blocks.some((b) => b.rule === 'kind-cap'), false);
});

// ── clampLimits ──────────────────────────────────────────────────────────
test('clampLimits: 既定値より緩める方向へは変更できない', () => {
  const loosened = clampLimits({
    maxPerDay: DEFAULT_LIMITS.maxPerDay + 1,
    maxSalesPerDay: DEFAULT_LIMITS.maxSalesPerDay + 5,
    maxPerWeek: DEFAULT_LIMITS.maxPerWeek + 5,
    minGapMinutes: DEFAULT_LIMITS.minGapMinutes - 30,
    nearDupBlock: DEFAULT_LIMITS.nearDupBlock + 0.2,
    nearDupWindowDays: DEFAULT_LIMITS.nearDupWindowDays - 10,
    sameMinuteRepeat: DEFAULT_LIMITS.sameMinuteRepeat + 2,
    sameMediaRepeat: DEFAULT_LIMITS.sameMediaRepeat + 2,
  });
  assert.deepEqual(loosened, DEFAULT_LIMITS);
});

test('clampLimits: 安全側(下げる/伸ばす)への変更は通す', () => {
  const stricter = clampLimits({ maxPerDay: 1, minGapMinutes: 120 });
  assert.equal(stricter.maxPerDay, 1);
  assert.equal(stricter.minGapMinutes, 120);
});

// ── selectDueTweet ───────────────────────────────────────────────────────
test('selectDueTweet: 帯内の最古1本だけ返す', () => {
  const ledger = [
    { status: 'scheduled', scheduledAt: hoursAgo(-0.1), key: 'late' }, // now+6min: 帯内
    { status: 'queued', scheduledAt: hoursAgo(0.2), key: 'earliest' }, // now-12min: 帯内・最古
    { status: 'scheduled', scheduledAt: hoursAgo(2), key: 'too-old' }, // 帯外
  ];
  const due = selectDueTweet(ledger, NOW, { windowMinutes: 30 });
  assert.equal(due.key, 'earliest');
});

test('selectDueTweet: 帯外・未承認status は0件でnull', () => {
  const ledger = [
    { status: 'scheduled', scheduledAt: hoursAgo(2), key: 'old' },
    { status: 'draft', scheduledAt: hoursAgo(0.1), key: 'not-approved' },
    { status: 'posted', scheduledAt: hoursAgo(0.1), key: 'already-posted' },
  ];
  assert.equal(selectDueTweet(ledger, NOW, { windowMinutes: 30 }), null);
});

// ── loadLedger ───────────────────────────────────────────────────────────
test('loadLedger: _archive除外 と url重複排除', () => {
  const root = mkdtempSync(join(tmpdir(), 'x-freq-gate-'));
  const draftDir = join(root, 'content/sns/x/draft');
  mkdirSync(join(draftDir, '001-a'), { recursive: true });
  mkdirSync(join(draftDir, '_archive-old'), { recursive: true });
  writeFileSync(join(draftDir, '001-a', 'status.json'), JSON.stringify({
    tweets: {
      1: { title: '販売告知', text: '¥1,000で販売', status: 'posted', posted_at: NOW, url: 'https://x.com/a/1' },
      2: { title: '通常投稿', text: 'ふつうの投稿', status: 'scheduled', scheduled_at: hoursAgo(-1) },
    },
  }));
  writeFileSync(join(draftDir, '_archive-old', 'status.json'), JSON.stringify({
    tweets: { 1: { title: '除外対象', text: 'x', status: 'posted', posted_at: NOW, url: 'https://x.com/archived/1' } },
  }));
  const logDir = join(root, '.claude/state/x-publish');
  mkdirSync(logDir, { recursive: true });
  writeFileSync(join(logDir, 'posted-log.jsonl'), [
    JSON.stringify({ at: NOW, draft: '001-a', key: '1', url: 'https://x.com/a/1', kind: 'post' }), // 重複(url一致)→除外
    JSON.stringify({ at: NOW, draft: '002-b', key: '1', url: 'https://x.com/b/1', kind: 'post' }), // 新規→採用
  ].join('\n'));

  const ledger = loadLedger({ root });
  assert.equal(ledger.some((e) => e.url === 'https://x.com/archived/1'), false, '_archive は除外される');
  const urls = ledger.map((e) => e.url).filter(Boolean);
  assert.equal(urls.filter((u) => u === 'https://x.com/a/1').length, 1, 'url重複は排除される');
  assert.ok(urls.includes('https://x.com/b/1'), 'posted-log由来の新規urlは採用される');
  const salesEntry = ledger.find((e) => e.url === 'https://x.com/a/1');
  assert.equal(salesEntry.isSales, true, '¥を含む本文はisSales true');
});

// ── appendPostedLog ──────────────────────────────────────────────────────
test('appendPostedLog: 追記のみでファイルを壊さない', () => {
  const root = mkdtempSync(join(tmpdir(), 'x-freq-gate-log-'));
  appendPostedLog({ root, entry: { at: NOW, draft: 'd1', key: '1', url: 'https://x.com/1', kind: 'post' } });
  appendPostedLog({ root, entry: { at: NOW, draft: 'd2', key: '1', url: 'https://x.com/2', kind: 'post' } });
  const ledger = loadLedger({ root });
  assert.equal(ledger.length, 2);
});
