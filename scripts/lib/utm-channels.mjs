/**
 * utm-channels.mjs — UTM の契約（config/utm-templates.json の中身）を引く純関数。
 *
 * 依存を持たない（ファイルも台帳も読まない）。tests/video-publication-check.test.mjs のように、lib を単体で tmp へ
 * コピーして走らせる所（datasets.mjs・zod が解決できない）でも使えるよう、読み込みは utm-contract.mjs に分けてある。
 * 存在しないチャネルは throw する（黙って既定値に倒さない）。
 */

/** `channel.format`（例 'youtube.shorts'）の { source, medium, content } */
export function channelOf(templates, key) {
  const template = templates?.channels?.[key];
  if (!template) throw new Error(`utm-contract: 未定義の channel.format "${key}"（台帳 config.utm-templates の channels を確認）`);
  return template;
}

/**
 * チャネル（例 'youtube'）に属する全 format の { source, medium, contents }。
 * source と medium が format ごとに食い違っていたら throw する（検査が 1 つの期待値で判定できなくなるため）。
 * contents は utm_content に入る配信形式の一覧（空の format は除く）。
 */
export function channelFamily(templates, channel) {
  const entries = Object.entries(templates?.channels ?? {}).filter(([key]) => key.startsWith(`${channel}.`));
  if (entries.length === 0) throw new Error(`utm-contract: チャネル "${channel}" が 台帳 config.utm-templates の channels に無い`);
  const sources = new Set(entries.map(([, t]) => t.source));
  const mediums = new Set(entries.map(([, t]) => t.medium));
  if (sources.size !== 1 || mediums.size !== 1) {
    throw new Error(`utm-contract: ${channel}.* の source / medium が揃っていない（検査が 1 つの期待値で判定できない）`);
  }
  return {
    source: [...sources][0],
    medium: [...mediums][0],
    contents: entries.map(([, t]) => t.content).filter(Boolean),
  };
}
