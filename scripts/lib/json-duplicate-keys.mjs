/**
 * json-duplicate-keys.mjs — JSON の同じオブジェクトの中で重複したキーを見つける。
 * JSON.parse は重複を黙って後ろの値で上書きするので、型（zod）でも検出できない（config/asset-storage.json に実例があった）。
 * 依存ゼロ。文字列・エスケープを読み飛ばしながら、オブジェクトごとにキーを数える。壊れた JSON の検出は JSON.parse に任せる。
 */

/** @returns {{ key: string, line: number }[]} 重複したキー（2 回目以降の出現）と行番号 */
export function findDuplicateKeys(text) {
  const found = [];
  const stack = []; // { keys: Set | null, expectKey: boolean }（配列は keys: null）
  let line = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') line++;
    else if (c === '{') stack.push({ keys: new Set(), expectKey: true });
    else if (c === '[') stack.push({ keys: null, expectKey: false });
    else if (c === '}' || c === ']') stack.pop();
    else if (c === ',') {
      const top = stack.at(-1);
      if (top?.keys) top.expectKey = true;
    } else if (c === '"') {
      let j = i + 1;
      let s = '';
      while (j < text.length && text[j] !== '"') {
        if (text[j] === '\\') {
          s += text.slice(j, j + 2);
          j += 2;
        } else s += text[j++];
      }
      const top = stack.at(-1);
      if (top?.keys && top.expectKey) {
        if (top.keys.has(s)) found.push({ key: s, line });
        top.keys.add(s);
        top.expectKey = false;
      }
      i = j;
    }
  }
  return found;
}
