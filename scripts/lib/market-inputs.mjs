/**
 * market-inputs.mjs — 展開の判断材料（qualification-market.mjs）へ渡す正本を読む（I/O だけ）
 * ---------------------------------------------------------------------------
 * CLI（report / check）と管理画面が同じ読み方をするための入口。値の組み立ては
 * qualification-market.mjs の純粋関数が担う。取得物（snapshot・ココナラ調査）は無くてもよい（未取得として扱う）。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath, latestFile } from './datasets.mjs';

export const COMPETITOR_CHANNELS = ['note', 'x', 'ig', 'coconala', 'youtube'];
/** 市場スキャンの台帳の id。1 ファイル＝その日の市場で、最も新しい日付のファイルが最新。 */
export const MARKET_DATASET = 'analysis.qualification-market';

/** 最も新しい市場スキャン（無ければ null）。 */
export function latestMarketSnapshot(root) {
  const latest = latestFile(root, MARKET_DATASET);
  return latest ? JSON.parse(readFileSync(join(root, latest), 'utf8')) : null;
}

/**
 * 市場スキャンを「検索語 1 行＋取得物 1 件 1 行」で書く（JSON.stringify の字下げだと 2 倍に膨らみ差分も読めない）。
 * 出力は JSON として正しいまま。
 */
export function stringifyMarketSnapshot(snapshot) {
  const { youtube = {}, note = {}, youtubeChannels = {}, ...head } = snapshot;
  const bucket = (obj) =>
    Object.entries(obj)
      .map(([k, v]) => {
        const { items, ...rest } = v ?? {};
        if (!Array.isArray(items)) return `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`;
        const meta = JSON.stringify(rest).slice(1, -1);
        const rows = items.map((it) => `      ${JSON.stringify(it)}`).join(',\n');
        return `    ${JSON.stringify(k)}: {${meta}${meta ? ', ' : ''}"items": [${rows ? `\n${rows}\n    ` : ''}]}`;
      })
      .join(',\n');
  const headLines = Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`);
  const parts = [
    ...headLines,
    `  "youtube": {\n${bucket(youtube)}\n  }`,
    `  "note": {\n${bucket(note)}\n  }`,
    `  "youtubeChannels": {\n${bucket(youtubeChannels)}\n  }`,
  ];
  return `{\n${parts.join(',\n')}\n}\n`;
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const readIf = (path) => (existsSync(path) ? readJson(path) : null);

/** @param {string} root リポジトリのルート */
export function loadMarketInputs(root) {
  const config = (name) => readJson(join(root, 'config', name));
  const salesLog = readIf(join(root, datasetPath('note.sales')));
  const orderLog = readIf(join(root, datasetPath('coconala.orders')));
  /** @type {Record<string, any[]>} */
  const competitors = {};
  for (const ch of COMPETITOR_CHANNELS) {
    const path = join(root, 'config', `${ch}-competitors.json`);
    competitors[ch] = existsSync(path) ? readJson(path).competitors ?? [] : [];
  }
  return {
    registry: config('qualification-registry.json'),
    formats: config('exam-formats.json'),
    examStats: config('exam-stats.json'),
    calendar: config('exam-calendar.json'),
    lineupConfig: config('product-lineup.json'),
    scanConfig: config('market-scan.json'),
    buyWindowWeeks: config('annual-roadmap.json').buyWindowWeeks,
    sales: salesLog?.sales ?? [],
    orders: Array.isArray(orderLog) ? orderLog : (orderLog?.orders ?? []),
    competitors,
    snapshot: latestMarketSnapshot(root),
    coconalaResearch: readIf(join(root, datasetPath('coconala.market-research'))),
  };
}
