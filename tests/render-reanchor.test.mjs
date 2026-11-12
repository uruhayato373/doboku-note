import test from 'node:test';
import assert from 'node:assert/strict';
import { bodyDifferences } from '../scripts/lib/render-reanchor.mjs';

const files = (over = {}) => {
  const base = {
    'video-pack.json': { id: 'a' },
    'storyboard.json': { scenes: [{ sceneId: 's1', narration: '語り' }], imageDesign: { revision: 'r1', coverRevision: 'c1' } },
    'cover-design.json': { covers: { longform: { headline: 'x' } } },
    'cta-design.json': { text: '本編' },
    'pop-image.json': { activeBodyRevision: 'r1', activeCoverRevision: 'c1', revisions: { r1: { images: [{ sceneId: 's1', inputSha256: 'i', output: 'o' }] }, c1: { output: 'cover1' } } },
    ...over,
  };
  return (name) => (base[name] === undefined ? null : JSON.stringify(base[name]));
};

test('表紙の欄（coverRevision・cover-design・表紙の採用）だけの差は結び直してよい', () => {
  const now = files({
    'storyboard.json': { scenes: [{ sceneId: 's1', narration: '語り' }], imageDesign: { revision: 'r1', coverRevision: 'c2' } },
    'cover-design.json': { covers: { longform: { headline: 'y' } } },
    'pop-image.json': { activeBodyRevision: 'r1', activeCoverRevision: 'c2', revisions: { r1: { images: [{ sceneId: 's1', inputSha256: 'i', output: 'o' }] }, c2: { output: 'cover2' } } },
  });
  assert.deepEqual(bodyDifferences(files(), now), []);
});

test('語り・本文の画像・CTA が変わったら結び直さない', () => {
  assert.deepEqual(bodyDifferences(files(), files({ 'storyboard.json': { scenes: [{ sceneId: 's1', narration: '別' }], imageDesign: { revision: 'r1', coverRevision: 'c1' } } })), ['storyboard']);
  assert.deepEqual(bodyDifferences(files(), files({ 'cta-design.json': { text: '別' } })), ['cta']);
  assert.deepEqual(bodyDifferences(files(), files({ 'pop-image.json': { activeBodyRevision: 'r1', revisions: { r1: { images: [{ sceneId: 's1', inputSha256: 'j', output: 'o' }] } } } })), ['popBody']);
});
