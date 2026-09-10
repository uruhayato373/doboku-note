import test from 'node:test';
import assert from 'node:assert/strict';
import { readTweetBlocks } from '../scripts/lib/x-review.mjs';
import { cardSpecHash, validateCharacterCard } from '../scripts/lib/x-character-spec.mjs';
const spec={headline:['課題と対策を','つなげて書く'],points:['条件から課題を整理する','課題に対応した行動を書く'],character:{pose:'pointing',frame:'bust'},alt:'課題と対策の関係',sourcePaths:['example.mdx']};
test('numbered post parsing preserves gaps, removes internal comments and separators',()=>{
 const md='# header\r\n<!-- internal -->\r\n## Tweet 01: 9/11 07:15 civil-1 / hint / linkless\r\n\r\n本文A\r\n<!-- private note -->\r\n\r\n---\r\n\r\n## Tweet 03: 9/11 19:40 civil-1 / magazine / note\r\n\r\n本文B\r\nhttps://note.com/test?a=1&b=2\r\n';
 const result=readTweetBlocks(md);assert.deepEqual(Object.keys(result),['1','3']);assert.equal(result['1'].text,'本文A');assert.equal(result['3'].text,'本文B\r\nhttps://note.com/test?a=1&b=2');
});
test('reject overlong, missing and multiline authored copy instead of silently clipping',()=>{
 assert.equal(validateCharacterCard(spec),spec);
 assert.throws(()=>validateCharacterCard({...spec,headline:['あ'.repeat(11),'短文']}));
 assert.throws(()=>validateCharacterCard({...spec,points:['一行\n二行','要点']}));
 assert.throws(()=>validateCharacterCard({...spec,alt:''}));
 assert.throws(()=>validateCharacterCard({...spec,sourcePaths:[]}));
});
test('render provenance changes for revised copy and pose',()=>{
 assert.notEqual(cardSpecHash(spec),cardSpecHash({...spec,points:['別の説明','二行目']}));
 assert.notEqual(cardSpecHash(spec),cardSpecHash({...spec,character:{pose:'thinking',frame:'bust'}}));
});
