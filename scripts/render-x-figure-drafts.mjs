#!/usr/bin/env node
// 図解投稿の制作入力を確認し、サイト図から画像を再生成する。投稿・予約は行わない。
import { readFileSync, mkdirSync, renameSync, rmSync, realpathSync } from 'node:fs';
import { resolve, dirname, join, basename, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { splitTweets, tweetLength } from './check-x-length.mjs';
import { renderFigureSns } from '../.claude/scripts/sns/render-figure-sns.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function validateXFigureDraft(draft,root=ROOT) {
  if(!/^\d{3}-[a-z0-9-]+$/.test(draft))throw Error('draftは番号付き下書き名で指定');
  const dir=join(root,'content/sns/x/draft',draft);
  const items=JSON.parse(readFileSync(join(dir,'images.json'),'utf8'));
  if(!Array.isArray(items)||!items.length)throw Error('図解の制作入力が0件');
  const files=new Set(),tweets=new Set();
  const bodies=splitTweets(readFileSync(join(dir,'tweets.md'),'utf8'));
  if(new Set(bodies.map(t=>t.num)).size!==bodies.length)throw Error('本文の投稿番号が重複しています');
  const states=JSON.parse(readFileSync(join(dir,'status.json'),'utf8')).tweets;
  for(const item of items){
    if(!/^img\/tweet-\d{2}-[a-z0-9-]+\.png$/.test(item.file)||files.has(item.file)||tweets.has(item.tweet))throw Error('画像名または投稿番号が不正・重複');
    files.add(item.file);tweets.add(item.tweet);
    if(states?.[item.tweet]?.status!=='draft'||states[item.tweet].image!==item.file)throw Error('対象が下書きでない、または画像参照が不一致');
    const body=bodies.find(t=>String(t.num)===String(item.tweet))?.body;
    if(!body || states[item.tweet].text?.trim()!==body || tweetLength(body)>280)throw Error('本文とstatusが不一致、または280文字を超過');
    if(!item.needs?.trim()||!item.concept?.trim()||[...item.concept].length>44)throw Error('疑問と44文字以内の見出しが必要');
    const match=item.article?.path?.match(/^content\/site\/([a-z0-9-]+)\/([a-z0-9-]+)\/article\.mdx$/);
    if(!match||!item.figure?.path?.startsWith(`content/site/${match[1]}/${match[2]}/img/`)||!/^figure-[a-zA-Z0-9_-]+\.svg$/.test(basename(item.figure.path)))throw Error('元記事・元図の対応が不正');
    for(const ref of [item.article,item.figure]){
      if(ref.path.split('/').includes('..')||ref.path.includes('\\')||!/^[a-f0-9]{64}$/.test(ref.sha256??''))throw Error('出典のパスまたはハッシュが不正');
      const full=realpathSync(resolve(root,ref.path)),rel=relative(realpathSync(root),full);
      if(rel==='..'||rel.startsWith('../')||isAbsolute(rel))throw Error('repo外の参照');
      if(createHash('sha256').update(readFileSync(full)).digest('hex')!==ref.sha256)throw Error(`元記事・図が変更されています。意味を再確認してください: ${ref.path}`);
    }
  }
  return {dir,items};
}
export async function renderXFigureDraft(draft,{root=ROOT,outDir}={}) {
  const {dir,items}=validateXFigureDraft(draft,root),output=outDir?resolve(outDir):dir;
  const files=[];
  for(const item of items){
    const [, ,category,slug]=item.article.path.split('/');
    const temp=join(output,'img','.render-tmp');
    const [result]=await renderFigureSns({slug:`${category}/${slug}`,figure:basename(item.figure.path),concept:item.concept,format:'ig-single','out-dir':temp},root);
    mkdirSync(join(output,'img'),{recursive:true});const dest=join(output,item.file);renameSync(result.file,dest);rmSync(temp,{recursive:true});files.push(dest);
  }
  return files;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{const {values}=parseArgs({options:{draft:{type:'string'},check:{type:'boolean'},'out-dir':{type:'string'}}});if(values.check)console.log(`入力 ${validateXFigureDraft(values.draft).items.length}件 PASS`);else console.log((await renderXFigureDraft(values.draft,{outDir:values['out-dir']})).join('\n'));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
