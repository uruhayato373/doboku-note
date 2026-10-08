/**
 * video-compilation.mjs — 総まとめ（聞き流し）動画の storyboard を、承認済みパックの場面から組み立てる。
 *
 * 正本はパックの compilation.json（章立てと、冒頭・章の区切り・締めの語り）。元パックの場面
 * （narration・visual・caption・sourceRef）は写さずに元の storyboard.json から読み、
 * build-video-compilation が storyboard.json を生成する。描画は render-longform をそのまま使う。
 * 元パックは通常動画をユーザーが承認したもの（state の longform.approvedBy === 'user'）に限る。
 *
 * 設計尺は読み上げ速度の実測から見積もる（無音プレビューを実尺に近づけるため）。
 * 2026-10-08 に 2級の15パック・144場面の 2026-09-09 版（予約済み動画）の実尺で測った 1秒あたりの字数:
 * 全体 5.77・p10 5.05・p50 5.84・p90 6.47。同じ台本の 2026-09-05 版は全体 4.47 と遅く、環境で速さが変わる。
 */

export const CHARS_PER_SEC = 5.77;
const MIN_SCENE_SEC = 2;

/** 語りの字数から設計尺（0.1秒単位・切り上げ）を見積もる */
export function estimateSceneSec(narration) {
  const sec = [...(narration ?? '')].length / CHARS_PER_SEC;
  return Math.max(MIN_SCENE_SEC, Math.ceil(sec * 10) / 10);
}

function chapterScene(chapter, n, part, isFirstInPart) {
  const lead = isFirstInPart && part.intro ? part.intro : '';
  return {
    sceneId: `c${String(n).padStart(2, '0')}-title`,
    narration: `${lead}第${n}章は、${chapter.title}です。`,
    caption: `第${n}章 ${chapter.title}`,
    visual: { kind: 'cover', heading: `第${n}章 ${chapter.title}`, items: [part.label] },
  };
}

/**
 * compilation.json と元パックから storyboard を組み立てる（I/O は loadSource に任せる）。
 * @param {object} spec compilation.json
 * @param {(packId: string) => { storyboard: object, longform: object|undefined }} loadSource
 * @returns {{ storyboard: object, chapters: Array<{ n: number, title: string, packId: string, startSec: number }> }}
 */
export function assembleCompilation(spec, loadSource) {
  if (spec.schemaVersion !== 1) throw new Error(`compilation.json の schemaVersion=${spec.schemaVersion}（期待 1）`);
  const drop = new Set(spec.dropSceneIds ?? ['cover', 'cta']);
  const scenes = [];
  const chapters = [];
  const seen = new Set();
  let n = 0;

  scenes.push({ ...spec.opening, sceneId: 'cover' });
  for (const part of spec.parts ?? []) {
    if (!part.label) throw new Error('parts[].label がありません');
    for (const [i, chapter] of (part.chapters ?? []).entries()) {
      if (!chapter.packId || !chapter.title) throw new Error('chapters[] には packId と title が要ります');
      if (seen.has(chapter.packId)) throw new Error(`同じパックが2回あります: ${chapter.packId}`);
      seen.add(chapter.packId);
      const { storyboard, longform } = loadSource(chapter.packId);
      if (longform?.approvedBy !== 'user') {
        throw new Error(`${chapter.packId} の通常動画はユーザー承認がありません（承認済みパックだけを束ねる）`);
      }
      if (storyboard.format !== 'longform-16x9') throw new Error(`${chapter.packId} は longform-16x9 ではありません`);
      n += 1;
      const title = chapterScene(chapter, n, part, i === 0);
      chapters.push({ n, title: chapter.title, packId: chapter.packId, sceneId: title.sceneId });
      scenes.push(title);
      const body = storyboard.scenes.filter((s) => !drop.has(s.sceneId));
      if (body.length === 0) throw new Error(`${chapter.packId} に使える場面がありません`);
      for (const s of body) {
        const { start: _start, end: _end, sceneId, ...rest } = s;
        scenes.push({ ...rest, sceneId: `c${String(n).padStart(2, '0')}-${sceneId}`, from: { packId: chapter.packId, sceneId } });
      }
    }
  }
  if (n === 0) throw new Error('chapters が 0 件です');
  scenes.push({ ...spec.closing, sceneId: 'cta' });

  // 設計尺は 0.1 秒単位の整数で積む（浮動小数の誤差で start/end の連続が崩れないように）
  let t = 0;
  const timed = scenes.map((s) => {
    for (const key of ['narration', 'caption']) {
      if (!s[key]) throw new Error(`${s.sceneId} に ${key} がありません`);
    }
    const start = t;
    t += Math.round(estimateSceneSec(s.narration) * 10);
    return { sceneId: s.sceneId, start: start / 10, end: t / 10, ...s };
  });
  const startOf = new Map(timed.map((s) => [s.sceneId, s.start]));
  return {
    storyboard: { format: 'longform-16x9', generatedFrom: 'compilation.json', scenes: timed },
    chapters: chapters.map(({ sceneId, ...c }) => ({ ...c, startSec: startOf.get(sceneId) })),
  };
}
