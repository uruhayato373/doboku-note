import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvalState,isVisualRole,workView} from '../scripts/lib/media-review.mjs';

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
