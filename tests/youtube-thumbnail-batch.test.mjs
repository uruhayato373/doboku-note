import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { digest, specDigest, buildCoverPlan } from '../scripts/lib/youtube-cover-rollout.mjs';
import { updateThumbnailBatch } from '../scripts/lib/youtube-thumbnail-batch.mjs';
import { compareThumbnail, fetchThumbnail } from '../scripts/lib/youtube-thumbnail-image.mjs';
const channel={id:'UCHRnXPqoc0Hls8nXiK_ZYqA',title:'doboku-note'}, videoId='hJYV_U0qKvA';
const buffer=await sharp({create:{width:1280,height:720,channels:3,background:'#0f2742'}}).png().toBuffer();
const spec={format:'longform',exam:'civil-1',headline:['工事概要','７項目の埋め方'],accentLine:1,subtitle:'',character:{pose:'explaining',frame:'waist'}};
const source={sourceKey:'one',spec,title:'そのまま',knownVideoId:videoId};
const approval={entries:[{sourceKey:'one',specSha256:specDigest(spec),sha256:digest(buffer)}]};
const video={id:videoId,snippet:{channelId:channel.id,title:'そのまま',description:'保持',thumbnails:{}},status:{privacyStatus:'private',publishAt:'2026-10-01T10:00:00Z'},contentDetails:{duration:'PT3M'}};
const inventory={complete:true,channel,checked:1,videos:[video]};
const plan=buildCoverPlan(inventory,[source],approval);
function mock({fail=false,title='そのまま'}={}){
 const writes=[];
 return {writes,youtube:{
  channels:{list:async()=>({data:{items:[{id:channel.id,snippet:{title:channel.title}}]}})},
  videos:{list:async()=>({data:{items:[{...structuredClone(video),snippet:{...video.snippet,title}}]}})},
  thumbnails:{set:async(request,options)=>{writes.push({request,options});if(fail)throw new Error('uncertain');return {data:{}};}},
 }};
}
const opts={expectedPlanSha256:plan.sha256,render:async()=>buffer,fetchImage:async()=>({data:buffer,url:'own-image',sha256:digest(buffer)}),compare:async()=>({matched:false}),record:()=>{}};
test('全件被覆・タイトル・一意な元データ・確認済み画像がない計画を拒否',()=>{
 for(const [inv,s,a]of [[{...inventory,complete:false},[source],approval],[inventory,[],approval],[inventory,[{...source,title:'違う'}],approval],[inventory,[source,source],approval],[inventory,[source],{entries:[{...approval.entries[0],specSha256:'wrong'}]}],[inventory,[source],{entries:[approval.entries[0],approval.entries[0]]}]])assert.throws(()=>buildCoverPlan(inv,s,a));
 assert.equal(buildCoverPlan(inventory,[{...source,knownVideoId:null}],approval).sha256,plan.sha256);
 const published=structuredClone(inventory);published.videos[0].status.privacyStatus='public';
 assert.equal(buildCoverPlan(published,[source],approval).sha256,plan.sha256);
});
test('既定dry-run・planSHA違い・ゼロ対象・画像差替え・タイトルドリフトは書込0',async()=>{
 const m=mock();await updateThumbnailBatch(m.youtube,plan,opts);assert.equal(m.writes.length,0);
 for(const overrides of [{expectedPlanSha256:'wrong'},{start:100},{limit:0},{render:async()=>Buffer.from('changed')},{onlyVideoId:'nonexistent'}])await assert.rejects(updateThumbnailBatch(m.youtube,plan,{...opts,commit:true,...overrides}));
 assert.equal(m.writes.length,0);
 const changed=mock({title:'改題'});await assert.rejects(updateThumbnailBatch(changed.youtube,plan,{...opts,commit:true}),/Title/);assert.equal(changed.writes.length,0);
});
test('更新前画像と全phaseを保存、thumbnails.setのみ1回、不確かな結果を再送しない',async()=>{
 const m=mock(), records=[];
 const result=await updateThumbnailBatch(m.youtube,plan,{...opts,commit:true,record:r=>records.push(structuredClone(r))});
 assert.equal(m.writes.length,1);assert.deepEqual(m.writes[0].options,{retry:false});
 assert.ok(records.find(r=>r.phase==='sending').backup.data);
 assert.equal(result.pending,1);assert.equal(result.apiAccepted,1);
 const broken=mock({fail:true});const phases=[];
 await assert.rejects(updateThumbnailBatch(broken.youtube,plan,{...opts,commit:true,record:r=>phases.push(r.phase)}));
 assert.equal(broken.writes.length,1);assert.equal(phases.at(-1),'write-outcome-uncertain');
});
test('取得済み画像が一致なら外部書込なし、backup保存失敗なら送信しない',async()=>{
 const m=mock();const result=await updateThumbnailBatch(m.youtube,plan,{...opts,commit:true,compare:async()=>({matched:true})});
 assert.equal(result.alreadyMatching,1);assert.equal(m.writes.length,0);
 await assert.rejects(updateThumbnailBatch(m.youtube,plan,{...opts,commit:true,record:()=>{throw new Error('disk');}}));assert.equal(m.writes.length,0);
});
test('JPEG派生は画像一致、局所的な文字領域差分は不一致',async()=>{
 const content=Buffer.from('<svg width="1280" height="720"><rect width="1280" height="720" fill="#0f2742"/><rect x="100" y="150" width="300" height="100" fill="white"/></svg>');
 const png=await sharp(content).png().toBuffer(), jpeg=await sharp(png).resize(640,360).jpeg({quality:90}).toBuffer();
 assert.equal((await compareThumbnail(png,jpeg)).matched,true);
 const altered=await sharp(png).composite([{input:Buffer.from('<svg width="30" height="40"><rect width="30" height="40" fill="#0f2742"/></svg>'),left:140,top:175}]).jpeg({quality:90}).toBuffer();
 assert.equal((await compareThumbnail(png,altered)).matched,false);
});
test('サムネイル取得は既知YouTubeホストと動画IDのみ',async()=>{
 let fetched=0;
 for(const url of ['https://evil.example/a','https://i.ytimg.com/vi/wrong/maxresdefault.jpg'])await assert.rejects(fetchThumbnail({...video,snippet:{thumbnails:{maxres:{url,width:1280,height:720}}}},async()=>{fetched++;}));
 assert.equal(fetched,0);
});
test('ShortsのYouTube生成の左右背景を除き縦の元画像全体を照合する',async()=>{
 const portrait=await sharp(Buffer.from('<svg width="1080" height="1920"><rect width="1080" height="1920" fill="#0f2742"/><rect x="80" y="400" width="800" height="300" fill="white"/></svg>')).png().toBuffer();
 const middle=await sharp(portrait).resize(405,720).png().toBuffer();
 const served=await sharp({create:{width:1280,height:720,channels:3,background:'#123456'}}).composite([{input:middle,left:438,top:0}]).jpeg({quality:90}).toBuffer();
 const result=await compareThumbnail(portrait,served);assert.equal(result.matched,true);assert.equal(result.fit,'portrait-center');
 const different=await sharp(portrait).composite([{input:Buffer.from('<svg width="50" height="80"><rect width="50" height="80" fill="#0f2742"/></svg>'),left:160,top:450}]).png().toBuffer();
 assert.equal((await compareThumbnail(different,served)).matched,false);
});
test('実更新jobは明示operation・手動commitでのみ起動し、公開artifactは暗号文のみ',()=>{
 const wf=yaml.load(readFileSync(new URL('../.github/workflows/sync-yt-descriptions.yml',import.meta.url),'utf8'));
 const job=wf.jobs['thumbnail-refresh'];assert.equal(job.if,"inputs.operation == 'thumbnail-refresh'");
 assert.equal(job.concurrency['cancel-in-progress'],false);
 assert.equal(wf.on.workflow_dispatch.inputs.commit.default,false);
 const run=job.steps.find(s=>s.env?.APPLY_THUMBNAILS).run;
 assert.match(run,/APPLY_THUMBNAILS.*true/);assert.match(run,/--expect-plan-sha256/);
 assert.equal(job.steps.find(s=>s.uses?.startsWith('actions/upload-artifact@')).with.path,'.tmp/youtube-rollout-export/*.enc.json');
});
