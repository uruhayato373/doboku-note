/**
 * サイト内サムネイルの三段の分担の判定（Codex もファイルも使わない部分）。設計は docs/operations/画像運用設計.md。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AI_LEDGER_FILE } from './image-origin.mjs';

/** 全角 1・半角 0.5 で数えた幅 */
export const textWidth = (text) => [...String(text)].reduce((sum, c) => sum + (/[ -~]/.test(c) ? 0.5 : 1), 0);

const bigrams = (text) => {
  const clean = String(text).replace(/[\s、。]/g, '');
  const grams = new Set();
  for (let i = 0; i < clean.length - 1; i += 1) grams.add(clean.slice(i, i + 2));
  return grams;
};

/** 2 つの文の似ている度合い（文字 2-gram の Jaccard 係数） */
export function similarity(a, b) {
  const x = bigrams(a);
  const y = bigrams(b);
  if (!x.size || !y.size) return 0;
  const common = [...x].filter((gram) => y.has(gram)).length;
  return common / (x.size + y.size - common);
}

/** 絵の指示が threshold 以上に似ている組（別の画像との重複は画像単体の監査で見つからない） */
export function similarScenes(rows, threshold) {
  const pairs = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      if (similarity(rows[i].scene, rows[j].scene) >= threshold) pairs.push([rows[i].key, rows[j].key]);
    }
  }
  return pairs;
}

/** Codex が返した台帳の行を検査する。足りない行と、字数を超えた行を返す */
export function checkLedger(input, rows, maxWidth = 11.5) {
  const got = new Map((rows ?? []).filter((row) => row?.key && row.text && row.scene).map((row) => [row.key, row]));
  const missing = input.filter((row) => !got.has(row.key)).map((row) => row.key);
  const tooLong = [...got.values()].filter((row) => textWidth(row.text) > maxWidth).map((row) => row.key);
  return { rows: input.map((row) => got.get(row.key)).filter(Boolean), missing, tooLong };
}

/** key から決まる 0〜1 の値。抜き取りを実行ごとに変えない */
const fraction = (key) => parseInt(createHash('sha256').update(key).digest('hex').slice(0, 8), 16) / 0xffffffff;

/**
 * Claude が見る対象を決める。理由を持つ行だけを返す。
 * reviewed: [{ key, verdict, reason }]（Codex の判定） / rows: [{ key, scene }]
 */
export function claudeQueue(rows, reviewed, similarPairs, review) {
  const verdicts = new Map(reviewed.map((row) => [row.key, row]));
  const similar = new Set(similarPairs.flat());
  const queue = [];
  for (const row of rows) {
    const reasons = [];
    const codex = verdicts.get(row.key);
    if (!codex) reasons.push('codex-missing');
    else if (codex.verdict !== 'ok') reasons.push(`codex:${codex.verdict}`);
    if (review.riskWords.some((word) => row.scene.includes(word))) reasons.push('risk');
    if (similar.has(row.key)) reasons.push('similar-scene');
    if (fraction(row.key) < review.sampleRate) reasons.push('sample');
    if (reasons.length) queue.push({ ...row, reasons, codexReason: codex?.reason ?? '' });
  }
  return queue;
}

/** AI 台帳の鍵 */
export const recordKey = (exam, key) => `site-thumb:${exam}/${key}`;
export const loadLedger = (root) => JSON.parse(readFileSync(join(root, AI_LEDGER_FILE), 'utf8'));
export const saveLedger = (root, ledger) => writeFileSync(join(root, AI_LEDGER_FILE), `${JSON.stringify(ledger, null, 2)}\n`);

/** 絵が無い、または画風の版が古いページの key */
export function stalePages(pages, ledger, exam, styleVersion) {
  return Object.entries(pages)
    .filter(([key, page]) => !page.version || ledger.figures[recordKey(exam, key)]?.styleVersion !== styleVersion)
    .map(([key]) => key);
}

/** 判定をまとめて記録する。rows: [{ key, verdict, reason }]。verdict は ok か fail */
export function recordVerdicts(ledger, exam, rows, reviewer, reviewedAt) {
  for (const row of rows) {
    const entry = ledger.figures[recordKey(exam, row.key)];
    if (!entry) throw new Error(`台帳に無い: ${row.key}`);
    if (!['ok', 'fail'].includes(row.verdict)) throw new Error(`判定が違う: ${row.key} ${row.verdict}`);
    Object.assign(entry, { verdict: row.verdict, reason: row.reason ?? '', reviewer, reviewedAt });
  }
}
