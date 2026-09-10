#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readXReview } from './lib/x-review.mjs';
import { validateCharacterCard } from './lib/x-character-spec.mjs';
import { sha256File } from './lib/asset-storage.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=readXReview(root),local=process.argv.includes('--local'),errors=[];
const config=JSON.parse(fs.readFileSync(path.join(root,'.claude/config/x-review.json'),'utf8'));
const newRows=data.rows.filter(r=>r.newCard);
const expected=config.newCardDrafts.reduce((sum,d)=>sum+Object.keys(JSON.parse(fs.readFileSync(path.join(root,'content/sns/x/draft',d,'cards.json'),'utf8')).tweets).length,0);
if(!expected||newRows.length!==expected)errors.push(`画像原稿の欠落: ${newRows.length}/${expected}`);
const catalog=fs.readFileSync(path.join(root,'src/lib/note-magazines.ts'),'utf8');
const published=new Set([...catalog.matchAll(/id:\s*'[^']+',\s*published:\s*true,\s*noteUrl:\s*'([^']+)'/g)].map(m=>m[1]));
const byDay=new Map();let imageChecks=0;
for(const r of data.rows){const minutes=Number(r.time.slice(0,2))*60+Number(r.time.slice(3));const list=byDay.get(r.date)??[];list.push(minutes);byDay.set(r.date,list);if(!r.newCard)continue;
 if(r.weighted>280)errors.push(`${r.id}: ${r.weighted} weighted`);
 for(const issue of r.issues)if(local||issue!=='この端末では画像の再生成が必要')errors.push(`${r.id}: ${issue}`);
 const spec=JSON.parse(fs.readFileSync(path.join(root,'content/sns/x/draft',r.draft,'cards.json'),'utf8')).tweets[String(r.num)];
 try{validateCharacterCard(spec);}catch(e){errors.push(`${r.id}: ${e.message}`);}
 for(const p of spec.sourcePaths??[])if(typeof p!=='string'||path.isAbsolute(p)||p.split(/[\\/]/).includes('..')||!fs.existsSync(path.join(root,p)))errors.push(`${r.id}: 原稿出典が不正 ${p}`);
 if(r.funnel==='note'){
  const u=r.url?new URL(r.url):null;
  if(!u||!published.has(u.origin+u.pathname)||!u.pathname.includes('/m/'))errors.push(`${r.id}: 公開マガジンへの導線がありません`);
  if(u?.searchParams.get('utm_source')!=='x'||!u?.searchParams.get('utm_content'))errors.push(`${r.id}: UTMがありません`);
 }
 if(local&&r.imagePath){imageChecks++;if(sha256File(path.join(root,r.imagePath))!==r.imageSha256)errors.push(`${r.id}: PNG hash不一致`);}
}
for(let d=new Date(data.from+'T00:00:00Z');d<=new Date(data.to+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1)){const day=d.toISOString().slice(0,10),mins=(byDay.get(day)??[]).sort((a,b)=>a-b);if(mins.length!==3)errors.push(`${day}: 3枠のはずが${mins.length}`);for(let i=1;i<mins.length;i++)if(mins[i]-mins[i-1]<60)errors.push(`${day}: 時刻重複または間隔不足`);}
if(!newRows.some(r=>r.funnel==='note'))errors.push('note導線が0件');
console.log(`[check-x-review] ${data.counts.all}枠 / 新原稿${newRows.length}件 / note ${data.counts.note}件 / PNG実体${imageChecks}件 / 違反${errors.length}件`);
if(!local)console.log('画像は元データ・描画台帳だけの検査。--localで端末の全PNG hashを照合。');
for(const e of errors)console.error(e);
process.exitCode=errors.length?1:0;
