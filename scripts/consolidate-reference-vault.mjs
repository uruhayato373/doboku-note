#!/usr/bin/env node
/** Inventory and verify an explicit, resumable source-vault consolidation plan.
 * Metadata snapshots and receipts are local .tmp artifacts; no source text enters Git.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadDriveConfig, loadDriveManifest, resolveVaultRoot, realBytesAndHashes, writeDriveManifestAtomic } from './lib/drive-vault.mjs';
import { loadReferenceSources, transcriptDirsForSource } from './lib/reference-sources.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const args = process.argv.slice(2);
const work = path.join(REPO_ROOT, '.tmp/reference-vault-consolidation');
fs.mkdirSync(work, { recursive: true });
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const save = (name, value) => fs.writeFileSync(path.join(work, name), JSON.stringify(value, null, 2) + '\n');
const cfg = loadDriveConfig();
const refs = loadReferenceSources().sources;
const manifest = loadDriveManifest();
if (args.includes('--snapshot')) {
  if (fs.existsSync(path.join(work,'manifest-before.json'))) throw new Error('Preserve the existing migration snapshot');
  save('manifest-before.json', manifest);
  save('drive-config-before.json', cfg);
  console.log('Saved expanded manifest and routing configuration');
  process.exit(0);
}
const root = resolveVaultRoot({ cfg }).root;
if (!root) throw new Error('Drive mount required');
const listing = (dir, fresh = false) => {
  const name = dir === 'doboku-note' ? 'vault' : 'civil1-personal';
  const p = path.join(work, name + '.json');
  if (fresh || !fs.existsSync(p)) {
    const result = execFileSync('rclone', ['lsjson', '--recursive', '--files-only', '--hash', 'doboku-gdrive:' + dir], { encoding: 'utf8', maxBuffer: 150e6 });
    save(name + '.json', JSON.parse(result));
  }
  return json(p).map(f => ({ ...f, Path: f.Path.normalize('NFC') }));
};
const fingerprint = f => `${f.Size}:${f.Hashes?.md5 || ''}`;
const checkCloud = (expected, current, label) => {
  if (!current || !expected.Hashes?.md5 || fingerprint(current) !== fingerprint(expected)) throw new Error('Cloud mismatch: ' + label);
};
const safeAbs = rel => {
  if (rel.split('/').some(s=>!s||s==='.'||s==='..') || !/^(?:文字起こし|原資料PDF)\//.test(rel)) throw new Error('Unsafe path: '+rel);
  return path.join(root,rel);
};
const parallel = async (items, fn, count=4) => {
  let index=0;
  await Promise.all(Array.from({length:count},async()=>{while(index<items.length){const i=index++;await fn(items[i],i);}}));
};

if (args.includes('--plan')) {
  if (fs.existsSync(path.join(work,'move-receipt.json'))) throw new Error('Migration already started; do not replace its plan');
  const vault = listing('doboku-note', args.includes('--refresh'));
  const personalRoot = '個人管理/資格試験/1級土木施工管理技士';
  const personal = listing(personalRoot, args.includes('--refresh'));
  const pdfs = [...vault.filter(f => f.Path.startsWith('原資料PDF/') && /\.pdf$/i.test(f.Path)).map(f => ({...f,scope:'vault'})),
    ...personal.filter(f => /\.pdf$/i.test(f.Path)).map(f => ({...f,Path:personalRoot+'/'+f.Path,scope:'mydrive'}))];
  const canonical = new Set(Object.values(manifest.entries).filter(e => e.group === 'reference-book-source-pdf').map(e => e.vaultPath));
  const hashes = new Map();
  for (const f of pdfs) {
    if (!f.Hashes?.md5) throw new Error('Missing PDF hash: ' + f.Path);
    const k = fingerprint(f); if (!hashes.has(k)) hashes.set(k, []); hashes.get(k).push(f);
  }
  const score = f => canonical.has(f.Path) ? 0 : f.scope === 'mydrive' ? 9 : f.Path.startsWith('原資料PDF/教材/') ? 5 : f.Path.startsWith('原資料PDF/共通仕様書/沖縄総合事務局/') ? 2 : 1;
  const duplicates = [];
  for (const members of hashes.values()) {
    if (members.length < 2) continue;
    members.sort((a,b) => score(a)-score(b) || a.Path.localeCompare(b.Path,'ja'));
    const keep = members[0];
    for (const duplicate of members.slice(1)) duplicates.push({ keep, duplicate });
  }
  const routes = refs.flatMap(s => transcriptDirsForSource(s).map(dir => ({
    prefix: '文字起こし/' + dir.replace(/^content\/sources\/textbook\//,''),
    target: s.origin?.vaultDir ? s.origin.vaultDir+'/ocr' : s.id === 'civil-practice-note' ? '原資料PDF/書籍/civil-practice-note__土木施工実務ノート/ocr' : null,
    sourceId: s.id,
  }))).sort((a,b)=>b.prefix.length-a.prefix.length);
  const moves = [], unresolved = [];
  for (const f of vault.filter(f=>f.Path.startsWith('文字起こし/'))) {
    let target;
    const route = routes.find(r=>f.Path.startsWith(r.prefix+'/'));
    if (route?.target) target = route.target + f.Path.slice(route.prefix.length);
    else if (f.Path.startsWith('文字起こし/共通仕様書/')) {
      const rest = f.Path.slice('文字起こし/共通仕様書/'.length).split('/');
      target = rest[0] === '_収集メタデータ'
        ? '原資料PDF/共通仕様書/' + rest.join('/')
        : '原資料PDF/共通仕様書/' + rest.slice(0,2).join('/') + '/ocr/' + rest.slice(2).join('/');
    } else if (f.Path === '文字起こし/技術士（総監）/README.md') {
      target = '原資料PDF/書籍/_案内/技術士総監_README.md';
    }
    if (!target) { unresolved.push(f.Path); continue; }
    const existing = vault.find(x=>x.Path===target);
    if (existing) checkCloud(f,existing,target);
    moves.push({from:f.Path,to:target,file:f,existing:existing||null});
  }
  const collisions = moves.filter((m,i)=>moves.some((n,j)=>i!==j&&m.to===n.to));
  const plan = { createdAt:new Date().toISOString(), pdfCount:pdfs.length, duplicates, moves, unresolved, collisions,
    duplicateBytes:duplicates.reduce((n,r)=>n+r.duplicate.Size,0) };
  save('plan.json',plan);
  console.log(JSON.stringify({pdfs:pdfs.length,duplicatePdfs:duplicates.length,duplicateMiB:Math.round(plan.duplicateBytes/1048576),transcriptFiles:moves.length,unresolved,collisions:collisions.map(m=>m.to),
    moveDirectories:new Set(moves.map(m=>path.posix.dirname(m.to))).size,
    nonBookDuplicates:duplicates.filter(d=>!canonical.has(d.keep.Path)).map(d=>({keep:d.keep.Path,remove:d.duplicate.Path}))},null,2));
  if (unresolved.length || collisions.length) process.exitCode=1;
} else if (args.includes('--move')) {
  if(!args.includes('--commit')) throw new Error('Use the reviewed plan with --move --commit');
  const plan=json(path.join(work,'plan.json'));
  if(plan.unresolved.length||plan.collisions.length) throw new Error('Unresolved plan');
  const receipt={startedAt:new Date().toISOString(),files:[]};
  let n=0;
  await parallel(plan.moves,async m=>{
    const from=safeAbs(m.from),to=safeAbs(m.to);
    const actual=fs.existsSync(from)?from:to;
    const h=await realBytesAndHashes(actual);
    if(h.md5!==m.file.Hashes.md5||h.bytes!==m.file.Size)throw new Error('Source changed: '+m.from);
    if(fs.existsSync(from)&&fs.existsSync(to)){
      const existing=await realBytesAndHashes(to);
      if(existing.sha256!==h.sha256||existing.bytes!==h.bytes)throw new Error('Destination differs: '+m.to);
    }
    receipt.files.push({from:m.from,to:m.to,...h});
    if(++n%50===0)console.log('Preflight '+n+'/'+plan.moves.length);
  });
  save('move-receipt.json',receipt);
  for(const m of plan.moves){
    const from=safeAbs(m.from),to=safeAbs(m.to);
    if(fs.existsSync(from)){
      fs.mkdirSync(path.dirname(to),{recursive:true});
      if(fs.existsSync(to))fs.unlinkSync(from);else fs.renameSync(from,to);
    }
  }
  for(const source of refs.filter(s=>s.bookBundle)) fs.mkdirSync(safeAbs(source.origin.vaultDir+'/ocr'),{recursive:true});
  receipt.completedAt=new Date().toISOString();save('move-receipt.json',receipt);
  console.log('Moved '+plan.moves.length+' files, no copies created');
} else if (args.includes('--verify-duplicates')) {
  const plan=json(path.join(work,'plan.json'));
  const receipts=[];let n=0;
  const measured=new Map();
  const hash=f=>{
    const abs=f.scope==='mydrive'?path.join(path.dirname(root),f.Path):safeAbs(f.Path);
    if(!measured.has(abs))measured.set(abs,realBytesAndHashes(abs));return measured.get(abs);
  };
  await parallel(plan.duplicates,async r=>{
    const [keep,duplicate]=await Promise.all([hash(r.keep),hash(r.duplicate)]);
    if(keep.sha256!==duplicate.sha256||keep.bytes!==duplicate.bytes||keep.md5!==r.keep.Hashes.md5||duplicate.md5!==r.duplicate.Hashes.md5)throw new Error('Duplicate content differs: '+r.duplicate.Path);
    receipts.push({keep:r.keep,duplicate:r.duplicate,...keep,verifiedAt:new Date().toISOString()});
    if(++n%10===0)console.log('Verified duplicate '+n+'/'+plan.duplicates.length);
  });
  save('duplicate-receipt.json',receipts);
  console.log('PASS '+receipts.length+' duplicate pairs; all source bytes identical');
} else if (args.includes('--retarget-manifest')) {
  if(!args.includes('--commit')) throw new Error('--commit required');
  const plan=json(path.join(work,'plan.json'));
  const before=json(path.join(work,'manifest-before.json'));
  const moves=new Map(plan.moves.map(m=>[m.from,m.to]));
  const pdfAliases=new Map(plan.duplicates.filter(r=>r.duplicate.scope==='vault').map(r=>[r.duplicate.Path,r.keep]));
  const rekeys=new Map();let changed=0;
  for(const [key,e]of Object.entries(manifest.entries)){
    const old=before.entries[key];
    if(e.group==='source-transcript'&&old){
      const to=moves.get(old.vaultPath);if(!to)throw new Error('Transcript missing from plan: '+key);
      if(!fs.existsSync(safeAbs(to)))throw new Error('Transcript not moved: '+to);
      e.vaultPath=to;
      if(key.startsWith('content/sources/textbook/書籍/')){
        const rest=key.slice('content/sources/textbook/書籍/'.length);const split=rest.indexOf('/');
        const newKey='content/sources/books/'+rest.slice(0,split)+'/ocr/'+rest.slice(split+1);
        manifest.entries[newKey]=e;delete manifest.entries[key];rekeys.set(key,newKey);
        const oldAbs=path.join(REPO_ROOT,key),newAbs=path.join(REPO_ROOT,newKey);
        if(fs.existsSync(oldAbs)&&!fs.existsSync(newAbs)){fs.mkdirSync(path.dirname(newAbs),{recursive:true});fs.renameSync(oldAbs,newAbs);}
      }
      changed++;
    }
    const keep=pdfAliases.get(e.vaultPath);
    if(keep){if(e.md5!==keep.Hashes.md5||e.bytes!==keep.Size)throw new Error('Alias mismatch: '+key);e.vaultPath=keep.Path;e.adopted=true;changed++;}
  }
  writeDriveManifestAtomic(manifest);
  for(const s of refs.filter(s=>s.bookBundle)){
    const p=path.join(REPO_ROOT,'content/sources/books',s.bookBundle.directory,'book-manifest.json');const book=json(p);let dirty=false;
    for(const a of book.ocrArtifacts||[])if(rekeys.has(a.repoPath)){a.repoPath=rekeys.get(a.repoPath);dirty=true;}
    if(dirty){const text=JSON.stringify(book,null,2)+'\n';fs.writeFileSync(p,text);fs.writeFileSync(safeAbs(s.origin.vaultDir+'/book-manifest.json'),text);}
  }
  console.log('Updated '+changed+' manifest routes; logical aliases share canonical bytes');
} else if (args.includes('--prepare-delete')) {
  const receipts=json(path.join(work,'duplicate-receipt.json'));
  const plan=json(path.join(work,'plan.json'));
  if(receipts.length!==plan.duplicates.length)throw new Error('Incomplete duplicate verification');
  const vault=listing('doboku-note',true);
  const personalRoot='個人管理/資格試験/1級土木施工管理技士';
  const personal=listing(personalRoot,true).map(f=>({...f,Path:personalRoot+'/'+f.Path}));
  for(const r of receipts){
    for(const f of [r.keep,r.duplicate]){
      const found=(f.scope==='mydrive'?personal:vault).find(x=>x.Path===f.Path);
      checkCloud(f,found,f.Path);
      if(f.ID!==found.ID)throw new Error('File identity changed: '+f.Path);
    }
    if(Object.values(manifest.entries).some(e=>e.vaultPath===r.duplicate.Path))throw new Error('Manifest still references duplicate: '+r.duplicate.Path);
  }
  const prepared={verifiedAt:new Date().toISOString(),bytes:plan.duplicateBytes,files:receipts.map(r=>({
    removeId:r.duplicate.ID,removePath:r.duplicate.Path,removeScope:r.duplicate.scope,
    keepId:r.keep.ID,keepPath:r.keep.Path,bytes:r.bytes,sha256:r.sha256,md5:r.md5,
  }))};
  save('delete-prepared.json',prepared);
  console.log('PASS cloud identity/content and manifest retargeting for '+receipts.length+' duplicate PDFs');
} else if (args.includes('--prune-transcript-dirs')) {
  if(!args.includes('--commit'))throw new Error('--commit required');
  const receipt=json(path.join(work,'move-receipt.json'));
  if(!receipt.completedAt)throw new Error('Move not complete');
  const oldRoot=path.join(root,'文字起こし');let removed=0;
  const prune=dir=>{
    if(!fs.existsSync(dir))return;
    for(const e of fs.readdirSync(dir,{withFileTypes:true})){
      if(e.isDirectory())prune(path.join(dir,e.name));
      else if(e.name==='.DS_Store'){
        const file=path.join(dir,e.name),bytes=fs.readFileSync(file);
        if(bytes.subarray(0,8).toString('hex')!=='0000000142756431')throw new Error('Not Finder metadata: '+file);
        const saved=path.join(work,'finder-metadata',path.relative(oldRoot,file));
        fs.mkdirSync(path.dirname(saved),{recursive:true});fs.renameSync(file,saved);
      }
      else throw new Error('Unmoved file remains: '+path.join(dir,e.name));
    }
    fs.rmdirSync(dir);removed++;
  };
  prune(oldRoot);console.log('Removed '+removed+' empty transcript directories; no content deleted');
} else if (args.includes('--prune-source-dirs')) {
  if(!args.includes('--commit'))throw new Error('--commit required');
  const prepared=json(path.join(work,'delete-prepared.json'));
  const candidates=new Set();
  for(const r of prepared.files){
    const scopeRoot=r.removeScope==='mydrive'?path.dirname(root):root;
    const file=path.join(scopeRoot,r.removePath);
    if(fs.existsSync(file))throw new Error('Deleted PDF still on mount: '+r.removePath);
    const limit=r.removeScope==='mydrive'?path.join(scopeRoot,'個人管理/資格試験/1級土木施工管理技士'):path.join(root,...r.removePath.split('/').slice(0,2));
    let dir=path.dirname(file);
    while(dir!==limit&&dir.startsWith(limit+path.sep)){candidates.add(dir);dir=path.dirname(dir);}
  }
  let removed=0;
  for(const dir of [...candidates].sort((a,b)=>b.length-a.length)){
    if(!fs.existsSync(dir))continue;
    if(fs.readdirSync(dir).length===0){fs.rmdirSync(dir);removed++;}
  }
  console.log('Removed '+removed+' empty former PDF directories; nonempty directories preserved');
} else if (args.includes('--verify-removals')) {
  const prepared=json(path.join(work,'delete-prepared.json'));
  const vault=listing('doboku-note',true);
  const personal=listing('個人管理/資格試験/1級土木施工管理技士',true);
  const ids=new Set([...vault,...personal].map(f=>f.ID));
  for(const r of prepared.files){
    if(ids.has(r.removeId))throw new Error('Duplicate still active: '+r.removePath);
    const keep=vault.find(f=>f.ID===r.keepId);
    if(!keep||keep.Path!==r.keepPath||keep.Size!==r.bytes||keep.Hashes.md5!==r.md5)throw new Error('Canonical missing/changed: '+r.keepPath);
  }
  const pdfs=[...vault.filter(f=>f.Path.startsWith('原資料PDF/')&&/\.pdf$/i.test(f.Path)),...personal.filter(f=>/\.pdf$/i.test(f.Path))];
  if(new Set(pdfs.map(fingerprint)).size!==pdfs.length)throw new Error('PDF duplicates remain');
  console.log('PASS '+prepared.files.length+' duplicates removed; '+pdfs.length+' PDFs remain; identical PDF duplicates 0');
} else if (args.includes('--verify-moves')) {
  const plan=json(path.join(work,'plan.json'));
  const current=listing('doboku-note',true);
  for(const m of plan.moves) checkCloud(m.file,current.find(f=>f.Path===m.to),m.to);
  const stale=current.filter(f=>f.Path.startsWith('文字起こし/'));
  if(stale.length) throw new Error('Old transcript files remain: '+stale.length);
  console.log('PASS cloud content hashes for '+plan.moves.length+' moved files; old transcript files 0');
} else {
  console.log('Inventory: --snapshot / --plan [--refresh]. Move: --move --commit / --retarget-manifest --commit / --prune-transcript-dirs --commit. Verify: --verify-moves / --verify-duplicates / --prepare-delete / --verify-removals. PDF deletion is external and requires the prepared receipt.');
}
