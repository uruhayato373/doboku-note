/**
 * asp-config.mjs — 3 ASP の接続設定（config/affiliate-asp.json）の A8 を、A8 のレポート取得の設定から合成する。
 * ---------------------------------------------------------------------------
 * A8 の URL・口座（mediaId）・ブラウザの共通部分（認証サービス名・プロファイル・待ち時間）は
 * config/a8-report-automation.json が正本。affiliate-asp.json の a8 には写さず（`connectionFrom` で指す）、読み出すときにここで合成する。
 * 二重に持つと、URL の移行（management.af8.jp → media-console.a8.net）のときに片方が取り残される。
 * affiliate-asp.json の a8 に書くのは、提携運用だけが使う値（一覧のパス・口座 ID の抽出パターン・サイト分離の方式・セッションの持ち越し）。
 * 写しが書かれていたら（合成の結果が黙って上書きされるので）例外で止める。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { datasetPath } from './datasets.mjs';

/** a8 の接続の写しとして書いてはいけない（a8-report-automation.json の a8 から来る）キー */
const SHARED_KEYS = ['baseUrl', 'homePath', 'reAuthPattern', 'accountId'];

const readDataset = (id) => JSON.parse(readFileSync(datasetPath(id), 'utf-8'));

/**
 * `asps.a8.connectionFrom`（台帳の id）が指す設定から、a8 の baseUrl・homePath・reAuthPattern・accountId（＝mediaId）・browser を足す。
 * `connectionFrom` が無ければそのまま返す。
 * @param {any} cfg affiliate-asp.json の中身
 * @param {(id: string) => any} read 台帳の id → 設定（テストで差し替える）
 */
export function withSharedConnection(cfg, read = readDataset) {
  const a8 = cfg?.asps?.a8;
  if (!a8?.connectionFrom) return cfg;
  const src = read(a8.connectionFrom);
  const from = src?.a8;
  if (!from?.baseUrl || !from.homePath || !from.reAuthPattern || !from.mediaId || !src.browser) {
    throw new Error(`${a8.connectionFrom}: a8 の接続（a8.baseUrl・homePath・reAuthPattern・mediaId と browser）が読めない`);
  }
  const copied = SHARED_KEYS.filter((k) => k in a8);
  if (copied.length) throw new Error(`affiliate-asp.json の asps.a8 に ${copied.join('・')} が書かれている。${a8.connectionFrom} が正本なので写さない`);
  const copiedBrowser = Object.keys(a8.browser ?? {}).filter((k) => k in src.browser);
  if (copiedBrowser.length) throw new Error(`affiliate-asp.json の asps.a8.browser に ${copiedBrowser.join('・')} が書かれている。${a8.connectionFrom} の browser が正本なので写さない`);
  return {
    ...cfg,
    asps: {
      ...cfg.asps,
      a8: {
        baseUrl: from.baseUrl,
        homePath: from.homePath,
        reAuthPattern: from.reAuthPattern,
        accountId: from.mediaId,
        ...a8,
        browser: { ...src.browser, ...a8.browser },
      },
    },
  };
}
