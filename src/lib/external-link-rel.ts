/**
 * 外部リンクの rel 属性（唯一の判定箇所）。
 *
 * note.com へのリンクは referrer を渡す（`noopener` のみ）。全 CTA が `noreferrer` だったため
 * note ダッシュボード「記事の流入元」に doboku-note.com が 1 件も現れず、サイト経由の寄与が
 * 「no referrer」に溶けて測れなかった（2026-09-15 実測・年間 PV 35,174 のうち no referrer 38.7%）。
 * tab-napping 対策は `noopener` で足りる。note 以外の外部サイトは従来どおり referrer を渡さない。
 */
export const NOTE_LINK_REL = 'noopener';
const EXTERNAL_LINK_REL = 'noopener noreferrer';

const NOTE_ORIGIN = /^https:\/\/(www\.)?note\.com(\/|$)/;

function isNoteUrl(url: string): boolean {
  return NOTE_ORIGIN.test(url);
}

export function externalLinkRel(url: string): string {
  return isNoteUrl(url) ? NOTE_LINK_REL : EXTERNAL_LINK_REL;
}
