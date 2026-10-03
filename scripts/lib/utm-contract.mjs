/**
 * utm-contract.mjs — UTM の契約（config/utm-templates.json）の読み手。
 *
 * 送客リンクの utm_source / utm_medium / utm_content の値は config/utm-templates.json の `channels`
 * （x・instagram・youtube・note → サイト）と `ebook`（Kindle → サイト）だけが持つ。リンクを作るスクリプトも
 * 規約を検査する check-* も、値をコードへ書き写さずここから受け取る（書き写すと、契約を直したとき生成側と検査側が
 * 別々の値で動く）。サイト → note の導線は src/lib/note-utm.ts が同じファイルの `siteToNote` を読む。
 *
 * 存在しないチャネルは throw する（黙って既定値に倒さない）。
 */
import { REPO_ROOT } from './repository-paths.mjs';
import { channelFamily, channelOf } from './utm-channels.mjs';
import { readDataset } from './dataset-io.mjs';

let cached = null;

export function loadUtmTemplates() {
  if (!cached) cached = readDataset(REPO_ROOT, 'config.utm-templates');
  return cached;
}

/** `channel.format`（例 'youtube.shorts'）の { source, medium, content }。無ければ throw */
export const utmChannel = (key) => channelOf(loadUtmTemplates(), key);

/**
 * チャネル（例 'youtube'）に属する全 format の { source, medium, contents }。
 * source と medium が format ごとに食い違っていたら throw する。contents は utm_content に入る配信形式の一覧。
 */
export const utmChannelFamily = (channel) => channelFamily(loadUtmTemplates(), channel);

/** 電子書籍（Kindle など・SNS ではないので channels には置かない）の { source, medium } */
export function utmEbook(name) {
  const template = loadUtmTemplates().ebook?.[name];
  if (!template) throw new Error(`utm-contract: 未定義の電子書籍 "${name}"（台帳 config.utm-templates の ebook を確認）`);
  return template;
}

/**
 * URL オブジェクトに utm_source・utm_medium・utm_campaign・utm_content を set する（既に付いていれば上書き）。
 * 文字列を組み立て直す .claude/scripts/lib/utm-builder.mjs の buildUtmUrl と違い、URL の他のクエリの順序と
 * エンコードは URL オブジェクトに任せる（既存の生成スクリプトの出力を変えないため）。
 * content を渡さなければ契約の既定の配信形式を使う。
 */
export function setUtmParams(url, key, { campaign, content } = {}) {
  const template = utmChannel(key);
  url.searchParams.set('utm_source', template.source);
  url.searchParams.set('utm_medium', template.medium);
  if (campaign !== undefined) url.searchParams.set('utm_campaign', campaign);
  const utmContent = content ?? template.content;
  if (utmContent) url.searchParams.set('utm_content', utmContent);
  return url;
}
