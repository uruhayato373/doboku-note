interface Pillar {
  sectionPrefix: "2" | "3" | "4" | "5" | "6";
  label: string;
  slug: string;
}

export const PILLARS: readonly Pillar[] = [
  { sectionPrefix: "2", label: "経済性管理", slug: "economic-management-pillar" },
  { sectionPrefix: "3", label: "人的資源管理", slug: "human-resource-management-pillar" },
  { sectionPrefix: "4", label: "情報管理", slug: "information-management-pillar" },
  { sectionPrefix: "5", label: "安全管理", slug: "safety-management-pillar" },
  { sectionPrefix: "6", label: "社会環境管理", slug: "social-environment-management-pillar" },
] as const;

