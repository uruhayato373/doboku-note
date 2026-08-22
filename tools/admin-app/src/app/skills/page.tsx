import { PageHead } from '@/components/ui';
import { loadSkills, type SkillEntry } from '@/lib/registry';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  analytics: '分析',
  authoring: '執筆',
  conversion: '変換',
  dev: '開発',
  management: '運営',
  metrics: '計測',
  quality: '品質',
  social: 'SNS',
  ui: 'UI',
};

export default function SkillsPage() {
  const { items, errors } = loadSkills();

  // カテゴリ別にグループ化
  const groups = new Map<string, SkillEntry[]>();
  for (const s of items) {
    const arr = groups.get(s.category) ?? [];
    arr.push(s);
    groups.set(s.category, arr);
  }
  const cats = [...groups.keys()].sort();

  return (
    <>
      <PageHead title="スキル" sub={`${items.length} 件 / ${cats.length} カテゴリ · .claude/skills/`} />

      {errors.length > 0 ? (
        <div className="card warn-border">
          <h2>パース警告 {errors.length}件</h2>
          <ul className="small muted">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="filterbar">
        {cats.map((c) => (
          <a key={c} href={`#cat-${c}`} className="chip">
            {CATEGORY_LABEL[c] ?? c} {groups.get(c)!.length}
          </a>
        ))}
      </div>

      {cats.map((c) => (
        <div className="card" key={c} id={`cat-${c}`}>
          <h2>
            {CATEGORY_LABEL[c] ?? c}
            <span className="sub">{groups.get(c)!.length} 件 · skills/{c}/</span>
          </h2>
          <div className="grid cols-2">
            {groups
              .get(c)!
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <div className="kpi" key={s.file} style={{ padding: '12px 14px' }}>
                  <div className="mono" style={{ color: 'var(--ink)', marginBottom: 4 }}>
                    {s.name}
                  </div>
                  <div className="small muted desc-clamp">{s.description}</div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </>
  );
}
