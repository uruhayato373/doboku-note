'use client';

import { useRouter } from 'next/navigation';

type AgencyOption = {
  agencyId: string;
  agencyName: string;
  documentCount: number;
};

export default function StandardsAgencySelector({
  agencies,
  currentAgency,
}: {
  agencies: AgencyOption[];
  currentAgency?: string;
}) {
  const router = useRouter();

  return (
    <div className="border border-[var(--rule-soft)] bg-[var(--paper)] p-5">
      <label htmlFor="standards-agency" className="block font-serif text-lg font-bold text-[var(--ink)]">
        地方整備局等を選んで表示
      </label>
      <p className="mt-1 text-[13px] leading-[1.7] text-[var(--ink-muted)]">
        全国10機関の共通仕様書・工事必携・施工管理資料へ移動できます。
      </p>
      <select
        id="standards-agency"
        value={currentAgency ?? ''}
        onChange={(event) => {
          const agencyId = event.target.value;
          if (agencyId) router.push(`/standards/${agencyId}`);
        }}
        className="focus-ring mt-4 min-h-12 w-full border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-[15px] text-[var(--ink)] sm:max-w-xl"
      >
        <option value="">発行機関を選択してください</option>
        {agencies.map((agency) => (
          <option key={agency.agencyId} value={agency.agencyId}>
            {agency.agencyName}（{agency.documentCount}文書）
          </option>
        ))}
      </select>
    </div>
  );
}
