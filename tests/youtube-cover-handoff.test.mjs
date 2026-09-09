import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHandoffEntries } from '../scripts/check-youtube-cover-handoff.mjs';
import { coverInputDigest } from '../scripts/lib/youtube-approved-cover.mjs';
test('handoff rejects zero checks, absent Drive registration and changed input',()=>{
 const spec={headline:['題名']};spec.approvedImage={path:'.tmp/video-render/youtube-covers-test/all-001.png',sha256:'a'.repeat(64),specSha256:coverInputDigest(spec)};
 const entries={[spec.approvedImage.path]:{group:'youtube-approved-cover',sha256:spec.approvedImage.sha256,verifiedAt:'2026-09-09',driveFileId:'id'}};
 assert.equal(checkHandoffEntries([spec],entries).length,0);
 assert.ok(checkHandoffEntries([],entries).length);
 assert.ok(checkHandoffEntries([spec],{}).length);
 assert.ok(checkHandoffEntries([{...spec,headline:['変更']}],entries).length);
});
