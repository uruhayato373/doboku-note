/** 別作品IDの通常動画も、台本の大半が同じなら並行投入を止める。 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ACTIVE = new Set(['approved', 'rendered', 'uploaded_private', 'scheduled', 'published', 'refresh_due']);
const normalize = (s) => String(s ?? '').normalize('NFKC').replace(/\s+/gu, '');

/** 短い定型挨拶だけでは止めない。両台本の80%以上・5場面以上・200字以上の一致。 */
export function narrationOverlap(a, b) {
  const left = a.map(normalize).filter(Boolean);
  const right = b.map(normalize).filter(Boolean);
  const remaining = new Map();
  for (const line of right) remaining.set(line, (remaining.get(line) ?? 0) + 1);
  let matched = 0;
  let characters = 0;
  for (const line of left) {
    if (!(remaining.get(line) > 0)) continue;
    remaining.set(line, remaining.get(line) - 1);
    matched++;
    characters += line.length;
  }
  const total = Math.max(left.length, right.length);
  return { duplicate: matched >= 5 && characters >= 200 && matched / total >= 0.8, matched, total, characters };
}

/** candidateId は投入直前の1本。停止済みの公開は再投入も不可。素材の再利用だけでは重複扱いしない。 */
export function findDuplicateLongforms(root, reg, { candidateId, narrations } = {}) {
  const works = new Map((reg.works ?? []).map((w) => [`${w.exam}/${w.id}`, w]));
  const lines = new Map();
  const pubs = reg.publications.filter((p) => p.channel === 'youtube' && p.format === 'longform' && p.status !== 'stopped' &&
    (ACTIVE.has(p.status) || p.id === candidateId));
  const readLines = (p) => {
    if (lines.has(p.id)) return lines.get(p.id);
    const work = works.get(`${p.exam}/${p.work}`);
    let result = narrations?.get(p.id);
    if (result === undefined && work?.kind === 'video-pack') {
      const file = join(root, work.definition, 'storyboard.json');
      if (existsSync(file)) result = JSON.parse(readFileSync(file, 'utf8')).scenes?.map((s) => s.narration);
    }
    lines.set(p.id, result ?? []);
    return result ?? [];
  };
  const pairs = [];
  let checkedPairs = 0;
  for (let i = 0; i < pubs.length; i++) for (let j = i + 1; j < pubs.length; j++) {
    const a = pubs[i], b = pubs[j];
    if (a.exam !== b.exam || a.account !== b.account || a.work === b.work || (candidateId && a.id !== candidateId && b.id !== candidateId)) continue;
    const left = readLines(a), right = readLines(b);
    if (!left.length || !right.length) continue;
    checkedPairs++;
    const overlap = narrationOverlap(left, right);
    if (overlap.duplicate) pairs.push({ a: a.id, b: b.id, ...overlap });
  }
  return { pairs, checkedPairs };
}
