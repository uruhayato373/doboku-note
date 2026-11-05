/**
 * video-publish-gate.mjs — 通常動画を人の承認なしで予約へ進めてよいかを決める関門。手順は video-factory.md
 * 判定は機械の事実だけで決める。1 項目でも欠けたら通さない（検査していない項目を合格にしない）。
 */
import { readDataset } from './dataset-io.mjs';
import { jstDayOf } from './jst-date.mjs';

export const readPolicy = (root) => readDataset(root, 'config.video-auto-publish');

/** 公開行の承認を今の予約経路が受け付けるか。方針の承認は YouTube の通常動画だけ */
export function acceptedApproval(pub) {
  const by = pub?.approval?.by;
  if (by === 'user') return true;
  return by === 'policy' && pub.channel === 'youtube' && pub.format === 'longform';
}

/** 発話の比較用。記号と空白を落とし、英数字を半角へ寄せる */
function normalizeSpeech(text) {
  return String(text).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

/** 文字 2-gram の Dice 係数（0〜1）。同音の表記ゆれは多少下がるので、発話の欠落と崩れを見る尺度として使う */
export function speechSimilarity(expected, actual) {
  const grams = (s) => {
    const out = new Map();
    for (let i = 0; i + 1 < s.length; i += 1) { const g = s.slice(i, i + 2); out.set(g, (out.get(g) ?? 0) + 1); }
    return out;
  };
  const a = grams(normalizeSpeech(expected)), b = grams(normalizeSpeech(actual));
  const total = [...a.values(), ...b.values()].reduce((x, y) => x + y, 0);
  if (!total) return 0;
  let common = 0;
  for (const [g, n] of a) common += Math.min(n, b.get(g) ?? 0);
  return (2 * common) / total;
}

/** 音声の検査結果を判定する。動画の sha に結ぶので、作り直すと無効になる */
export function audioProblems(check, videoSha, policy) {
  if (!check) return ['音声の検査が無い'];
  if (check.videoSha256 !== videoSha) return ['音声の検査が今の動画のものではない'];
  const a = policy.audio, out = [];
  if (!(check.similarity >= a.minSimilarity)) out.push(`台本との一致が低い（${check.similarity}）`);
  if (!(check.maxVolumeDb >= a.minMaxVolumeDb)) out.push(`音量が小さい（${check.maxVolumeDb} dB）`);
  if (!(check.maxVolumeDb <= a.maxMaxVolumeDb)) out.push(`音割れの疑い（${check.maxVolumeDb} dB）`);
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
  add('画像の基準', facts.standard);
  add('AI 画像の判定', facts.aiBlocked?.length === 0, facts.aiBlocked?.join(', '));
  add('完成動画の照合', facts.renderVerified);
  add('内容QA', facts.qa?.avg >= policy.minQaAvg && facts.qa?.blocks <= policy.maxBlocks, facts.qa ? `平均 ${facts.qa.avg}・BLOCK ${facts.qa.blocks}` : '記録なし');
  add('画面確認', facts.review === 'pass', facts.review);
  add('導線の検査', facts.funnelOk, facts.funnelDetail);
  add('音声', facts.audioProblems?.length === 0, facts.audioProblems?.join(' / '));
  // 在庫は公開日時をまだ持たない。予約の直前にもう一度この関門を通す
  if (!stock) add('公開までの猶予', Date.parse(facts.pub?.publishAt) > now + policy.minLeadHours * 3_600_000, facts.pub?.publishAt ?? '公開日時なし');
  return { ok: checks.every((c) => c.ok), checks };
}

/** 予約の空き枠。同じ日の上限を超えない、猶予を満たす最初の枠を JST で返す */
export function nextSlot(taken, policy, now = Date.now()) {
  const [h, m] = policy.slot.timeJst.split(':').map(Number);
  const earliest = now + policy.minLeadHours * 3_600_000;
  const perDay = new Map();
  const dayOf = (ms) => jstDayOf(new Date(ms));
  for (const at of taken) { const d = dayOf(Date.parse(at)); perDay.set(d, (perDay.get(d) ?? 0) + 1); }
  for (let i = 0; i < 400; i += 1) {
    const day = dayOf(now + i * 86_400_000);
    const at = Date.parse(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`);
    if (at >= earliest && (perDay.get(day) ?? 0) < policy.slot.maxPerDay) return new Date(at).toISOString().replace('.000Z', 'Z');
  }
  throw new Error('空き枠が見つからない');
}

/** 直近 24 時間に投稿した本数から、あと何本投稿できるかを返す。割当の超過は結果不明になり再送できない */
export function uploadsLeft(publications, policy, now = Date.now()) {
  const recent = publications.filter((p) => p.channel === 'youtube' && Date.parse(p.times?.uploaded) > now - 86_400_000).length;
  return Math.max(0, policy.maxUploadsPerDay - recent);
}
