/**
 * content-registry-write.mjs — コンテンツ台帳へ行を書く唯一の入口（npm run registry・npm run media が使う）。
 * 行は id 順に並べ、型（zod）を検査してから書く（dataset-write.mjs の writeDataset。同じ中身なら書かない）。
 * 読む側の補助の欄（file・exam・channel・scope）はここで落とす。
 */
import { readDatasetIf } from './dataset-io.mjs';
import { writeDataset } from './dataset-write.mjs';
import { CHANNEL_DATASET } from './content-registry.mjs';
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { datasetPath } from './datasets.mjs';
import { formatDataset } from './dataset-write.mjs';

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

/** 外部操作中は公開台帳を排他し、並行変更を検知したら書かない。既存lockを回収しない。 */
export function publicationWriteSession(root, channel, exam) {
  const id = CHANNEL_DATASET[channel], values = { name: `${exam}.json` };
  const path = join(root, datasetPath(id, values)), lock = `${path}.lock`;
  const owner = randomUUID();
  const fd = openSync(lock, 'wx', 0o600);
  let expected;
  try {
    try { writeFileSync(fd, owner); fsyncSync(fd); } finally { closeSync(fd); }
    expected = readFileSync(path, 'utf8');
  } catch (error) { unlinkSync(lock); throw error; }
  const assertUnchanged = () => {
    if (readFileSync(lock, 'utf8') !== owner || readFileSync(path, 'utf8') !== expected) throw new Error('公開台帳に並行変更があるため書き込みを停止');
  };
  return {
    assertUnchanged,
    save(row) {
      assertUnchanged();
      const doc = JSON.parse(expected);
      if (!doc.publications.some(p => p.id === row.id)) throw new Error('新しい行をこの入口で作らない');
      doc.publications = merge(doc.publications, [row]);
      const { text } = formatDataset(id, doc, { values });
      const tmp = `${path}.${owner}.tmp`;
      let out;
      try {
        out = openSync(tmp, 'wx', 0o600); writeFileSync(out, text); fsyncSync(out); closeSync(out); out = undefined;
        assertUnchanged(); renameSync(tmp, path); expected = text;
        const dir = openSync(dirname(path), 'r');
        try { fsyncSync(dir); } finally { closeSync(dir); }
      } finally { if (out !== undefined) closeSync(out); if (existsSync(tmp)) unlinkSync(tmp); }
      if (readFileSync(path, 'utf8') !== text) throw new Error('公開台帳の保存後照合に失敗');
    },
    close() { if (readFileSync(lock, 'utf8') !== owner) throw new Error('lock所有者が変わったため解放しない'); unlinkSync(lock); },
  };
}
