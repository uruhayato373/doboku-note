import {test} from 'node:test';
import assert from 'node:assert/strict';
import {approvalState,isVisualRole} from '../scripts/lib/media-review.mjs';

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
