/**
 * 各スライドの読み上げ台本（TTS に渡すテキスト）を生成する。
 *
 * 設計方針:
 *   - 1 スライド = 1 文の台本（TTS が 1 wav として出力できる）
 *   - 字幕は同じテキストを使う（スライド単位で同期）
 *   - ナレーションは「定型的な接続語 + スライドの本体」の構造
 */

import { SNS_CONFIG } from '#lib/sns-common/sns-config.mjs';

/**
 * storyboard 全体から各スライドの台本を生成する。
 * @param {object} storyboard - buildStoryboard / buildStoryboardFromExtract の戻り値
 * @returns {string[]}
 */
export function buildScript(storyboard) {
  if (!storyboard || !Array.isArray(storyboard.slides)) {
    throw new Error('storyboard.slides is required');
  }
  return storyboard.slides.map(slide => buildScriptForSlide(slide, storyboard));
}

/**
 * 1 スライド分の台本を生成する。
 * @param {object} slide
 * @param {object} [ctx] - storyboard 全体のコンテキスト（cover/cta で title 等を参照）
 * @returns {string}
 */
export function buildScriptForSlide(slide, ctx = {}) {
  if (!slide || typeof slide.type !== 'string') {
    throw new Error('slide.type is required');
  }
  switch (slide.type) {
    case 'cover':
      return buildCoverScript(slide, ctx);
    case 'definition':
      return buildDefinitionScript(slide, ctx);
    case 'examPoint':
      return buildExamPointScript(slide, ctx);
    case 'cta':
      return buildCtaScript(slide, ctx);
    case 'image':
      return buildImageScript(slide, ctx);
    default:
      throw new Error(`Unknown slide type: ${slide.type}`);
  }
}

function buildCoverScript(slide, _ctx) {
  const title = slide.data?.title || '';
  return `${title}${SNS_CONFIG.narration.coverSuffix}`;
}

function buildDefinitionScript(slide, _ctx) {
  const title = slide.data?.title || '';
  const body = slide.data?.body || '';
  if (!body) return `${title}${SNS_CONFIG.narration.definitionFallback}`;
  if (body.startsWith(title)) return body;
  return `${title}${SNS_CONFIG.narration.definitionConnector}${body}`;
}

function buildExamPointScript(slide, _ctx) {
  const index = Number.isInteger(slide.data?.index) ? slide.data.index : 1;
  const body = slide.data?.body || '';
  return `${SNS_CONFIG.narration.examPointPrefix}${index}。${body}`;
}

function buildCtaScript(_slide, _ctx) {
  return SNS_CONFIG.narration.cta;
}

function buildImageScript(slide, _ctx) {
  const title = slide.data?.title || '';
  return `${title}${SNS_CONFIG.narration.imageSuffix}`;
}
