/**
 * sales-by-qualification.mjs — 期間の販売額を、チャネル（note・ココナラ・KDP）を問わず全資格へ振り分ける。
 * ---------------------------------------------------------------------------
 * 資格の判定は商品の分類ルール `config/product-lineup.json`（scripts/lib/product-lineup.mjs）をそのまま使う。
 * 重点資格（business-direction.json）に限らないので、行の合計はチャネル別の合計と一致する。
 * 複数資格にまたがる商品（会員など）は「複数資格」、どのルールにも当たらない商品は「未分類」の行に残す（黙って落とさない）。
 * 集計対象の選び方は business-direction.mjs の noteRevenue / coconalaRevenue / kdpRoyalty（'all'）と同じにする。
 * ---------------------------------------------------------------------------
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { classifySale, classifyProduct, loadLineupConfig } from './product-lineup.mjs';
import { datasetPath } from './datasets.mjs';
import { readJson } from './json-io.mjs';

const inPeriod = (day, period) => day >= period.startDate && day <= period.endDate;

/** 売上 1 件の資格キー。cells は `資格id:区分id` の配列。 */
export function qualificationKey(cells) {
  if (!cells || cells.length === 0) return 'unclassified';
  const quals = [...new Set(cells.map((c) => c.split(':')[0]))];
  return quals.length === 1 ? quals[0] : 'multiple';
}

/**
 * @param {string} root リポジトリのルート
 * @param {{startDate: string, endDate: string}} period
 * @returns {{ id: string, label: string, value: number, byChannel: Record<string, number> }[]} 販売額の大きい順
 */
export function salesByQualification(root, period, config = loadLineupConfig()) {
  const totals = new Map();
  const add = (key, channel, yen) => {
    if (!Number.isFinite(yen) || yen === 0) return;
    const row = totals.get(key) ?? { value: 0, byChannel: {} };
    row.value += yen;
    row.byChannel[channel] = (row.byChannel[channel] ?? 0) + yen;
    totals.set(key, row);
  };

  const salesPath = datasetPath('note.sales');
  if (existsSync(join(root, salesPath))) {
    for (const s of readJson(root, salesPath).sales ?? []) {
      if (!inPeriod(String(s.date).slice(0, 10), period)) continue;
      add(qualificationKey(classifySale(config, s.productId)), 'note', Number(s.price) || 0);
    }
  }

  const cocoOrdersPath = datasetPath('coconala.orders-snapshot');
  const cocoLogPath = datasetPath('coconala.orders');
  if (existsSync(join(root, cocoOrdersPath))) {
    const log = existsSync(join(root, cocoLogPath)) ? readJson(root, cocoLogPath).orders ?? [] : [];
    const byRoom = new Map(log.map((o) => [String(o.talkroomId), o]));
    for (const o of readJson(root, cocoOrdersPath).orders ?? []) {
      if (!inPeriod(String(o.soldOn), period)) continue;
      const serviceId = byRoom.get(String(o.talkroomId))?.serviceId;
      add(qualificationKey(serviceId ? classifyProduct(config.rules?.coconala, serviceId) : null), 'coconala', Number(o.priceYen) || 0);
    }
  }

  const kdpPath = datasetPath('kdp.royalties');
  if (existsSync(join(root, kdpPath))) {
    const catalogPath = 'scripts/kindle-published/catalog.json';
    const ownBooks = new Set((existsSync(join(root, catalogPath)) ? readJson(root, catalogPath).books ?? [] : []).map((b) => b.id ?? b.bookId));
    const months = new Set();
    for (let d = new Date(`${period.startDate}T00:00:00Z`); d.toISOString().slice(0, 10) <= period.endDate; d.setUTCMonth(d.getUTCMonth() + 1, 1)) months.add(d.toISOString().slice(0, 7));
    for (const entry of Object.values(readJson(root, kdpPath).months ?? {})) {
      if (!months.has(String(entry?.range?.start ?? '').slice(0, 7))) continue;
      for (const book of entry.books ?? []) {
        if (!ownBooks.has(book.bookId)) continue; // 共有 KDP 口座の他サイト書籍は除く
        add(qualificationKey(classifyProduct(config.rules?.kindle, book.bookId)), 'kdp', Number(book.royalty) || 0);
      }
    }
  }

  const labels = new Map(config.qualifications.map((q) => [q.id, q.label]));
  labels.set('multiple', '複数資格（会員など）');
  labels.set('unclassified', '未分類');
  return [...totals.entries()]
    .map(([id, row]) => ({ id, label: labels.get(id) ?? id, value: row.value, byChannel: row.byChannel }))
    .sort((a, b) => b.value - a.value);
}
