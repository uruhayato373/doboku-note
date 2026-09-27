import { PageHead } from '@/components/ui';
import { loadSkills, type SkillEntry } from '@/lib/registry';
import { domainList } from '@/lib/domains';

export const dynamic = 'force-dynamic';

export default function SkillsPage() {
  const { items, errors } = loadSkills();

  // 事業の領域ごとに束ねる（並びと名前は正本 domains.json・domain が無いものは「未設定」）
  const domains = domainList();
  const label = (id: string) => domains.find((d) => d.id === id)?.label ?? '未設定';
  const groups = new Map<string, SkillEntry[]>();
  for (const s of items) {
    const key = s.domain ?? 'none';
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  const rank = (id: string) => {
    const i = domains.findIndex((d) => d.id === id);
    return i < 0 ? 99 : i;
  };
  const cats = [...groups.keys()].sort((a, b) => rank(a) - rank(b));

  return (
    <>
      <PageHead title="スキル" sub={`${items.length} 件`} />

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
            {label(c)} {groups.get(c)!.length}
          </a>
        ))}
      </div>

      {cats.map((c) => (
        <div className="card" key={c} id={`cat-${c}`}>
          <h2>
            {label(c)}
            <span className="sub">{groups.get(c)!.length} 件</span>
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
