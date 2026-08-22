'use client';

const KEY = 'admin-theme';

/** light ⇔ dark を反転し、明示選択として localStorage に保存する。
 *  初期値の解決（保存値 or OS 設定 → data-theme）は layout.tsx の inline script が描画前に済ませるため、
 *  ここは反転だけを担う。React state を持たないので hydration ずれが起きない。 */
function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // プライベートモード等で保存できなくても、このセッションの切替は成立させる
  }
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M14.2 10.3A6.4 6.4 0 0 1 5.7 1.8a6.4 6.4 0 1 0 8.5 8.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <circle cx="8" cy="8" r="3.1" />
      <path
        strokeLinecap="round"
        d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.1 3.1l1.1 1.1M11.8 11.8l1.1 1.1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1"
      />
    </svg>
  );
}

/** 表示するのは「押した後に切り替わる先」。出し分けは CSS（:root[data-theme='dark']）が行う。 */
export default function ThemeToggle() {
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label="配色テーマを切り替える"
      title="配色テーマを切り替える"
    >
      <span className="face to-dark">
        <MoonIcon />
        <span>ダークテーマ</span>
      </span>
      <span className="face to-light">
        <SunIcon />
        <span>ライトテーマ</span>
      </span>
    </button>
  );
}
