/**
 * video-publish-gate.mjs — 通常動画を人の承認なしで予約へ進めてよいかを決める関門。手順は video-factory.md
 * 判定は機械の事実だけで決める。1 項目でも欠けたら通さない（検査していない項目を合格にしない）。
 */
import { readDataset } from './dataset-io.mjs';
import { jstDayOf } from './jst-date.mjs';
import { mondayOf, slotProblems } from './youtube-longform-audit.mjs';

export const readPolicy = (root) => readDataset(root, 'config.video-auto-publish');

/** 年間の枠に入っているか。これからの公開日時があればその日で、在庫なら計画の目標日で見る */
export function planProblems(root, pub) {
  return slotProblems(readDataset(root, 'config.channel-annual-plan'), pub, Date.parse(pub.publishAt) > Date.now() ? jstDayOf(pub.publishAt) : null).problems;
}

/** 公開行の承認を今の予約経路が受け付けるか。方針の承認は YouTube の通常動画と初回のショート（2026-11-12 から） */
export function acceptedApproval(pub) {
  const by = pub?.approval?.by;
  if (by === 'user') return true;
  return by === 'policy' && pub.channel === 'youtube' && (pub.format === 'longform' || (pub.format === 'short' && !pub.revisionOf));
}

/** 発話の比較用。記号と空白を落とし、英数字を半角へ寄せる */
function normalizeSpeech(text) {
  return String(text).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

/** 文字 2-gram の Dice 係数（0〜1）。同音の表記ゆれは多少下がるので、発話の欠落と崩れを見る尺度として使う */
export function speechSimilarity(expected, actual) {
  const a = grams(normalizeSpeech(expected)), b = grams(normalizeSpeech(actual));
  const total = [...a.values(), ...b.values()].reduce((x, y) => x + y, 0);
  if (!total) return 0;
  let common = 0;
  for (const [g, n] of a) common += Math.min(n, b.get(g) ?? 0);
  return (2 * common) / total;
}

const grams = (s) => {
  const out = new Map();
  for (let i = 0; i + 1 < s.length; i += 1) { const g = s.slice(i, i + 2); out.set(g, (out.get(g) ?? 0) + 1); }
  return out;
};

/** expected の 2-gram のうち window にもある割合（多重集合）。window が無関係でも共通の助詞で少し上がるので、窓を絞って使う */
function gramRecall(expectedGrams, windowText) {
  const total = [...expectedGrams.values()].reduce((x, y) => x + y, 0);
  if (!total) return 0;
  const w = grams(windowText);
  let common = 0;
  for (const [g, n] of expectedGrams) common += Math.min(n, w.get(g) ?? 0);
  return common / total;
}

/** 聞こえた読み(heard)の中で、expected に最も近い窓（expected の 1.5 倍の長さ）と、その窓での再現率 */
function bestWindow(expected, heard) {
  const e = normalizeSpeech(expected), h = normalizeSpeech(heard);
  const eg = grams(e);
  const width = Math.ceil(e.length * 1.5) + 4, step = Math.max(1, Math.floor(e.length / 10));
  let best = { recall: 0, text: h.slice(0, width) };
  for (let at = 0; at === 0 || at < h.length - width + step; at += step) {
    const text = h.slice(at, at + width), recall = gramRecall(eg, text);
    if (recall > best.recall) best = { recall, text };
  }
  return best;
}

/** 場面ごとの一致度の最小値（DN-1071）。全体の Dice 係数は 12 場面中 1 場面が欠けても 0.85 を下回らないので、場面ごとに聞こえた読みの中で最も近い窓を探して見る。
 *  読みが minChars 未満の場面（表紙の見出しなど）は偶然の一致に左右されるので数えない。数える場面が無ければ min は null（検査不成立） */
export function sceneSimilarity(sceneReadings, heardReading, minChars = 6) {
  const scenes = sceneReadings.map((r, index) => ({ index, similarity: normalizeSpeech(r).length >= minChars ? Number(bestWindow(r, heardReading).recall.toFixed(3)) : null }));
  const counted = scenes.filter((s) => s.similarity !== null);
  const worst = counted.reduce((a, b) => (b.similarity < a.similarity ? b : a), counted[0]);
  return { min: worst ? worst.similarity : null, minScene: worst ? worst.index : null, counted: counted.length, scenes };
}

/** 数字・英字・ローマ数字と、直後の単位（漢字 1 文字かカタカナ 8 文字まで）。読み方を誤りやすい箇所 */
export function readingRiskTokens(text) {
  return [...String(text).normalize('NFKC').matchAll(/(?:\d[\d.,]*|[A-Za-z]+|[\u2160-\u216B]+)(?:[\p{Script=Katakana}ー]{1,8}|\p{Script=Han})?/gu)].map((m) => m[0]);
}

/**
 * 読み辞書を通した期待の読みが、聞こえた読みの該当区間に完全一致で含まれるか（DN-1071）。
 * items は { scene, token, sentenceReading, tokenReading }。該当区間は文の読みに最も近い窓。含まれない箇所を返す
 */
export function tokenMisreads(items, heardReading) {
  return items.flatMap((it) => {
    const need = normalizeSpeech(it.tokenReading);
    return need && !bestWindow(it.sentenceReading, heardReading).text.includes(need) ? [{ scene: it.scene, token: it.token, expected: it.tokenReading }] : [];
  });
}

/** 音声の検査結果を判定する。動画の sha に結ぶので、作り直すと無効になる */
export function audioProblems(check, videoSha, policy) {
  if (!check) return ['音声の検査が無い'];
  if (check.videoSha256 !== videoSha) return ['音声の検査が今の動画のものではない'];
  const a = policy.audio, out = [];
  if (!(check.similarity >= a.minSimilarity)) out.push(`台本との一致が低い（${check.similarity}）`);
  if (!(check.maxVolumeDb >= a.minMaxVolumeDb)) out.push(`音量が小さい（${check.maxVolumeDb} dB）`);
  if (!(check.maxVolumeDb <= a.maxMaxVolumeDb)) out.push(`音割れの疑い（${check.maxVolumeDb} dB）`);
  // 場面ごとの一致度・数字の読みは audio-check が書く欄。書く前の記録（在庫の既存分）は欄が無く、無いものは判定しない（null は計算できなかった＝落とす）
  if (check.sceneSimilarityMin !== undefined && a.minSceneSimilarity !== undefined && !(check.sceneSimilarityMin >= a.minSceneSimilarity)) {
    out.push(`場面の欠落の疑い（場面 ${check.sceneSimilarityMinScene ?? '?'} の一致 ${check.sceneSimilarityMin}）`);
  }
  if (check.tokenMisreads !== undefined && check.tokenMisreads.length > (a.maxTokenMisreads ?? 0)) {
    out.push(`数字・英字の誤読の疑い（${check.tokenMisreads.slice(0, 3).map((m) => `場面 ${m.scene} の ${m.token}`).join('、')}${check.tokenMisreads.length > 3 ? ` ほか ${check.tokenMisreads.length - 3} 件` : ''}）`);
  }
  if (!(check.durationGapSec <= a.maxDurationGapSec)) out.push(`尺が台本と合わない（差 ${check.durationGapSec} 秒）`);
  return out;
}

/**
 * 関門の判定。facts はこの順の事実を持つ。
 * @returns {{ ok: boolean, checks: { name: string, ok: boolean, detail?: string }[] }}
 */
export function evaluateGate(facts, policy, now = Date.now(), { stock = false } = {}) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) });
  add('方針が有効', policy.enabled === true);
  add('対象の形式', facts.pub?.channel === policy.scope.channel && facts.pub?.format === policy.scope.format);
  add('年間の枠', facts.planProblems?.length === 0, facts.planProblems?.join(' / '));
  add('画像の基準', facts.standard);
  add('AI 画像の判定', facts.aiBlocked?.length === 0, facts.aiBlocked?.join(', '));
  add('完成動画の照合', facts.renderVerified);
  // 採点の後に原稿が変わった QA は通さない（DN-1067）
  add('内容QA', facts.qa?.avg >= policy.minQaAvg && facts.qa?.blocks <= policy.maxBlocks && !facts.qaStale, facts.qaStale ? '採点の後に原稿が変わった（record-qa をやり直す）' : facts.qa ? `平均 ${facts.qa.avg}・BLOCK ${facts.qa.blocks}` : '記録なし');
  add('画面確認', facts.review === 'pass', facts.review);
  add('導線の検査', facts.funnelOk, facts.funnelDetail);
  add('音声', facts.audioProblems?.length === 0, facts.audioProblems?.join(' / '));
  // 在庫は公開日時をまだ持たない。予約の直前にもう一度この関門を通す
  if (!stock) add('公開までの猶予', Date.parse(facts.pub?.publishAt) > now + policy.minLeadHours * 3_600_000, facts.pub?.publishAt ?? '公開日時なし');
  return { ok: checks.every((c) => c.ok), checks };
}

/**
 * 予約の空き枠。同じ日の上限と週の上限を超えない、猶予を満たす最初の枠を JST で返す。
 * slot は { timesJst, maxPerDay }。taken は同じ種類（通常動画かショート）の予約済みの日時で、同じ時刻は使わない。
 * weekLimit は月曜の日付から週の上限を返す関数。notBefore（JST の日付か ISO の日時）より前に置かない。dayTotal は日ごとの全種類の本数の上限
 */
export function nextSlot(taken, slot, now = Date.now(), { weekLimit = null, notBefore = null, leadHours = 24, allTaken = taken, dayTotal = Infinity } = {}) {
  const earliest = Math.max(now + leadHours * 3_600_000, notBefore && notBefore.length > 10 ? Date.parse(notBefore) + 1 : 0);
  const notBeforeDay = notBefore ? notBefore.slice(0, 10) : null;
  const dayOf = (ms) => jstDayOf(new Date(ms));
  const count = (list) => {
    const perDay = new Map(), perWeek = new Map(), at = new Set();
    for (const t of list) {
      const ms = Date.parse(t), d = dayOf(ms);
      at.add(ms);
      perDay.set(d, (perDay.get(d) ?? 0) + 1);
      perWeek.set(mondayOf(d), (perWeek.get(mondayOf(d)) ?? 0) + 1);
    }
    return { perDay, perWeek, at };
  };
  const own = count(taken), all = count(allTaken);
  for (let i = 0; i < 400; i += 1) {
    const day = dayOf(now + i * 86_400_000);
    if (notBeforeDay && day < notBeforeDay) continue;
    if (weekLimit && (own.perWeek.get(mondayOf(day)) ?? 0) >= weekLimit(mondayOf(day))) continue;
    if ((own.perDay.get(day) ?? 0) >= slot.maxPerDay || (all.perDay.get(day) ?? 0) >= dayTotal) continue;
    for (const time of slot.timesJst) {
      const at = Date.parse(`${day}T${time}:00+09:00`);
      if (at >= earliest && !all.at.has(at)) return new Date(at).toISOString().replace('.000Z', 'Z');
    }
  }
  throw new Error('空き枠が見つからない');
}

/** 直近 24 時間に投稿した本数から、あと何本投稿できるかを返す。割当の超過は結果不明になり再送できない */
export function uploadsLeft(publications, policy, now = Date.now()) {
  // YouTube API の割当は太平洋時間の 0 時に戻る。直近 24 時間で数えると前日分が残り、空きがあっても止まる
  const pacific = new Date(new Date(now).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const dayStart = now - (pacific.getHours() * 3_600_000 + pacific.getMinutes() * 60_000 + pacific.getSeconds() * 1000);
  const recent = publications.filter((p) => p.channel === 'youtube' && Date.parse(p.times?.uploaded) >= dayStart).length;
  return Math.max(0, policy.maxUploadsPerDay - recent);
}
