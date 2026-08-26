'use client';

import { useState } from 'react';

/**
 * CopyButton — テキストをクリップボードへコピーするだけの最小ボタン。
 *
 * TODO 画面の prompt 生成用（DN-0093 順5）。UI からの実行操作は持たない
 * （コピーまで。副作用のある操作は npm run todo:* を人/Agent が実行する）。
 */
export default function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="badge neutral"
      style={{ cursor: 'pointer' }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // クリップボード権限が無い環境でも他の操作を止めない
        }
      }}
    >
      {done ? 'コピーした' : 'promptをコピー'}
    </button>
  );
}
