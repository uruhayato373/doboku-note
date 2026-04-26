/**
 * OGP タイトルの改行・フォントサイズ決定ロジック（thin wrapper）。
 *
 * 実装は SNS 共通基盤 .claude/scripts/lib/sns-common/jp-text-wrap.mjs に移動済み（2026-04-26 v4）。
 * 本ファイルは既存 OGP テンプレートの後方互換のため re-export のみ行う。
 *
 * 詳細・ロジック: #lib/sns-common/jp-text-wrap.mjs
 */

export { wrapTitle, pickFontSize } from '#lib/sns-common/jp-text-wrap.mjs';
