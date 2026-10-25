import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
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
test('公開のみの範囲指定はprivateを変更せず、全件計画のSHAを維持する',async()=>{
 const m=mock();await assert.rejects(updateThumbnailBatch(m.youtube,plan,{...opts,commit:true,publicOnly:true}),/zero/);
 assert.equal(m.writes.length,0);
 const publicPlan={...plan,entries:[{...plan.entries[0],privacy:'public'}]};
 const result=await updateThumbnailBatch(m.youtube,publicPlan,{...opts,publicOnly:true});assert.equal(result.selected,1);assert.equal(m.writes.length,0);
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
test('細密な横長表紙の公開JPEG圧縮差を許容しても文字の欠落は拒否する',async()=>{
 const rects=Array.from({length:1000},(_,i)=>`<rect x="${(i*137)%1920}" y="${(i*97)%1080}" width="${8+i%43}" height="${6+i%37}" fill="${['#16a36c','#d6f841','#006845','#fbf2d0'][i%4]}"/>`).join('');
 const png=await sharp(Buffer.from(`<svg width="1920" height="1080"><rect width="1920" height="1080" fill="#16a36c"/>${rects}<rect x="170" y="230" width="700" height="150" fill="white"/><rect x="250" y="240" width="25" height="120" fill="black"/></svg>`)).png().toBuffer();
 const jpeg=await sharp(png).resize(1280,720).jpeg({quality:70,chromaSubsampling:'4:2:0'}).toBuffer();
 const result=await compareThumbnail(png,jpeg);
 assert.ok(result.rawMean>3);assert.equal(result.matched,true);assert.equal(result.normalization,'symmetric-blur-0.7');
 const missingStroke=await sharp(png).composite([{input:Buffer.from('<svg width="25" height="120"><rect width="25" height="120" fill="white"/></svg>'),left:250,top:240}]).resize(1280,720).jpeg({quality:70,chromaSubsampling:'4:2:0'}).toBuffer();
 assert.equal((await compareThumbnail(png,missingStroke)).matched,false);
});
test('ShortsのYouTube生成の左右背景を除き縦の元画像全体を照合する',async()=>{
 const portrait=await sharp(Buffer.from('<svg width="1080" height="1920"><rect width="1080" height="1920" fill="#0f2742"/><rect x="80" y="400" width="800" height="300" fill="white"/></svg>')).png().toBuffer();
 const middle=await sharp(portrait).resize(405,720).png().toBuffer();
 const served=await sharp({create:{width:1280,height:720,channels:3,background:'#123456'}}).composite([{input:middle,left:438,top:0}]).jpeg({quality:90}).toBuffer();
 const result=await compareThumbnail(portrait,served);assert.equal(result.matched,true);assert.equal(result.fit,'portrait-center');
 const different=await sharp(portrait).composite([{input:Buffer.from('<svg width="50" height="80"><rect width="50" height="80" fill="#0f2742"/></svg>'),left:160,top:450}]).png().toBuffer();
 assert.equal((await compareThumbnail(different,served)).matched,false);
});
test('細密な縦画像のCDN整数幅・JPEG変換を揃えても文字欠落は拒否する',async()=>{
 const details=Array.from({length:1200},(_,i)=>`<rect x="${(i*137)%576}" y="${(i*97)%1024}" width="${4+i%21}" height="${3+i%19}" fill="${['#16a36c','#f6e841','#006845','#fbf2d0'][i%4]}"/>`).join('');
 const portrait=await sharp(Buffer.from(`<svg width="576" height="1024"><rect width="576" height="1024" fill="#16a36c"/>${details}<rect x="60" y="160" width="450" height="120" fill="white"/><rect x="130" y="165" width="22" height="110" fill="black"/></svg>`)).png().toBuffer();
 const serve=async input=>sharp({create:{width:1280,height:720,channels:3,background:'#123456'}}).composite([{input:await sharp(input).resize(404,720,{fit:'fill'}).png().toBuffer(),left:438,top:0}]).jpeg({quality:70,chromaSubsampling:'4:2:0'}).toBuffer();
 const result=await compareThumbnail(portrait,await serve(portrait));
 assert.equal(result.matched,true);assert.equal(result.fit,'portrait-center');
 const missingStroke=await sharp(portrait).composite([{input:Buffer.from('<svg width="22" height="110"><rect width="22" height="110" fill="white"/></svg>'),left:130,top:165}]).png().toBuffer();
 assert.equal((await compareThumbnail(portrait,await serve(missingStroke))).matched,false);
});
test('Shortsを横長に中央クロップしただけの画像は全体一致と認めない',async()=>{
 const portrait=await sharp(Buffer.from('<svg width="1080" height="1920"><rect width="1080" height="1920" fill="#0f2742"/><rect x="80" y="100" width="800" height="200" fill="white"/><rect x="150" y="1500" width="500" height="200" fill="gold"/></svg>')).png().toBuffer();
 const cropped=await sharp(portrait).resize(1280,720,{fit:'cover'}).jpeg({quality:90}).toBuffer();
 assert.equal((await compareThumbnail(portrait,cropped)).matched,false);
});
