/**
 * render-reanchor.mjs — 表紙だけを変えた後に、完成動画の記録（provenance の specSha256・renderInputSha256）を今の制作入力へ結び直す判定（DN-1146）。
 * 書くのは registry.mjs の reanchor-render（台帳の書き手）。ここは検査と、書く中身の組み立てだけ。
 *
 * 決まり:
 * - 記録の specSha256 と同じ storyboard を git の履歴から探し、その版の制作入力で renderInputSha256 も一致することを確かめる（描いた入力を特定する）
 * - その版と今の入力の差が表紙の欄だけのときに限って結び直す。表紙の欄は storyboard の imageDesign.coverRevision・cover-design.json・
 *   pop-image.json の表紙の採用（activeCoverRevision と表紙の画像）。本文の場面・語り・画像・CTA が 1 か所でも違えば結び直さない（描き直す）
 * - 前の値と根拠の commit は provenance.reanchored に残す
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { longformInputHashOf } from './longform-render-integrity.mjs';

const sha = (body) => createHash('sha256').update(body).digest('hex');

/** 表紙の欄を除いた、本文の制作入力の形 */
export function bodyInputs(read) {
  const json = (name) => { const t = read(name); return t == null ? null : JSON.parse(String(t)); };
  const board = json('storyboard.json');
  if (board?.imageDesign) delete board.imageDesign.coverRevision;
  const pop = json('pop-image.json');
  return {
    videoPack: json('video-pack.json'), storyboard: board, cta: json('cta-design.json'),
    popBody: pop ? { body: pop.activeBodyRevision ?? null, images: pop.revisions?.[pop.activeBodyRevision]?.images?.map(({ sceneId, inputSha256, output }) => ({ sceneId, inputSha256, output })) ?? [] } : null,
  };
}

/** 2 つの版の本文の制作入力で違う欄の名前。空なら差は表紙の欄だけ */
export function bodyDifferences(oldRead, newRead) {
  const a = bodyInputs(oldRead), b = bodyInputs(newRead);
  return Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

/** 完成動画 1 件の結び直しの中身を組み立てる。問題があれば投げる（何も書かない） */
export function reanchorPlan(root, media, packDir) {
  const p = media?.provenance;
  if (!p?.specSha256 || !p.renderInputSha256) throw new Error(`${media?.id}: 制作入力の記録（specSha256・renderInputSha256）が無い`);
  const dir = join(root, packDir);
  const nowRead = (name) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name)) : null);
  const nowSpec = sha(nowRead('storyboard.json'));
  const nowInput = longformInputHashOf(nowRead);
  if (nowSpec === p.specSha256 && nowInput === p.renderInputSha256) throw new Error(`${media.id}: 記録は今の制作入力と一致している（結び直しは要らない）`);
  const git = (...a) => execFileSync('git', a, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
  const commits = String(git('log', '--format=%H', '--', `${packDir}/storyboard.json`)).trim().split('\n').filter(Boolean);
  const commit = commits.find((c) => sha(git('show', `${c}:${packDir}/storyboard.json`)) === p.specSha256);
  if (!commit) throw new Error(`${media.id}: 記録の storyboard（${p.specSha256.slice(0, 12)}）が git の履歴に無い`);
  const oldRead = (name) => { try { return git('show', `${commit}:${packDir}/${name}`); } catch { return null; } };
  if (longformInputHashOf(oldRead) !== p.renderInputSha256) throw new Error(`${media.id}: ${commit.slice(0, 9)} の制作入力が記録の renderInputSha256 と一致しない（描いた入力を特定できない）`);
  const diff = bodyDifferences(oldRead, nowRead);
  if (diff.length) throw new Error(`${media.id}: 表紙の欄の外も変わっている（${diff.join('・')}）。結び直さず描き直す`);
  return {
    ...media,
    provenance: {
      ...p, specSha256: nowSpec, renderInputSha256: nowInput,
      reanchored: { reason: 'cover-only', commit, specSha256: p.specSha256, renderInputSha256: p.renderInputSha256, at: new Date().toISOString() },
    },
  };
}
