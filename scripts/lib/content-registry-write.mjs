/**
 * content-registry-write.mjs — コンテンツ台帳へ行を書く唯一の入口（npm run registry・npm run media が使う）。
 * 行は id 順に並べ、型（zod）を検査してから書く（dataset-write.mjs の writeDataset。同じ中身なら書かない）。
 * 読む側の補助の欄（file・exam・channel・scope）はここで落とす。
 */
import { readDatasetIf } from './dataset-io.mjs';
import { writeDataset } from './dataset-write.mjs';
import { CHANNEL_DATASET } from './content-registry.mjs';

const HELPER_KEYS = ['file', 'exam', 'channel', 'scope'];
const strip = (row) => Object.fromEntries(Object.entries(row).filter(([k, v]) => !HELPER_KEYS.includes(k) && v !== undefined));
const byId = (a, b) => a.id.localeCompare(b.id);

/** 既存の行に rows を id で上書き・追加して並べ直す */
function merge(existing, rows) {
  const map = new Map(existing.map((r) => [r.id, r]));
  for (const r of rows) map.set(r.id, strip(r));
  return [...map.values()].sort(byId);
}

export function upsertWorks(root, exam, rows) {
  const values = { name: `${exam}.json` };
  const cur = readDatasetIf(root, 'registry.works', { values });
  return writeDataset(root, 'registry.works', { schemaVersion: 1, exam, works: merge(cur?.works ?? [], rows) }, { values });
}

export function upsertPublications(root, channel, exam, rows) {
  const id = CHANNEL_DATASET[channel];
  if (!id) throw new Error(`台帳に無いチャネル: ${channel}`);
  const values = { name: `${exam}.json` };
  const cur = readDatasetIf(root, id, { values });
  return writeDataset(root, id, { schemaVersion: 1, channel, exam, publications: merge(cur?.publications ?? [], rows) }, { values });
}

export function upsertMedia(root, scope, rows) {
  const values = { name: `${scope}.json` };
  const cur = readDatasetIf(root, 'registry.media', { values });
  return writeDataset(root, 'registry.media', { schemaVersion: 1, scope, media: merge(cur?.media ?? [], rows) }, { values });
}
