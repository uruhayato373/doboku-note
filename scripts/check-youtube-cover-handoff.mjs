import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadDriveManifest, realBytesAndHashes } from './lib/drive-vault.mjs';
import { coverInputDigest } from './lib/youtube-approved-cover.mjs';

export function checkHandoffEntries(specs, entries) {
 const problems=[];
 if(!specs.length) problems.push('採用画像0件＝検査不成立');
 for(const spec of specs){
  const image=spec.approvedImage, entry=entries[image.path];
  if(image.specSha256!==coverInputDigest(spec)) problems.push('採用後に入力が変更: '+image.path);
  if(!entry || entry.group!=='youtube-approved-cover' || entry.sha256!==image.sha256 || !entry.verifiedAt || !entry.driveFileId) problems.push('Drive登録・読み戻し検証が欠落または不一致: '+image.path);
 }
 return problems;
}
async function main(){
 const paths=[];
 function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name==='cover-design.json')paths.push(p);}}
 walk(join(REPO_ROOT,'content/sns/video-packs'));paths.push(join(REPO_ROOT,'content/sns/youtube/cover-design.json'));
 const specs=paths.flatMap(p=>Object.values(JSON.parse(readFileSync(p,'utf8')).covers??{})).filter(s=>s.approvedImage);
 const manifest=loadDriveManifest();const problems=checkHandoffEntries(specs,manifest.entries);
 if(process.argv.includes('--local')) for(const spec of specs){try{const h=await realBytesAndHashes(join(REPO_ROOT,spec.approvedImage.path));if(h.sha256!==spec.approvedImage.sha256)problems.push('ローカルSHA不一致: '+spec.approvedImage.path);}catch{problems.push('ローカル実体なし: '+spec.approvedImage.path);}}
 console.log(`[check-youtube-cover-handoff] 採用画像 ${specs.length} 件 / 不整合 ${problems.length} / ${process.argv.includes('--local')?'ローカル全件SHA検査':'台帳検査のみ・クラウド実体検査0件'}`);
 for(const p of problems)console.error(p);
 if(problems.length)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=2;});
