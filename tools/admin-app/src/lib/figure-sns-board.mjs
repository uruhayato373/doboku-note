import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { globSync } from 'glob';
import { validateFigurePack, FIGURE_SLIDES } from '../../../../scripts/render-figure-pack.mjs';
import { validateXFigureDraft } from '../../../../scripts/render-x-figure-drafts.mjs';
import { normalizePosted } from '../../../../scripts/ig-status.mjs';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const message = error => error instanceof Error ? error.message : String(error);

/** @typedef {{draft:string, tweet:string, file:string, status:string, article:{path:string,sha256:string}, figure:{path:string,sha256:string}, issue:string}} XFigure */

/** 既存の制作入力・投稿状態・Drive台帳を結合する。第二の状態台帳は書かない。 */
export function figureSnsBoard(root) {
  const errors = [];
  let entries = {};
  try { entries = json(join(root, '.claude/state/assets/drive-manifest.json')).entries; }
  catch (error) { errors.push(`Drive台帳: ${message(error)}`); }
  /** @type {Map<string, XFigure[]>} */
  const xByFigure = new Map();
  const xRoot = join(root, 'content/sns/x/draft');
  if (existsSync(xRoot)) for (const draft of readdirSync(xRoot).sort()) {
    if (!/^\d{3}-[a-z0-9-]+-diagrams$/.test(draft)) continue;
    const dir = join(xRoot, draft), path = join(dir, 'images.json');
    if (!existsSync(path)) continue;
    try {
      const items = json(path), states = json(join(dir, 'status.json')).tweets;
      if (!Array.isArray(items)) throw new Error('images.jsonが配列ではありません');
      for (const item of items) {
        if (!item.figure?.path) throw new Error('元図の参照がありません');
        let issue = '';
        // 同じバッチで一部だけ投稿済みでも、残る下書きを個別に検査する。
        if (states?.[item.tweet]?.status === 'draft') {
          try { validateXFigureDraft(draft, root, { onlyTweet: item.tweet }); } catch (error) { issue = message(error); }
        }
        const list = xByFigure.get(item.figure.path) ?? [];
        list.push({ draft, tweet: item.tweet, file: item.file, status: states?.[item.tweet]?.status ?? 'unknown', article: item.article, figure: item.figure, issue });
        xByFigure.set(item.figure.path, list);
      }
    } catch (error) { errors.push(`X ${draft}: ${message(error)}`); }
  }
  const sources = globSync('content/sns/instagram/*/keyword-packs/*/source.json', { cwd: root }).sort();
  const rows = sources.map(path => {
    const pack = path.slice('content/sns/instagram/'.length, -'/source.json'.length);
    const dir = `content/sns/instagram/${pack}`, issues = [];
    let source;
    try { source = json(join(root, path)); }
    catch (error) { issues.push(message(error)); }
    try { validateFigurePack(pack, root); }
    catch (error) { issues.push(message(error)); }
    let igStatus = 'draft';
    if (existsSync(join(root, dir, 'posted.json'))) {
      try { if (normalizePosted(json(join(root, dir, 'posted.json')))?.carousel) igStatus = 'posted'; }
      catch (error) { igStatus = 'unknown'; issues.push(`IG公開状態: ${message(error)}`); }
    }
    if (!existsSync(join(root, dir, 'carousel/caption.txt'))) issues.push('IG投稿文がありません');
    const x = xByFigure.get(source?.figure?.path) ?? [];
    if (!x.length) issues.push('X図解下書きがありません');
    for (const item of x) {
      if (item.issue) issues.push(`X ${item.draft}: ${item.issue}`);
      if (item.status === 'unknown') issues.push('X投稿状態が未取得です');
      if (item.article?.sha256 !== source?.article?.sha256 || item.figure?.sha256 !== source?.figure?.sha256) issues.push('IGとXの元記事・元図が不一致です');
    }
    const assets = [
      ...FIGURE_SLIDES.map(name => `${dir}/carousel/img/${name}.png`),
      ...x.map(item => `content/sns/x/draft/${item.draft}/${item.file}`),
    ].map(rel => {
      const local = existsSync(join(root, rel)), entry = entries?.[rel];
      let matching = false;
      try { matching = !!entry?.sha256 && (!local || hash(join(root, rel)) === entry.sha256); }
      catch (error) { issues.push(`画像 ${rel}: ${message(error)}`); }
      if (!matching) issues.push(`保存台帳が未登録または不一致: ${rel}`);
      return { rel, local, archived: matching };
    });
    const localCount = assets.filter(asset => asset.local).length;
    return {
      pack, dir, needs: source?.needs ?? pack, nextStep: source?.nextStep ?? '', figure: source?.figure?.path ?? '',
      igStatus, x, assets, localCount, archivedCount: assets.filter(asset => asset.archived).length,
      issues: [...new Set(issues)],
      readiness: issues.length || errors.length ? 'review' : localCount === assets.length ? 'ready' : 'restore',
    };
  });
  return { rows, errors, sourceCount: sources.length, checkedCount: rows.length };
}
