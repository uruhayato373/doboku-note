import { createHash } from 'node:crypto';
import { writeJson } from '../../scripts/lib/json-io.mjs';
import { popSceneHash } from '../../scripts/lib/longform-pop-images.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');

/** 投稿テスト用の最小構成。実画像は publisher の別テストで照合する。 */
export function writeVisualStandardFixture(root, packDir, cover) {
  const scene = { sceneId: 'body', narration: '図で説明する。', caption: '図解', visual: { heading: '図解' } };
  writeJson(root, `${packDir}/storyboard.json`, {
    format: 'longform-16x9', scenes: [{ sceneId: 'cover', narration: 'はじめに。' }, scene],
    imageDesign: { mode: 'codex-pop', scope: 'all-body', layout: 'diagram-led', revision: 'body-v1', coverRevision: 'cover-v1' },
  });
  writeJson(root, `${packDir}/cover-design.json`, { covers: { longform: {
    design: 'pop-poster-v3', approvedImage: { path: cover.path, sha256: cover.sha256 },
  } } });
  const reference = { path: cover.path, sha256: cover.sha256 };
  const body = { path: `.tmp/media/fixture-body-${sha(packDir).slice(0, 8)}.png`, sha256: sha(`${packDir}:body`) };
  writeJson(root, `${packDir}/pop-image.json`, {
    activeBodyRevision: 'body-v1', activeCoverRevision: 'cover-v1', revisions: {
      'cover-v1': { version: 'pop-poster-v3', generation: { tool: 'image_gen', prompt: 'POP表紙', references: [reference], output: reference },
        output: { ...cover, width: 1920, height: 1080 }, normalization: { mode: 'full-frame-v1', sourceSha256: cover.sha256 } },
      'body-v1': { layout: { mode: 'diagram-led' }, images: [{ sceneId: 'body', inputSha256: popSceneHash(scene),
        generation: { tool: 'image_gen', prompt: '図解', references: [reference], output: body },
        output: { ...body, width: 1920, height: 1080 }, normalization: { mode: 'full-frame-v1', sourceSha256: body.sha256 } }] },
    },
  });
}
