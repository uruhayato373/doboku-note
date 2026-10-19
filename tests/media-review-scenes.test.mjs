import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvalState,isVisualRole,itemPublicationGroups,listView,matchingItemPublications,workView} from '../scripts/lib/media-review.mjs';

test('replacing a scene image invalidates visual approval even when the cover stays unchanged',()=>{
 const media=new Map([['cover',{sha256:'a'.repeat(64)}],['scene',{sha256:'b'.repeat(64)}]]);
 const pub={account:'youtube:main',format:'longform',media:{cover:'cover','scene-001':'scene'}};
 const before=approvalState('',pub,media);
 pub.review={visual:{status:'approved',digest:before.visual.current}};
 assert.equal(approvalState('',pub,media).visual.valid,true);
 media.set('scene',{sha256:'c'.repeat(64)});
 assert.equal(approvalState('',pub,media).visual.valid,false);
 assert.equal(isVisualRole('scene-131'),true);
 assert.equal(isVisualRole('video'),false);
});

test('公開予定月はJSTで月跨ぎを扱い、未設定を日付のある公開と区別する', () => {
 const base={exam:'civil-construction-2',work:'example',format:'longform',account:'youtube:main',status:'scheduled',channel:'youtube'};
 const reg={works:[{id:'example',exam:base.exam,kind:'video-pack'}],media:[],publications:[
  {...base,id:'before',publishAt:'2026-10-31T14:59:59Z'},
  {...base,id:'after',publishAt:'2026-10-31T15:00:00Z'},
  {...base,id:'undated',publishAt:null},
 ]};
 const row=listView('',{reg,cfg:{status:{values:['scheduled']}}}).rows[0];
 assert.deepEqual(row.publications.map(p=>p.month),['2026-10','2026-11',null]);
 assert.equal(row.publications[1].publishAtJst,'2026-11-01 00:00');
 assert.equal(matchingItemPublications(row,{month:'undated'}).length,1);
 assert.equal(matchingItemPublications(row,{month:'2026-12'}).length,0);
});

test('希望日時を予約完了と取り違えず、停止と未照合も区別する', () => {
 const base={channel:'youtube',format:'longform',publishAtJst:'2026-10-19 20:00'};
 const groups=itemPublicationGroups([
  {...base,status:'approved'},
  {...base,status:'scheduled'},
  {...base,status:'published'},
  {...base,status:'stopped',stopReason:'superseded'},
  {...base,status:'stopped',stopReason:'unverified-legacy'},
  {...base,status:'future-status'},
 ]);
 assert.deepEqual(groups.map(g=>[g.label,g.count]),[['未予約',1],['予約済み',1],['公開済み',1],['停止',1],['要確認',2]]);
});

test('予約一覧は絞り込みに一致した公開行だけをまとめ、日時未設定も残す', () => {
 const row={publications:[
  {channel:'youtube',format:'longform',status:'scheduled',month:'2026-11',publishAtJst:'2026-11-01 20:00'},
  {channel:'x',format:'post',status:'approved',month:'2026-10',publishAtJst:'2026-10-22 12:36'},
  {channel:'x',format:'post',status:'approved',month:'2026-10',publishAtJst:'2026-10-11 08:17'},
  {channel:'x',format:'post',status:'approved',month:null,publishAtJst:null},
 ]};
 const groups=itemPublicationGroups(matchingItemPublications(row,{month:'2026-10'}));
 assert.equal(groups.length,1);
 assert.equal(groups[0].label,'未予約');
 assert.equal(groups[0].count,2);
 assert.equal(groups[0].dateLabel,'2026-10-11 08:17 〜 2026-10-22 12:36');
 assert.equal(itemPublicationGroups(row.publications).find(g=>g.channel==='x').undated,1);
 assert.deepEqual(itemPublicationGroups([]),[]);
});

test('別チャネル・別状態の予定月で作品を誤って絞り込まない', () => {
 const row={publications:[
  {channel:'youtube',status:'published',month:'2026-10'},
  {channel:'youtube',status:'scheduled',month:'2026-11'},
  {channel:'instagram',status:'scheduled',month:'2026-10'},
 ]};
 assert.equal(matchingItemPublications(row,{channel:'youtube',status:'scheduled',month:'2026-10'}).length,0);
 assert.equal(matchingItemPublications(row,{channel:'youtube',status:'scheduled',month:'2026-11'}).length,1);
 assert.equal(matchingItemPublications(row,{month:'2026-10'}).length,2);
});

test('unpublished candidate media is separate from the scheduled publication and its approval', () => {
 const pub={id:'civil-construction-2/example/youtube.longform',exam:'civil-construction-2',work:'example',channel:'youtube',format:'longform',status:'scheduled',account:'youtube:main',publishAt:'2026-10-25T11:00:00Z',platform:{id:'native-id'},media:{video:'live'}};
 const live={id:'live',role:'video',sha256:'a'.repeat(64),store:{tier:'drive',path:'.tmp/media/civil-construction-2/example/youtube.longform/video.aaaaaaaa.mp4'}};
 const candidate={id:'civil-construction-2/example/work/candidate-video',role:'candidate-video',type:'video/mp4',sha256:'b'.repeat(64),store:{tier:'drive',path:'.tmp/media/civil-construction-2/example/work/candidate-video.bbbbbbbb.mp4'}};
 pub.approval={by:'user',at:'2026-10-18T01:00:00Z',contentSha256:approvalState('',pub,new Map([['live',live]])).final.current};
 const before=JSON.stringify(pub);
 const view=workView('',pub.exam,pub.work,{reg:{works:[{id:'example',exam:pub.exam,kind:'video-pack',definition:'missing'}],publications:[pub],media:[live,candidate]}});
 assert.equal(view.candidateMedia.length,1);
 assert.equal(view.candidateMedia[0].role,'video');
 assert.equal(view.candidateMedia[0].sha256,'b'.repeat(64));
 assert.equal(view.channels[0].publications[0].media[0].sha256,'a'.repeat(64));
 assert.equal(view.channels[0].publications[0].approval.final.valid,true);
 assert.equal(view.channels[0].publications[0].status,'scheduled');
 assert.equal(JSON.stringify(pub),before);
});
