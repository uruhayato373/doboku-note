interface Stat {
  value: string;
  label: string;
}

/**
 * ヒーロー直下の社会的証明（数値）バンド。socialplus 参考の全幅淡青帯 × 大きな数値で信頼を示す。
 * doboku トークンのみ（serif 数値・accent-fill 帯）＝硬質エディトリアル維持・dark 自動追従。
 */
export default function StatsBand({ stats }: { stats: Stat[] }) {
  return (
    <section className="border-y border-[var(--rule-soft)] bg-[var(--accent-fill)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="font-serif font-black text-3xl sm:text-4xl text-[var(--accent)] tabular-nums leading-none">
                {s.value}
              </dd>
              <dt className="font-mono text-[10px] sm:text-[11px] uppercase tracking-widest text-[var(--ink-muted)] mt-2.5">
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
