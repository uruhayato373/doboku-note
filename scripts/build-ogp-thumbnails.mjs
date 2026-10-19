#!/usr/bin/env node
// OGP原本の表示用派生画像。原本台帳は変更しない。--supplyはR2へ供給し読み戻して検証する。
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { loadConfig, loadManifest, loadEnvLocal, makeS3, MANIFEST_PATH } from './lib/asset-storage.mjs';
import { REPO_ROOT as root } from './lib/repository-paths.mjs';
const widths = [248, 336, 640];
const hash = b => createHash('sha256').update(b).digest('hex');
const args = process.argv.slice(2);
const supply = args.includes('--supply');
const check = args.includes('--check');
const prefix = args.includes('--path') ? args[args.indexOf('--path') + 1] : 'content/site/';
// --changed-since <git の ref>: その ref の台帳から sha256 が変わった（または新しい）OGP だけを扱う。
// 何も指定しない --supply は全件の派生 3 枚を HeadObject で確かめるので 1 回 6,900 リクエストになり、
// OGP を 1 枚作るたびに全件を見ていた（R2 の Class B の大半・2026-10-20）。全件の自己修復は週次と手動に任せる
const changedSince = args.includes('--changed-since') ? args[args.indexOf('--changed-since') + 1] : null;
if (!prefix || (supply && check) || (args.includes('--changed-since') && !changedSince)) throw Error('引数を確認してください');
let entries = Object.entries(loadManifest().entries).filter(([p,e]) => p.startsWith(prefix) && e.group === 'site-ogp-png' && e.bucket === 'public');
if (!entries.length) throw Error('対象0件: 検査不成立');
if (changedSince) {
  const before = JSON.parse(execFileSync('git', ['show', `${changedSince}:${path.relative(root, MANIFEST_PATH)}`], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 })).entries ?? {};
  const all = entries.length;
  entries = entries.filter(([p, e]) => before[p]?.sha256 !== e.sha256);
  console.log(`--changed-since ${changedSince}: 台帳の OGP ${all} 件のうち変わった ${entries.length} 件だけを扱う`);
  if (!entries.length) { console.log('変わった OGP は 0 件（派生の確認は不要）'); process.exit(0); }
}
let client, sdk, bucket;
if (supply) {
  loadEnvLocal(); client = await makeS3(); sdk = await import('@aws-sdk/client-s3');
  bucket = loadConfig().buckets.public.name;
  if (!bucket) throw Error('公開バケット名がありません');
}
let sources=0, generated=0, skipped=0, unavailable=0;
async function processEntry([p,e]) {
  const local = path.resolve(root,p);
  if (!local.startsWith(path.join(root,'content','site') + path.sep) || !e.r2Key.startsWith('posts/')) throw Error('対象パス不正');
  if (!supply && !fs.existsSync(local)) {unavailable++;return;}
  const targets = widths.map(w=>({w,file:local.replace(/ogp\.png$/,`ogp-thumb-${w}.webp`),key:e.r2Key.replace(/ogp\.png$/,`ogp-thumb-${w}.webp`)}));
  if (targets.some(t=>t.file===local || t.key===e.r2Key)) throw Error(`原本の形式不正: ${p}`);
  if (check) {
    for (const t of targets) {
      const meta=await sharp(t.file).metadata();
      if(meta.width!==t.w || Math.abs(meta.height - t.w*630/1200)>1 || meta.format!=='webp' || fs.statSync(t.file).size>150000) throw Error(`サイズ検査失敗: ${t.file}`);
    }
    sources++;return;
  }
  if (supply) {
    const statuses = await Promise.all(targets.map(async t=>{
      try {const h=await client.send(new sdk.HeadObjectCommand({Bucket:bucket,Key:t.key}));return h.Metadata?.['source-sha256']===e.sha256 && h.Metadata?.['recipe']==='webp-72-v1';}
      catch(err){if(err.$metadata?.httpStatusCode===404)return false;throw err;}
    }));
    if(statuses.every(Boolean)){skipped++;return;}
  }
  const source = fs.existsSync(local) ? fs.readFileSync(local) : Buffer.from(await (await client.send(new sdk.GetObjectCommand({Bucket:bucket,Key:e.r2Key}))).Body.transformToByteArray());
  const sourceHash=hash(source);
  if(supply && sourceHash!==e.sha256) throw Error(`原本ハッシュ不一致: ${p}`);
  for(const t of targets){
    const output=await sharp(source).resize(t.w,Math.round(t.w*630/1200),{fit:'cover'}).webp({quality:72}).toBuffer();
    if(output.length>150000)throw Error(`サムネイルが大きすぎます: ${p}`);
    fs.mkdirSync(path.dirname(t.file),{recursive:true});fs.writeFileSync(t.file,output);
    if(supply){
      await client.send(new sdk.PutObjectCommand({Bucket:bucket,Key:t.key,Body:output,ContentType:'image/webp',CacheControl:'public,max-age=86400',Metadata:{'source-sha256':sourceHash,recipe:'webp-72-v1'}}));
      const back=Buffer.from(await (await client.send(new sdk.GetObjectCommand({Bucket:bucket,Key:t.key}))).Body.transformToByteArray());
      if(hash(back)!==hash(output))throw Error(`R2読み戻し不一致: ${t.key}`);
    }
    generated++;
  }
  sources++;
}
// 初回全量供給も既存ワークフローの時間枠に収める。失敗は収集して全ワーカー終了後に返す。
let cursor=0;
const errors=[];
await Promise.all(Array.from({length:4},async()=>{
  while(cursor<entries.length){const entry=entries[cursor++];try{await processEntry(entry);}catch(error){errors.push(`${entry[0]}: ${error.message}`);}}
}));
console.log(JSON.stringify({mode:supply?'supply':check?'check':'local',targets:entries.length,sources,generated,remoteCurrent:skipped,localMissing:unavailable}));
if(errors.length)throw Error(errors.join('\n'));
if(!sources && !skipped)throw Error('実体処理0件: 未検証');
