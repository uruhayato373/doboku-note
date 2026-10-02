/**
 * competitor-history.mjs — 競合偵察（note・ココナラ・X・Instagram・ココナラブログ）の時系列の読み書き。
 *
 * 時系列は台帳（datasets.mjs）の `<取得元>.competitors` など（data/<取得元>/competitors/<日付>.json）。
 * 「最新」の写しは持たない（2026-10-02 まで履歴の最新と同じ内容の写しがあった）。最新は時系列の最新を読む。
 * 部分実行（--handle・--exam）は全社の基準線を汚さないよう時系列に書かず、.tmp/ に置く。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { datasetFiles, datasetPath } from './datasets.mjs';

/** 今日（stamp＝YYYY-MM-DD）より前の最新の時系列。無ければ null */
export function loadPreviousSnapshot(root, id, stamp) {
  const today = datasetPath(id, { date: stamp });
  const prior = datasetFiles(root, id).filter((f) => f < today);
  if (prior.length === 0) return null;
  try {
    return { file: prior[0].slice(prior[0].lastIndexOf('/') + 1), data: JSON.parse(readFileSync(join(root, prior[0]), 'utf8')) };
  } catch {
    return null;
  }
}

/** 時系列へ保存する（部分実行は .tmp/<id>-partial.json）。保存先のリポジトリ相対パスを返す */
export function saveSnapshot(root, id, stamp, snapshot, { partial = false } = {}) {
  const rel = partial ? `.tmp/${id}-partial.json` : datasetPath(id, { date: stamp });
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return rel;
}
