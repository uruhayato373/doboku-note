/**
 * 5管理分野カード（総合技術監理の骨格）
 * 経済性管理・人的資源管理・情報管理・安全管理・社会環境管理 を視覚的に表現。
 * 将来的に note・iOS アプリでも流用できるよう、データ駆動の構造を持つ。
 */
import Link from 'next/link';

interface ExamField {
  name: string;
  scope: string;
  keywords: string[];
  href?: string;
  color?: string; // Tailwind color class (e.g., 'blue', 'emerald')
}

interface ExamFieldsProps {
  items: ExamField[];
}

const COLOR_CLASSES: Record<string, { border: string; bg: string; text: string }> = {
  blue: { border: 'border-blue-400 dark:border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
  emerald: { border: 'border-emerald-400 dark:border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300' },
  amber: { border: 'border-amber-400 dark:border-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300' },
  rose: { border: 'border-rose-400 dark:border-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-300' },
  teal: { border: 'border-teal-400 dark:border-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-700 dark:text-teal-300' },
  default: { border: 'border-gray-300 dark:border-gray-600', bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
};

export default function ExamFields({ items }: ExamFieldsProps) {
  return (
    <div className="my-6 grid gap-4 grid-cols-1 md:grid-cols-2">
      {items.map((field) => {
        const colors = COLOR_CLASSES[field.color || 'default'] || COLOR_CLASSES.default!;
        const content = (
          <div className={`rounded-xl border-l-4 ${colors.border} ${colors.bg} p-4 transition-shadow hover:shadow-md`}>
            <div className={`text-base font-bold mb-2 ${colors.text}`}>
              {field.name}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
              {field.scope}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {field.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>
        );
        return field.href ? (
          <Link key={field.name} href={field.href} className="block no-underline">
            {content}
          </Link>
        ) : (
          <div key={field.name}>{content}</div>
        );
      })}
    </div>
  );
}
