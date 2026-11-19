// image-audit.mjs — 画像アセット品質判定の純ロジック（I/O なし・テスト可能）。
//
// check-image-assets.mjs（CLI）がファイル走査で集めた {relPath, bytes} を受け取り、
// サイズ超過・危険ファイル名・baseline 差分を判定する。ファイル読み書きはしない。

/** 拡張子（小文字・ドットなし）を返す。 */
export function extOf(relPath) {
  const m = /\.([a-z0-9]+)$/i.exec(relPath);
  return m ? m[1].toLowerCase() : '';
}

/** サイズ上限判定。maxBytes に拡張子が無ければ対象外(null)。 */
export function classifyBySize(relPath, bytes, maxBytes) {
  const ext = extOf(relPath);
  const limit = maxBytes[ext];
  if (limit == null) return null;
  return { relPath, ext, bytes, limit, over: bytes > limit };
}

/** ファイル名（basename）が許可パターンから外れるか。ディレクトリ名は対象外。 */
export function isDangerousName(relPath, patternStr) {
  const base = relPath.split('/').pop() || relPath;
  const re = new RegExp(patternStr);
  return !re.test(base);
}

/**
 * baseline 差分判定。
 *   baseline = { "relPath": grandfatheredBytes }
 *   oversized = classifyBySize の over:true 要素配列
 * 戻り: { fresh: [...], grew: [...] }
 *   fresh = baseline に無い新規の超過ファイル
 *   grew  = baseline にあるが記録バイト数から増えた（さらに肥大した）ファイル
 */
export function diffBaseline(oversized, baseline = {}) {
  const fresh = [];
  const grew = [];
  for (const o of oversized) {
    if (!(o.relPath in baseline)) fresh.push(o);
    else if (o.bytes > baseline[o.relPath]) grew.push({ ...o, was: baseline[o.relPath] });
  }
  return { fresh, grew };
}

/** 現在の超過集合から baseline オブジェクトを作る（--update-baseline 用）。 */
export function buildBaseline(oversized) {
  const b = {};
  for (const o of oversized.slice().sort((a, c) => a.relPath.localeCompare(c.relPath))) {
    b[o.relPath] = o.bytes;
  }
  return b;
}

/** 人間可読なバイト表記。 */
export function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${n}B`;
}
