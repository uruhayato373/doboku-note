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

const KINDLE_BOOK_ID = /^[A-Za-z]+-[A-Za-z0-9]+$/;
const NOTE_KEY = /^n[0-9a-f]+$/;

/**
 * Kindle の本からサイトへのリンクの UTM（DN-0947）。campaign＝書籍 ID の小文字（config/products.json の kindle の catalog.id）、
 * content＝置き場所（契約の ebook.kindle.contents）。形の違う ID・未知の置き場所は throw（推測した値で出版しない）。
 * @returns {{ source: string, medium: string, campaign: string, content: string }}
 */
export function kindleInboundUtm(bookId, content) {
  const template = utmEbook('kindle');
  if (!KINDLE_BOOK_ID.test(String(bookId ?? ''))) throw new Error(`utm-contract: 書籍 ID の形が違う: ${bookId}`);
  if (!(template.contents ?? []).includes(content)) throw new Error(`utm-contract: 未知の置き場所: ${content}（ebook.kindle.contents）`);
  return { source: template.source, medium: template.medium, campaign: String(bookId).toLowerCase(), content };
}

/**
 * note の記事の本文リンクの utm_term（その記事の note キー n…）。utm_content は note ではリンクの種類（guide・examples 等）に
 * 使っているので、記事の識別は utm_term に置く（config/utm-templates.json の _inbound_note）。キーの形が違えば throw
 */
export function noteInboundTerm(noteKey) {
  if (!NOTE_KEY.test(String(noteKey ?? ''))) throw new Error(`utm-contract: note の記事キーの形が違う: ${noteKey}`);
  return noteKey;
}

/**
 * note の記事の本文のサイトへのリンク（文字列）に UTM を付ける。scripts/add-note-utm.mjs の実体。
 * - utm_* が無いリンク: source・medium（channels の note.site）・campaign・term（noteKey があれば）を付ける
 * - 既に note の UTM があり utm_term だけ無いリンク: noteKey があれば utm_term だけ足す（公開後の後付け）
 * - それ以外（他の UTM・term あり）: そのまま。utm_content（リンクの種類）には触らない
 * noteKey は公開後にしか無い（frontmatter noteId）。無ければ term を付けない。
 */
function withNoteInboundUtm(url, campaign, noteKey = null) {
  const template = utmChannel('note.site');
  const term = noteKey ? noteInboundTerm(noteKey) : null;
  const hashIdx = url.indexOf('#');
  const base = hashIdx === -1 ? url : url.slice(0, hashIdx);
  const hash = hashIdx === -1 ? '' : url.slice(hashIdx);
  const sep = base.includes('?') ? '&' : '?';
  if (/[?&]utm_/.test(base)) {
    const isNote = new RegExp(`[?&]utm_source=${template.source}(?:&|$)`).test(base);
    if (!term || !isNote || /[?&]utm_term=/.test(base)) return url;
    return `${base}&utm_term=${term}${hash}`;
  }
  const params = `utm_source=${template.source}&utm_medium=${template.medium}&utm_campaign=${encodeURIComponent(campaign)}${term ? `&utm_term=${term}` : ''}`;
  return `${base}${sep}${params}${hash}`;
}

const NOTE_SITE_URL_RE = /\bhttps:\/\/doboku-note\.com\/[^\s)\]」]+/g;

/**
 * note の記事の原文（frontmatter つき）のサイトへのリンクに UTM を付ける（withNoteInboundUtm）。scripts/add-note-utm.mjs の実体。
 * frontmatter は触らず、本文のリンクだけを置き換える。改行コード（CRLF / LF）や空行は一切変えない
 * （2026-11-03: 本文を組み立て直すと CRLF の記事に LF が混ざり、ファイル全体が差分になった・DN-0947）。
 * @returns {{ text: string, added: number, skipped: number }}
 */
export function applyNoteInboundUtm(raw, campaign, noteKey = null) {
  const m = /^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/.exec(raw);
  const head = m ? m[0] : '';
  let added = 0;
  let skipped = 0;
  const body = raw.slice(head.length).replace(NOTE_SITE_URL_RE, (url) => {
    const next = withNoteInboundUtm(url, campaign, noteKey);
    if (next === url) skipped += 1;
    else added += 1;
    return next;
  });
  return { text: head + body, added, skipped };
}
