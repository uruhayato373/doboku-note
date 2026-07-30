// 技術士第二次試験 建設部門の 必須科目I ＋ 11 選択科目。
// 過去問マトリクス（CategorySections の PeConstructionExamTable）とキーワード節（KeywordSections）が
// 同じ行ラベル・同じ並びで描くための**行ラベルの単一真実源**。両者が同一ページに縦に並ぶため、
// 表記が片方だけ変わると「同じ行を横に読む」という設計意図が崩れる（それを機械で止めるのが
// check-category-curriculum の label 突合）。
//
// short は「狭い記事カラム（993〜1150px の 527px）でも折返さない表示形」。正式名は title / aria-label に残す。
// 語彙は既存記事の shortTitle（例「鋼構造・コンクリート」「河川・砂防・海岸」）に合わせている。

export type PeConstructionSubject = {
  /** 記事 slug の科目セグメント（例 `r07-geotechnical` の `geotechnical`）。 */
  key: string;
  /** 正式名（試験区分の表記）。 */
  label: string;
  /** 折返し回避用の短縮表示。正式名が十分短い科目では持たない。 */
  short?: string;
};

export const PE_CONSTRUCTION_SUBJECTS: PeConstructionSubject[] = [
  { key: 'required', label: '必須科目I' },
  { key: 'geotechnical', label: '土質及び基礎' },
  { key: 'steel-concrete', label: '鋼構造及びコンクリート', short: '鋼構造・コンクリート' },
  { key: 'urban-planning', label: '都市及び地方計画', short: '都市・地方計画' },
  { key: 'river-coast', label: '河川、砂防及び海岸・海洋', short: '河川・砂防・海岸' },
  { key: 'port-airport', label: '港湾及び空港', short: '港湾・空港' },
  { key: 'power-civil', label: '電力土木' },
  { key: 'road', label: '道路' },
  { key: 'railway', label: '鉄道' },
  { key: 'tunnel', label: 'トンネル' },
  { key: 'construction-planning', label: '施工計画、施工設備及び積算', short: '施工計画・積算' },
  { key: 'environment', label: '建設環境' },
];

/** 表示ラベル（短縮形があればそれ・無ければ正式名）。 */
export function subjectDisplayLabel(s: PeConstructionSubject): string {
  return s.short ?? s.label;
}

/** 短縮表示したときだけ正式名を返す（title / aria-label 用・同一なら undefined）。 */
export function subjectFullLabel(s: PeConstructionSubject): string | undefined {
  return s.short ? s.label : undefined;
}

export function findPeConstructionSubject(key: string): PeConstructionSubject | undefined {
  return PE_CONSTRUCTION_SUBJECTS.find((s) => s.key === key);
}
