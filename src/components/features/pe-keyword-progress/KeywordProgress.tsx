'use client';

import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'doboku-note:pe-keyword-progress:v1';

const SECTION_DEFS: { key: string; id: string; label: string }[] = [
  { key: '経済性管理', id: '2', label: '経済性管理' },
  { key: '人的資源管理', id: '3', label: '人的資源管理' },
  { key: '情報管理', id: '4', label: '情報管理' },
  { key: '安全管理', id: '5', label: '安全管理' },
  { key: '社会環境管理', id: '6', label: '社会環境管理' },
];

type ProgressMap = Record<string, number>;
type SectionStats = Record<string, { total: number; done: number; slugs: string[] }>;

function readProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProgressMap;
  } catch {}
  return {};
}

function writeProgress(data: ProgressMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function findSectionForLink(link: HTMLElement): string | null {
  // 上方向の兄弟・親をたどり、直近の H2 を探す
  let node: Element | null = link;
  while (node && node !== document.body) {
    let prev: Element | null = node.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'H2') {
        const text = prev.textContent || '';
        for (const s of SECTION_DEFS) {
          if (text.includes(s.key)) return s.key;
        }
        return null;
      }
      const nested = prev.querySelectorAll?.('h2');
      if (nested && nested.length > 0) {
        const last = nested[nested.length - 1]!;
        const text = last.textContent || '';
        for (const s of SECTION_DEFS) {
          if (text.includes(s.key)) return s.key;
        }
      }
      prev = prev.previousElementSibling;
    }
    node = node.parentElement;
  }
  return null;
}

export default function KeywordProgress() {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [stats, setStats] = useState<SectionStats>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setProgress(readProgress());
  }, []);

  // DOM 走査でセクションごとの全キーワードリンクを集計、クリックハンドラを付与
  useEffect(() => {
    if (!mounted) return;

    const links = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'article a[href^="/docs/pe-comprehensive-management-"]'
      )
    );

    const newStats: SectionStats = {};
    const slugToSection: Record<string, string> = {};

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;
      const slug = href.replace(/^\/docs\//, '').split('#')[0]!;
      // 自身（keyword-2026）やハブ自体は除外
      if (slug === 'pe-comprehensive-management-keyword-2026') continue;
      if (slug === 'pe-comprehensive-management-general-overview') continue;
      if (slug === 'pe-comprehensive-management-exam-index') continue;
      if (slug === 'pe-comprehensive-management-essay-exam-strategy') continue;
      if (slug === 'pe-comprehensive-management-management-tradeoffs') continue;
      if (slug.startsWith('pe-comprehensive-management-r') && slug.includes('-primary')) continue;

      const section = findSectionForLink(link);
      if (!section) continue;

      if (!newStats[section]) newStats[section] = { total: 0, done: 0, slugs: [] };
      if (!slugToSection[slug]) {
        slugToSection[slug] = section;
        newStats[section].total++;
        newStats[section].slugs.push(slug);
        if (progress[slug]) newStats[section].done++;
      }
    }

    setStats(newStats);

    // クリックで learning-visited をマーク
    const handler = (e: Event) => {
      const target = (e.currentTarget as HTMLAnchorElement);
      const href = target.getAttribute('href');
      if (!href) return;
      const slug = href.replace(/^\/docs\//, '').split('#')[0]!;
      if (!slugToSection[slug]) return;
      setProgress((prev) => {
        const next = { ...prev, [slug]: Date.now() };
        writeProgress(next);
        return next;
      });
    };
    for (const link of links) {
      link.addEventListener('click', handler);
    }
    return () => {
      for (const link of links) link.removeEventListener('click', handler);
    };
  }, [mounted, progress]);

  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const s of Object.values(stats)) {
      total += s.total;
      done += s.done;
    }
    return { total, done };
  }, [stats]);

  const handleReset = () => {
    if (!confirm('学習進捗をすべてリセットします。よろしいですか？')) return;
    writeProgress({});
    setProgress({});
  };

  if (!mounted) {
    return (
      <div
        className="my-8 rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
        aria-label="学習進捗"
      >
        <div className="text-sm text-gray-600 dark:text-gray-400">進捗を読み込み中…</div>
      </div>
    );
  }

  const totalPct = totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100);

  return (
    <div
      className="my-8 rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
      aria-label="学習進捗"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          学習進捗
        </h3>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline"
        >
          リセット
        </button>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
        下部のキーワードリンクを開くと、自動的に学習済みとして記録されます（ブラウザ内に保存）。
      </p>

      <div className="mb-4 rounded-card-inline border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-gray-900 dark:text-gray-100">5管理合計</span>
          <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
            {totals.done} / {totals.total}（{totalPct}%）
          </span>
        </div>
        <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 dark:bg-primary-400 transition-all"
            style={{ width: `${totalPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTION_DEFS.map((s) => {
          const entry = stats[s.key] || { total: 0, done: 0, slugs: [] };
          const pct = entry.total === 0 ? 0 : Math.round((entry.done / entry.total) * 100);
          return (
            <div
              key={s.id}
              className="rounded-card-inline border border-gray-200 dark:border-gray-700 p-3"
            >
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {s.id}. {s.label}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
                  {entry.done} / {entry.total}
                </span>
              </div>
              <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 dark:bg-primary-400 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
