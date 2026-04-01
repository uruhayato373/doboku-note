export type SidebarItemDoc = {
  type: 'doc';
  id: string;
  label?: string;
};

export type SidebarItemGeneratedIndex = {
  type: 'generated-index';
  title: string;
  slug: string;
};

export type SidebarItemCategory = {
  type: 'category';
  label: string;
  link?: SidebarItemDoc | SidebarItemGeneratedIndex;
  items: SidebarItem[];
};

export type SidebarItem = string | SidebarItemCategory;

export type SidebarConfig = {
  [key: string]: SidebarItem[];
};

// Convert doc ID to URL path
export function docIdToPath(docId: string): string {
  // "general/common-specs/common" → "/docs/general/common-specs/common"
  // "general/common-specs/index" → "/docs/general/common-specs"
  const parts = docId.split('/');
  if (parts[parts.length - 1] === 'index') {
    return '/docs/' + parts.slice(0, -1).join('/');
  }
  return '/docs/' + docId;
}

// Get the URL for a sidebar item
export function getSidebarItemPath(item: SidebarItem): string | undefined {
  if (typeof item === 'string') {
    return docIdToPath(item);
  }
  if (item.type === 'category' && item.link) {
    if (item.link.type === 'generated-index') {
      return '/docs/' + item.link.slug.replace(/^\//, '');
    }
    if (item.link.type === 'doc') {
      return docIdToPath(item.link.id);
    }
  }
  return undefined;
}

// Get sidebar item label
export function getSidebarItemLabel(item: SidebarItem): string {
  if (typeof item === 'string') {
    // Extract last part of doc ID as default label
    const parts = item.split('/');
    return parts[parts.length - 1];
  }
  return item.label;
}

// Find which sidebar contains a given path
export function findSidebarForPath(
  path: string,
  sidebars: SidebarConfig
): { sidebarId: string; items: SidebarItem[] } | null {
  for (const [sidebarId, items] of Object.entries(sidebars)) {
    if (containsPath(items, path)) {
      return { sidebarId, items };
    }
  }
  return null;
}

function containsPath(items: SidebarItem[], targetPath: string): boolean {
  for (const item of items) {
    if (typeof item === 'string') {
      if (docIdToPath(item) === targetPath) return true;
    } else if (item.type === 'category') {
      if (item.link) {
        const linkPath = getSidebarItemPath(item);
        if (linkPath === targetPath) return true;
      }
      if (containsPath(item.items, targetPath)) return true;
    }
  }
  return false;
}

// Flatten sidebar items to get all doc paths
export function flattenSidebarPaths(items: SidebarItem[]): string[] {
  const paths: string[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      paths.push(docIdToPath(item));
    } else if (item.type === 'category') {
      if (item.link) {
        const linkPath = getSidebarItemPath(item);
        if (linkPath) paths.push(linkPath);
      }
      paths.push(...flattenSidebarPaths(item.items));
    }
  }
  return paths;
}

// Get previous and next pages for navigation
export function getPrevNext(
  currentPath: string,
  items: SidebarItem[],
  titleMap: Record<string, string> = {}
): { prev: { path: string; label: string } | null; next: { path: string; label: string } | null } {
  const allItems = flattenSidebarItems(items, titleMap);
  const currentIndex = allItems.findIndex((i) => i.path === currentPath);

  return {
    prev: currentIndex > 0 ? allItems[currentIndex - 1] : null,
    next: currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null,
  };
}

function flattenSidebarItems(
  items: SidebarItem[],
  titleMap: Record<string, string> = {}
): { path: string; label: string }[] {
  const result: { path: string; label: string }[] = [];
  for (const item of items) {
    if (typeof item === 'string') {
      result.push({
        path: docIdToPath(item),
        label: titleMap[item] || item.split('/').pop() || item,
      });
    } else if (item.type === 'category') {
      if (item.link) {
        const linkPath = getSidebarItemPath(item);
        if (linkPath) {
          result.push({ path: linkPath, label: item.label });
        }
      }
      result.push(...flattenSidebarItems(item.items, titleMap));
    }
  }
  return result;
}

// ===== Sidebar Definitions =====

export const generalSidebar: SidebarItem[] = [
  {
    type: 'category',
    label: '土木一般',
    link: {
      type: 'generated-index',
      title: '土木一般',
      slug: 'civil-general',
    },
    items: [
      {
        type: 'category',
        label: '土工',
        link: {
          type: 'generated-index',
          title: '土工',
          slug: 'civil-general/earthwork',
        },
        items: [
          'general/civil-general/earthwork/earthwork-overview',
          'general/civil-general/earthwork/soil-investigation',
          'general/civil-general/earthwork/embankment',
          'general/civil-general/earthwork/cutting',
          'general/civil-general/earthwork/slope-protection',
          'general/civil-general/earthwork/soft-ground',
          'general/civil-general/earthwork/drainage',
          'general/civil-general/earthwork/earthwork-planning',
          'general/civil-general/earthwork/machinery-capacity',
          'general/civil-general/earthwork/road-pavement',
        ],
      },
      {
        type: 'category',
        label: '建設機械',
        link: {
          type: 'generated-index',
          title: '建設機械',
          slug: 'civil-general/construction-machinery',
        },
        items: [
          'general/civil-general/construction-machinery/machinery-overview',
          'general/civil-general/construction-machinery/machinery-structure',
          'general/civil-general/construction-machinery/tractor-scraper',
          'general/civil-general/construction-machinery/excavator',
          'general/civil-general/construction-machinery/loading-transport',
          'general/civil-general/construction-machinery/crane-aerial',
          'general/civil-general/construction-machinery/grader-compaction',
        ],
      },
      {
        type: 'category',
        label: 'コンクリート工',
        link: {
          type: 'generated-index',
          title: 'コンクリート工',
          slug: 'civil-general/concrete',
        },
        items: [
          'general/civil-general/concrete/concrete-overview',
          'general/civil-general/concrete/materials',
          'general/civil-general/concrete/properties',
          'general/civil-general/concrete/mix-design',
          'general/civil-general/concrete/ready-mixed',
          'general/civil-general/concrete/construction',
          'general/civil-general/concrete/reinforcement',
          'general/civil-general/concrete/formwork',
          'general/civil-general/concrete/special-concrete',
          'general/civil-general/concrete/quality-inspection',
        ],
      },
      {
        type: 'category',
        label: '基礎工',
        link: {
          type: 'generated-index',
          title: '基礎工',
          slug: 'civil-general/foundation',
        },
        items: [
          'general/civil-general/foundation/foundation-overview',
          'general/civil-general/foundation/geological-survey',
          'general/civil-general/foundation/earth-retaining',
          'general/civil-general/foundation/direct-foundation',
          'general/civil-general/foundation/pile-foundation-01',
          'general/civil-general/foundation/pile-foundation-02',
        ],
      },
      {
        type: 'category',
        label: '測量',
        link: {
          type: 'generated-index',
          title: '測量',
          slug: 'civil-general/surveying',
        },
        items: [
          'general/civil-general/surveying/surveying-basics',
          'general/civil-general/surveying/distance-angle',
          'general/civil-general/surveying/leveling',
          'general/civil-general/surveying/topographic-photo',
        ],
      },
      {
        type: 'category',
        label: '解体工事',
        link: {
          type: 'generated-index',
          title: '解体工事',
          slug: 'civil-general/demolition',
        },
        items: [
          'general/civil-general/demolition/demolition-types',
          'general/civil-general/demolition/demolition-construction',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '施工管理',
    link: {
      type: 'generated-index',
      title: '施工管理',
      slug: 'construction-management',
    },
    items: [
      {
        type: 'category',
        label: '施工計画',
        link: {
          type: 'generated-index',
          title: '施工計画',
          slug: 'construction-plan',
        },
        items: [
          'general/construction-management/construction-plan/construction-planning-overview',
          'general/construction-management/construction-plan/preliminary-survey',
          'general/construction-management/construction-plan/basic-plan',
          'general/construction-management/construction-plan/schedule-planning',
          'general/construction-management/construction-plan/temporary-facilities-planning',
          'general/construction-management/construction-plan/procurement-planning',
          'general/construction-management/construction-plan/cost-management-plan',
          'general/construction-management/construction-plan/quality-management-plan',
          'general/construction-management/construction-plan/safety-management-plan',
          'general/construction-management/construction-plan/environmental-conservation-plan',
          'general/construction-management/construction-plan/other-management-plans',
        ],
      },
      {
        type: 'category',
        label: '工程管理',
        link: {
          type: 'generated-index',
          title: '工程管理',
          slug: 'project-management',
        },
        items: [
          'general/construction-management/project-management/process-management-overview',
          'general/construction-management/project-management/process-chart-types',
          'general/construction-management/project-management/network-diagram-creation',
        ],
      },
      {
        type: 'category',
        label: '品質管理',
        link: {
          type: 'generated-index',
          title: '品質管理',
          slug: 'quality-management',
        },
        items: [
          'general/construction-management/quality-management/quality-management-overview',
          'general/construction-management/quality-management/quality-management-methods',
          'general/construction-management/quality-management/process-capability-chart',
          'general/construction-management/quality-management/histogram',
          'general/construction-management/quality-management/control-charts',
          'general/construction-management/quality-management/quality-inspection-methods',
        ],
      },
      {
        type: 'category',
        label: '安全管理',
        link: {
          type: 'generated-index',
          title: '安全管理',
          slug: 'safety-management',
        },
        items: [
          'general/construction-management/safety-management/labor-accidents',
          'general/construction-management/safety-management/construction-safety-prevention',
          'general/construction-management/safety-management/labor-safety-law-overview',
          'general/construction-management/safety-management/safety-measures-civil-engineering',
          'general/construction-management/safety-management/safety-reinforced-concrete',
          'general/construction-management/safety-management/safety-earthwork-foundation',
          'general/construction-management/safety-management/safety-construction-machinery',
          'general/construction-management/safety-management/safety-tunnel',
          'general/construction-management/safety-management/safety-bridge-compressed-air',
          'general/construction-management/safety-management/safety-oxygen-deficiency',
          'general/construction-management/safety-management/safety-dust-heatstroke',
          'general/construction-management/safety-management/safety-weather-debris-flow',
          'general/construction-management/safety-management/safety-rope-access-traffic',
          'general/construction-management/safety-management/safety-related-provisions',
        ],
      },
      {
        type: 'category',
        label: '環境保全管理',
        link: {
          type: 'generated-index',
          title: '環境保全管理',
          slug: 'environmental-management',
        },
        items: [
          'general/construction-management/environmental-management/environmental-management-overview',
          'general/construction-management/environmental-management/noise-vibration',
          'general/construction-management/environmental-management/air-water-pollution',
          'general/construction-management/environmental-management/neighborhood-environment',
          'general/construction-management/environmental-management/workplace-environment',
          'general/construction-management/environmental-management/soil-contamination',
          'general/construction-management/environmental-management/construction-byproducts',
          'general/construction-management/environmental-management/recycling-law',
          'general/construction-management/environmental-management/construction-recycling-law',
          'general/construction-management/environmental-management/waste-disposal-law',
          'general/construction-management/environmental-management/byproduct-proper-disposal',
        ],
      },
      {
        type: 'category',
        label: '関係法規',
        link: {
          type: 'generated-index',
          title: '関係法規',
          slug: 'related-laws',
        },
        items: [
          'general/construction-management/related-laws/01-compliance-overview',
          'general/construction-management/related-laws/02-labor-standards-act',
          'general/construction-management/related-laws/03-construction-business-act',
          'general/construction-management/related-laws/04-standard-contract',
          'general/construction-management/related-laws/05-road-act',
          'general/construction-management/related-laws/06-river-act',
          'general/construction-management/related-laws/07-building-standards-act',
          'general/construction-management/related-laws/08-explosives-control-act',
          'general/construction-management/related-laws/09-port-regulations-act',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '土木工事共通仕様書（案）【近畿地方整備局】',
    link: {
      type: 'doc',
      id: 'general/common-specs/index',
    },
    items: [
      'general/common-specs/01-common',
      'general/common-specs/02-materials',
      {
        type: 'category',
        label: '第3編 土木工事共通編',
        items: [
          'general/common-specs/03-01-general',
          'general/common-specs/03-02-construction-01',
          'general/common-specs/03-02-construction-02a',
          'general/common-specs/03-02-construction-02b',
          'general/common-specs/03-02-construction-02c',
          'general/common-specs/03-02-construction-03',
        ],
      },
      {
        type: 'category',
        label: '第6編 河川編',
        items: [
          'general/common-specs/06-river-01',
          'general/common-specs/06-river-02',
        ],
      },
      'general/common-specs/07-coastal',
      'general/common-specs/08-erosion',
      'general/common-specs/09-dam',
      {
        type: 'category',
        label: '第10編 道路編',
        items: [
          'general/common-specs/10-01-improvement',
          'general/common-specs/10-02-pavement',
          'general/common-specs/10-03-substructure',
          'general/common-specs/10-04-steel-bridge',
          'general/common-specs/10-05-concrete-bridge',
          'general/common-specs/10-06-tunnel',
          'general/common-specs/10-07-concrete-shed',
          'general/common-specs/10-08-steel-shed',
          'general/common-specs/10-09-pedestrian',
          'general/common-specs/10-10-parking',
          'general/common-specs/10-11-utility-tunnel',
          'general/common-specs/10-12-cable-duct',
          'general/common-specs/10-13-infobox',
          'general/common-specs/10-14-maintenance',
          'general/common-specs/10-15-snow',
          'general/common-specs/10-16-repair',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '土木工事共通仕様書【兵庫県】',
    link: {
      type: 'doc',
      id: 'general/common-specs-hyogo/index',
    },
    items: [
      {
        type: 'category',
        label: '第1編 共通編',
        items: [
          'general/common-specs-hyogo/01-01-general',
          'general/common-specs-hyogo/01-02-earthwork',
          'general/common-specs-hyogo/01-03-concrete',
        ],
      },
      {
        type: 'category',
        label: '第2編 材料編',
        items: [
          'general/common-specs-hyogo/02-01-materials-general',
          'general/common-specs-hyogo/02-02-materials-civil',
          'general/common-specs-hyogo/02-03-materials-port',
        ],
      },
      {
        type: 'category',
        label: '第3編 土木工事共通編',
        items: [
          'general/common-specs-hyogo/03-01-general',
          'general/common-specs-hyogo/03-02-construction-01',
          'general/common-specs-hyogo/03-02-construction-02',
          'general/common-specs-hyogo/03-02-construction-03',
        ],
      },
      {
        type: 'category',
        label: '第4編 港湾工事共通編',
        items: [
          'general/common-specs-hyogo/04-01-general',
          'general/common-specs-hyogo/04-02-construction-01',
          'general/common-specs-hyogo/04-03-construction-02',
        ],
      },
      {
        type: 'category',
        label: '第6編 河川編',
        items: [
          'general/common-specs-hyogo/06-river-01',
          'general/common-specs-hyogo/06-river-02',
        ],
      },
      'general/common-specs-hyogo/07-coastal',
      'general/common-specs-hyogo/08-erosion',
      'general/common-specs-hyogo/09-dam',
      {
        type: 'category',
        label: '第10編 道路編',
        items: [
          'general/common-specs-hyogo/10-01-improvement',
          'general/common-specs-hyogo/10-02-pavement',
          'general/common-specs-hyogo/10-03-substructure',
          'general/common-specs-hyogo/10-04-steel-bridge',
          'general/common-specs-hyogo/10-05-concrete-bridge',
          'general/common-specs-hyogo/10-06-tunnel',
          'general/common-specs-hyogo/10-07-concrete-shed',
          'general/common-specs-hyogo/10-08-steel-shed',
          'general/common-specs-hyogo/10-09-pedestrian',
          'general/common-specs-hyogo/10-10-parking',
          'general/common-specs-hyogo/10-11-utility-tunnel',
          'general/common-specs-hyogo/10-12-cable-duct',
          'general/common-specs-hyogo/10-13-infobox',
          'general/common-specs-hyogo/10-14-maintenance',
          'general/common-specs-hyogo/10-15-snow',
          'general/common-specs-hyogo/10-16-repair',
        ],
      },
      'general/common-specs-hyogo/11-port',
      'general/common-specs-hyogo/12-port-coastal',
      {
        type: 'category',
        label: '第13編 下水道編',
        items: [
          'general/common-specs-hyogo/13-01-general',
          'general/common-specs-hyogo/13-02-pipeline',
          'general/common-specs-hyogo/13-03-treatment-plant',
        ],
      },
      {
        type: 'category',
        label: '第14編 公園緑地編',
        items: [
          'general/common-specs-hyogo/14-01-foundation',
          'general/common-specs-hyogo/14-02-planting',
          'general/common-specs-hyogo/14-03-facilities',
          'general/common-specs-hyogo/14-04-ground-court',
          'general/common-specs-hyogo/14-05-nature-conservation',
        ],
      },
      'general/common-specs-hyogo/15-water',
    ],
  },
  {
    type: 'category',
    label: '設計便覧【近畿地方整備局】',
    link: {
      type: 'doc',
      id: 'general/design-manual/index',
    },
    items: [
      {
        type: 'category',
        label: '第1編 土木工事共通編',
        items: [
          'general/design-manual/01-01-design-general',
          'general/design-manual/01-02-temporary-01',
          'general/design-manual/01-02-temporary-02',
          'general/design-manual/01-03-appendix-01',
          'general/design-manual/01-03-appendix-02',
          'general/design-manual/01-03-appendix-03',
        ],
      },
      {
        type: 'category',
        label: '第2編 河川編',
        items: [
          'general/design-manual/02-01-general',
          'general/design-manual/02-02-levee-01',
          'general/design-manual/02-02-levee-02',
          'general/design-manual/02-03-revetment',
          'general/design-manual/02-04-drop-structure',
          'general/design-manual/02-05-weir',
          'general/design-manual/02-06-sluice',
          'general/design-manual/02-07-floodgate',
          'general/design-manual/02-08-pump-station',
          'general/design-manual/02-09-intake',
          'general/design-manual/02-10-inverted-siphon',
          'general/design-manual/02-11-channel',
          'general/design-manual/02-12-tunnel-river',
          'general/design-manual/02-13-coastal-01',
          'general/design-manual/02-13-coastal-02',
          'general/design-manual/02-14-erosion-control-01',
          'general/design-manual/02-14-erosion-control-02',
          'general/design-manual/02-15-landslide',
        ],
      },
      {
        type: 'category',
        label: '第3編 道路編',
        items: [
          'general/design-manual/03-01-road-general',
          'general/design-manual/03-02-earthwork-01',
          'general/design-manual/03-02-earthwork-02',
          'general/design-manual/03-03-retaining-wall-01',
          'general/design-manual/03-03-retaining-wall-02',
          'general/design-manual/03-04-drainage',
          'general/design-manual/03-05-box-culvert',
          'general/design-manual/03-06-bridge-super-01',
          'general/design-manual/03-06-bridge-super-02',
          'general/design-manual/03-06-bridge-super-03',
          'general/design-manual/03-07-bridge-sub',
          'general/design-manual/03-08-tunnel-01',
          'general/design-manual/03-08-tunnel-02',
          'general/design-manual/03-09-pavement',
          'general/design-manual/03-10-foundation',
          'general/design-manual/03-11-road-appurtenances',
          'general/design-manual/03-12-overpass',
          'general/design-manual/03-13-environment',
          'general/design-manual/03-14-traffic-safety',
          'general/design-manual/03-15-pedestrian',
          'general/design-manual/03-16-seismic-retrofit',
        ],
      },
      {
        type: 'category',
        label: '第4編 電気通信編',
        items: [
          'general/design-manual/04-01-general',
          'general/design-manual/04-02-power-01',
          'general/design-manual/04-02-power-02',
          'general/design-manual/04-02-power-03',
          'general/design-manual/04-02-power-04',
          'general/design-manual/04-03-wiring-01',
          'general/design-manual/04-03-wiring-02',
          'general/design-manual/04-04-road-lighting-01',
          'general/design-manual/04-04-road-lighting-02',
          'general/design-manual/04-05-tunnel-emergency',
          'general/design-manual/04-06-road-info',
          'general/design-manual/04-07-roadside-comm',
          'general/design-manual/04-08-utility-tunnel',
          'general/design-manual/04-09-optical-fiber',
          'general/design-manual/04-10-cctv',
          'general/design-manual/04-11-telecom',
          'general/design-manual/04-12-telecom-tower',
        ],
      },
      {
        type: 'category',
        label: '第5編 機械編',
        items: [
          'general/design-manual/05-01-gate-01',
          'general/design-manual/05-02-pump-01',
          'general/design-manual/05-02-pump-02',
          'general/design-manual/05-02-pump-03',
          'general/design-manual/05-03-tunnel-mech-01',
          'general/design-manual/05-03-tunnel-mech-02',
          'general/design-manual/05-03-tunnel-mech-03',
          'general/design-manual/05-04-snow-melt-01',
          'general/design-manual/05-04-snow-melt-02',
          'general/design-manual/05-04-snow-melt-03',
          'general/design-manual/05-05-road-drainage-01',
          'general/design-manual/05-05-road-drainage-02',
          'general/design-manual/05-06-dam-01',
          'general/design-manual/05-06-dam-02',
          'general/design-manual/05-06-dam-03',
          'general/design-manual/05-07-utility-tunnel',
          'general/design-manual/05-08-irrigation',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '土木技術管理規定集【兵庫県】',
    items: [
      {
        type: 'category',
        label: '道路I編',
        items: [
          'general/tech-management/road1-01-general-01',
          'general/tech-management/road1-01-general-02',
          'general/tech-management/road1-01-general-03',
          'general/tech-management/road1-02-earthwork-01',
          'general/tech-management/road1-02-earthwork-02',
          'general/tech-management/road1-03-retaining-wall-01',
          'general/tech-management/road1-03-retaining-wall-02',
          'general/tech-management/road1-04-drainage-01',
          'general/tech-management/road1-04-drainage-02',
          'general/tech-management/road1-05-box-culvert-01',
          'general/tech-management/road1-05-box-culvert-02',
          'general/tech-management/road1-06-pavement-01',
          'general/tech-management/road1-06-pavement-02',
          'general/tech-management/road1-07-reference',
        ],
      },
      {
        type: 'category',
        label: '河川編',
        items: [
          'general/tech-management/river-01-basic-01',
          'general/tech-management/river-01-basic-02',
          'general/tech-management/river-02-survey',
          'general/tech-management/river-03-design',
          'general/tech-management/river-04-flood-defense',
          'general/tech-management/river-05-circular',
        ],
      },
      {
        type: 'category',
        label: '砂防編I',
        items: [
          'general/tech-management/sabo1-01-basic',
          'general/tech-management/sabo1-02-survey',
          'general/tech-management/sabo1-03-design-01',
          'general/tech-management/sabo1-03-design-02',
          'general/tech-management/sabo1-03-design-03',
        ],
      },
      {
        type: 'category',
        label: '砂防編II',
        items: [
          'general/tech-management/sabo2-01-general',
          'general/tech-management/sabo2-02-survey',
          'general/tech-management/sabo2-03-plan',
          'general/tech-management/sabo2-04-design-01',
          'general/tech-management/sabo2-04-design-02',
          'general/tech-management/sabo2-04-design-03',
          'general/tech-management/sabo2-05-construction',
        ],
      },
      {
        type: 'category',
        label: '砂防編III',
        items: [
          'general/tech-management/sabo3-01-overview',
          'general/tech-management/sabo3-02-plan',
          'general/tech-management/sabo3-03-survey',
          'general/tech-management/sabo3-04-design-01',
          'general/tech-management/sabo3-04-design-02',
          'general/tech-management/sabo3-04-design-03',
          'general/tech-management/sabo3-05-maintenance',
          'general/tech-management/sabo3-06-reference',
        ],
      },
      {
        type: 'category',
        label: '橋梁編',
        items: [
          'general/tech-management/bridge-01-plan-01',
          'general/tech-management/bridge-01-plan-02',
          'general/tech-management/bridge-01-plan-03',
          'general/tech-management/bridge-02-design-01',
          'general/tech-management/bridge-02-design-02',
          'general/tech-management/bridge-02-design-03',
          'general/tech-management/bridge-02-design-04',
          'general/tech-management/bridge-02-design-05',
          'general/tech-management/bridge-02-design-06',
          'general/tech-management/bridge-02-design-07',
          'general/tech-management/bridge-02-design-08',
          'general/tech-management/bridge-03-construction',
          'general/tech-management/bridge-04-reference-01',
          'general/tech-management/bridge-04-reference-02',
          'general/tech-management/bridge-04-reference-03',
        ],
      },
      {
        type: 'category',
        label: '道路II編',
        items: [
          'general/tech-management/road2-01-pavement-01',
          'general/tech-management/road2-01-pavement-02',
          'general/tech-management/road2-02-snow-01',
          'general/tech-management/road2-02-snow-02',
          'general/tech-management/road2-02-snow-03',
          'general/tech-management/road2-02-snow-04',
          'general/tech-management/road2-03-disaster-01',
          'general/tech-management/road2-03-disaster-02',
          'general/tech-management/road2-04-tunnel',
          'general/tech-management/road2-05-seismic-01',
          'general/tech-management/road2-05-seismic-02',
          'general/tech-management/road2-05-seismic-03',
          'general/tech-management/road2-06-traffic-01',
          'general/tech-management/road2-06-traffic-02',
          'general/tech-management/road2-06-traffic-03',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '土木請負工事必携【兵庫県】',
    link: {
      type: 'doc',
      id: 'general/hyogo-hikkei/index',
    },
    items: [
      'general/hyogo-hikkei/01-contract',
      'general/hyogo-hikkei/02-01-clause25-overview',
      'general/hyogo-hikkei/02-02-tanpin-slide',
      'general/hyogo-hikkei/03-bidding-guide',
      'general/hyogo-hikkei/04-engineers',
      'general/hyogo-hikkei/05-forms',
      {
        type: 'category',
        label: '6. 土木工事安全施工技術指針',
        items: [
          'general/hyogo-hikkei/06-01-safety-general',
          'general/hyogo-hikkei/06-02-safety-measures',
          'general/hyogo-hikkei/06-03-underground-overhead',
          'general/hyogo-hikkei/06-04-machinery',
          'general/hyogo-hikkei/06-05-temporary-works',
          'general/hyogo-hikkei/06-06-transport',
          'general/hyogo-hikkei/06-07-earthwork',
          'general/hyogo-hikkei/06-08-foundation',
          'general/hyogo-hikkei/06-09-concrete',
          'general/hyogo-hikkei/06-10-compressed-air',
          'general/hyogo-hikkei/06-11-railway',
          'general/hyogo-hikkei/06-12-debris-flow',
          'general/hyogo-hikkei/06-13-road',
          'general/hyogo-hikkei/06-14-bridge',
          'general/hyogo-hikkei/06-15-mountain-tunnel',
          'general/hyogo-hikkei/06-16-shield-tunnel',
          'general/hyogo-hikkei/06-17-river-coastal',
          'general/hyogo-hikkei/06-18-dam',
          'general/hyogo-hikkei/06-19-demolition',
        ],
      },
      'general/hyogo-hikkei/07-machinery-safety',
      'general/hyogo-hikkei/08-public-disaster',
      'general/hyogo-hikkei/09-labor-disaster',
      'general/hyogo-hikkei/10-signboard',
      'general/hyogo-hikkei/11-road-signs',
      'general/hyogo-hikkei/12-road-safety',
      'general/hyogo-hikkei/13-byproduct',
      'general/hyogo-hikkei/14-recycling',
      'general/hyogo-hikkei/15-noise-vibration',
      'general/hyogo-hikkei/16-water-quality',
      'general/hyogo-hikkei/17-chromium',
      'general/hyogo-hikkei/18-grouting-guidelines',
      'general/hyogo-hikkei/19-grouting-management',
      {
        type: 'category',
        label: '20. 土木工事施工管理基準運用方針',
        items: [
          'general/hyogo-hikkei/20-01-construction-mgmt',
          'general/hyogo-hikkei/20-02-construction-mgmt',
        ],
      },
      'general/hyogo-hikkei/21-chloride-alkali',
      'general/hyogo-hikkei/22-ri-compaction',
      {
        type: 'category',
        label: '23. 火薬類の譲渡、消費許可手続',
        items: [
          'general/hyogo-hikkei/23-01-explosives',
          'general/hyogo-hikkei/23-02-explosives',
          'general/hyogo-hikkei/23-03-explosives',
        ],
      },
      'general/hyogo-hikkei/24-cofferdam',
      'general/hyogo-hikkei/25-levee-surcharge',
      'general/hyogo-hikkei/26-safety-training',
      'general/hyogo-hikkei/27-concrete-byproduct',
      'general/hyogo-hikkei/28-excavated-soil',
      'general/hyogo-hikkei/29-natm',
      'general/hyogo-hikkei/30-hydraulic-slag',
      'general/hyogo-hikkei/31-crusher-slag',
      'general/hyogo-hikkei/32-anchor-bolt',
      'general/hyogo-hikkei/33-concrete-quality',
      'general/hyogo-hikkei/34-concrete-strength',
      'general/hyogo-hikkei/35-safety-measures',
      'general/hyogo-hikkei/36-unit-water',
      'general/hyogo-hikkei/37-rebar-cover',
      {
        type: 'category',
        label: '38. ガイドライン（総合版）',
        items: [
          'general/hyogo-hikkei/38-01-design-change',
          'general/hyogo-hikkei/38-02-suspension',
          'general/hyogo-hikkei/38-03-review',
        ],
      },
      'general/hyogo-hikkei/39-facility-records',
      'general/hyogo-hikkei/40-recycling-gl',
      'general/hyogo-hikkei/41-recycling-signs',
      'general/hyogo-hikkei/42-overload',
      'general/hyogo-hikkei/43-slag-soft-ground',
    ],
  },
];

export const roadSidebar: SidebarItem[] = [
  {
    type: 'category',
    label: '道路管理',
    link: {
      type: 'generated-index',
      title: '道路管理',
      slug: 'road-management',
    },
    items: [
      'road/road-management/road-concept',
      'road/road-management/survey-on-roads',
      'road/road-management/route-designation-certification',
      'road/road-management/road-manager',
      'road/road-management/road-zone-determination',
      'road/road-management/road-construction',
      'road/road-management/start-of-road-service',
      'road/road-management/road-management',
      'road/road-management/occupation-of-road',
      'road/road-management/costs-related-to-roads',
      'road/road-management/road-administrator',
      'road/road-management/closure-of-road',
      'road/road-management/guidance-grant',
      'road/road-management/road-environmental-measures',
      'road/road-management/road-conflict',
      'road/road-management/related-administration',
    ],
  },
  {
    type: 'category',
    label: '道路法解説',
    items: [
      {
        type: 'category',
        label: '第一章 総則（第1条〜第4条）',
        items: [
          'road/road-law/001',
          'road/road-law/002',
          'road/road-law/003',
          'road/road-law/004',
        ],
      },
      {
        type: 'category',
        label: '第二章 一般国道等（第5条〜第32条）',
        items: [
          'road/road-law/005',
          'road/road-law/006',
          'road/road-law/007',
          'road/road-law/008',
          'road/road-law/009',
          'road/road-law/010',
          'road/road-law/011',
          'road/road-law/012',
          'road/road-law/013',
          'road/road-law/015',
          'road/road-law/016',
          'road/road-law/017',
          'road/road-law/018',
          'road/road-law/020',
          'road/road-law/021',
          'road/road-law/022',
          'road/road-law/023',
          'road/road-law/024',
          'road/road-law/025',
          'road/road-law/026',
          'road/road-law/027',
          'road/road-law/028',
          'road/road-law/029',
          'road/road-law/030',
          'road/road-law/031',
          'road/road-law/032',
        ],
      },
      {
        type: 'category',
        label: '第三章 道路の占用（第33条〜第41条）',
        items: [
          'road/road-law/033',
          'road/road-law/034',
          'road/road-law/035',
          'road/road-law/036',
          'road/road-law/037',
          'road/road-law/038',
          'road/road-law/039',
          'road/road-law/040',
          'road/road-law/041',
        ],
      },
      {
        type: 'category',
        label: '第三章 道路の保全等（第42条〜第48条の25）',
        items: [
          'road/road-law/042',
          'road/road-law/043',
          'road/road-law/044',
          'road/road-law/045',
          'road/road-law/046',
          'road/road-law/047',
          'road/road-law/048',
        ],
      },
      {
        type: 'category',
        label: '第四章 費用（第49条〜第65条）',
        items: [
          'road/road-law/049',
          'road/road-law/050',
          'road/road-law/051',
          'road/road-law/052',
          'road/road-law/053',
          'road/road-law/054',
          'road/road-law/055',
          'road/road-law/056',
          'road/road-law/057',
          'road/road-law/058',
          'road/road-law/059',
          'road/road-law/060',
          'road/road-law/061',
          'road/road-law/062',
          'road/road-law/064',
          'road/road-law/065',
        ],
      },
      {
        type: 'category',
        label: '第五章 収用等（第66条〜第72条の2）',
        items: [
          'road/road-law/066',
          'road/road-law/067',
          'road/road-law/068',
          'road/road-law/069',
          'road/road-law/070',
          'road/road-law/071',
          'road/road-law/072',
        ],
      },
      {
        type: 'category',
        label: '第五章 雑則・罰則（第73条〜第109条）',
        items: [
          'road/road-law/073',
          'road/road-law/074',
          'road/road-law/075',
          'road/road-law/076',
          'road/road-law/077',
          'road/road-law/079',
          'road/road-law/080',
          'road/road-law/085',
          'road/road-law/086',
          'road/road-law/087',
          'road/road-law/088',
          'road/road-law/089',
          'road/road-law/090',
          'road/road-law/091',
          'road/road-law/092',
          'road/road-law/093',
          'road/road-law/094',
          'road/road-law/095',
          'road/road-law/096',
          'road/road-law/097',
          'road/road-law/098',
          'road/road-law/099',
          'road/road-law/101',
          'road/road-law/102',
          'road/road-law/103',
          'road/road-law/104',
          'road/road-law/105',
          'road/road-law/106',
        ],
      },
    ],
  },
];

export const riverSidebar: SidebarItem[] = [
  {
    type: 'category',
    label: '河川法の概要',
    link: {
      type: 'generated-index',
      title: '河川法の概要',
      slug: 'river-low',
    },
    items: [
      'river/river-low/river-law-overview',
      'river/river-low/river-law-target',
      'river/river-low/river-law-management-subject',
      'river/river-low/river-area',
      'river/river-low/river-planning',
      'river/river-low/river-construction',
      'river/river-low/river-law-history',
    ],
  },
  {
    type: 'category',
    label: '河川の調査・計画',
    link: {
      type: 'generated-index',
      title: '河川の調査・計画',
      slug: 'river-research-plan',
    },
    items: [
      'river/river-research-plan/river-research',
      'river/river-research-plan/river-planning',
      'river/river-research-plan/river-channel-planning',
    ],
  },
  {
    type: 'category',
    label: '河川砂防技術基準（設計編）技術資料',
    items: [
      'river/river-design/01-02-levee',
      'river/river-design/01-03-super-levee',
      'river/river-design/01-07-weir',
      'river/river-design/01-08-culvert',
      'river/river-design/01-09-sluice-gate',
      'river/river-design/01-10-river-tunnel',
    ],
  },
  'river/kousakubutsu/index',
  {
    type: 'category',
    label: '近畿地方整備局設計便覧',
    items: [
      'river/river-chisei/01',
      'river/river-chisei/02',
    ],
  },
];

export const lowSidebar: SidebarItem[] = [
  {
    type: 'category',
    label: '憲法',
    items: [
      'low/constitution/01',
      'low/constitution/02',
      'low/constitution/03',
    ],
  },
  {
    type: 'category',
    label: '国家賠償法',
    items: [
      'low/national-compensation-law/01',
      'low/national-compensation-law/02',
    ],
  },
  {
    type: 'category',
    label: '民法',
    link: {
      type: 'doc',
      id: 'low/civil-law/index',
    },
    items: [
      'low/civil-law/00-guidance',
      {
        type: 'category',
        label: '第1章 総則',
        items: [
          'low/civil-law/01-01-subject-object',
          'low/civil-law/01-02-declaration',
          'low/civil-law/01-03-agency',
          'low/civil-law/01-04-void-cancel',
          'low/civil-law/01-05-condition-period',
          'low/civil-law/01-06-prescription',
        ],
      },
      {
        type: 'category',
        label: '第2章 物権',
        items: [
          'low/civil-law/02-01-property-general',
          'low/civil-law/02-02-possession',
          'low/civil-law/02-03-ownership',
          'low/civil-law/02-04-usufruct',
          'low/civil-law/02-05-security',
        ],
      },
      {
        type: 'category',
        label: '第3章 債権',
        items: [
          'low/civil-law/03-01-obligation-purpose',
          'low/civil-law/03-02-default',
          'low/civil-law/03-03-preservation',
          'low/civil-law/03-04-multiple-parties',
          'low/civil-law/03-05-assignment',
          'low/civil-law/03-06-extinction',
          'low/civil-law/03-07-contract-general',
          'low/civil-law/03-08-transfer-contract',
          'low/civil-law/03-09-lending-contract',
          'low/civil-law/03-10-service-contract',
          'low/civil-law/03-11-non-contract',
        ],
      },
      {
        type: 'category',
        label: '第4章 親族',
        items: [
          'low/civil-law/04-01-marriage',
          'low/civil-law/04-02-parent-child',
          'low/civil-law/04-03-parental-authority',
          'low/civil-law/04-04-guardianship',
        ],
      },
      {
        type: 'category',
        label: '第5章 相続',
        items: [
          'low/civil-law/05-01-heir',
          'low/civil-law/05-02-inheritance-effect',
          'low/civil-law/05-03-acceptance-renunciation',
          'low/civil-law/05-04-will',
          'low/civil-law/05-05-reserved-portion',
          'low/civil-law/05-06-spouse-residence',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '行政書士テキスト 憲法',
    items: [
      'low/admin-scrivener-constitution/as-kenpo-01',
      {
        type: 'category',
        label: '第2章 人権',
        items: [
          'low/admin-scrivener-constitution/as-kenpo-02-01',
          'low/admin-scrivener-constitution/as-kenpo-02-02',
          'low/admin-scrivener-constitution/as-kenpo-02-03',
          'low/admin-scrivener-constitution/as-kenpo-02-04',
          'low/admin-scrivener-constitution/as-kenpo-02-05',
          'low/admin-scrivener-constitution/as-kenpo-02-06',
          'low/admin-scrivener-constitution/as-kenpo-02-07',
          'low/admin-scrivener-constitution/as-kenpo-02-08',
        ],
      },
      {
        type: 'category',
        label: '第3章 統治',
        items: [
          'low/admin-scrivener-constitution/as-kenpo-03-01',
          'low/admin-scrivener-constitution/as-kenpo-03-02',
          'low/admin-scrivener-constitution/as-kenpo-03-03',
          'low/admin-scrivener-constitution/as-kenpo-03-04',
          'low/admin-scrivener-constitution/as-kenpo-03-05',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '行政書士テキスト 行政法',
    items: [
      {
        type: 'category',
        label: '第1章 行政法の一般的な法理論',
        items: [
          'low/admin-scrivener-admin-law/as-gyosei-ch1-01',
          'low/admin-scrivener-admin-law/as-gyosei-ch1-02',
          'low/admin-scrivener-admin-law/as-gyosei-ch1-03',
          'low/admin-scrivener-admin-law/as-gyosei-ch1-04',
          'low/admin-scrivener-admin-law/as-gyosei-ch1-05',
          'low/admin-scrivener-admin-law/as-gyosei-ch1-06',
          'low/admin-scrivener-admin-law/as-gyosei-ch1-07',
          'low/admin-scrivener-admin-law/as-gyosei-ch1-08',
        ],
      },
      {
        type: 'category',
        label: '第2章 行政手続法',
        items: [
          'low/admin-scrivener-admin-law/as-gyosei-ch2-01',
          'low/admin-scrivener-admin-law/as-gyosei-ch2-02',
          'low/admin-scrivener-admin-law/as-gyosei-ch2-03',
        ],
      },
      {
        type: 'category',
        label: '第3章 行政不服審査法',
        items: [
          'low/admin-scrivener-admin-law/as-gyosei-ch3-01',
          'low/admin-scrivener-admin-law/as-gyosei-ch3-02',
          'low/admin-scrivener-admin-law/as-gyosei-ch3-03',
        ],
      },
      {
        type: 'category',
        label: '第4章 行政事件訴訟法',
        items: [
          'low/admin-scrivener-admin-law/as-gyosei-ch4-01',
          'low/admin-scrivener-admin-law/as-gyosei-ch4-02',
          'low/admin-scrivener-admin-law/as-gyosei-ch4-03',
          'low/admin-scrivener-admin-law/as-gyosei-ch4-04',
          'low/admin-scrivener-admin-law/as-gyosei-ch4-05',
          'low/admin-scrivener-admin-law/as-gyosei-ch4-06',
        ],
      },
      {
        type: 'category',
        label: '第5章 国家賠償法・損失補償',
        items: [
          'low/admin-scrivener-admin-law/as-gyosei-ch5-01',
          'low/admin-scrivener-admin-law/as-gyosei-ch5-02',
        ],
      },
      {
        type: 'category',
        label: '第6章 地方自治法',
        items: [
          'low/admin-scrivener-admin-law/as-gyosei-ch6-01',
          'low/admin-scrivener-admin-law/as-gyosei-ch6-02',
          'low/admin-scrivener-admin-law/as-gyosei-ch6-03',
          'low/admin-scrivener-admin-law/as-gyosei-ch6-04',
          'low/admin-scrivener-admin-law/as-gyosei-ch6-05',
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '行政書士テキスト 商法',
    items: [
      'low/admin-scrivener-commercial-law/as-shoho-01',
      'low/admin-scrivener-commercial-law/as-shoho-02',
      'low/admin-scrivener-commercial-law/as-shoho-03',
      'low/admin-scrivener-commercial-law/as-shoho-04',
      'low/admin-scrivener-commercial-law/as-shoho-05',
      'low/admin-scrivener-commercial-law/as-shoho-06',
      'low/admin-scrivener-commercial-law/as-shoho-07',
      'low/admin-scrivener-commercial-law/as-shoho-08',
    ],
  },
  {
    type: 'category',
    label: '行政書士テキスト 基礎法学',
    items: [
      'low/admin-scrivener-basic-law/basic-law-01',
      'low/admin-scrivener-basic-law/basic-law-02',
    ],
  },
  {
    type: 'category',
    label: '行政事件訴訟法',
    items: [
      'low/state-edress-act/01',
      'low/state-edress-act/02',
      'low/state-edress-act/03',
      'low/state-edress-act/04',
      'low/state-edress-act/05',
      'low/state-edress-act/06',
    ],
  },
  {
    type: 'category',
    label: '行政法総論',
    items: [
      'low/administrative-law/admin-general-01',
      'low/administrative-law/admin-general-02',
      'low/administrative-law/admin-general-03',
      'low/administrative-law/admin-general-04',
      'low/administrative-law/admin-general-05',
      'low/administrative-law/admin-general-06',
      'low/administrative-law/admin-general-07',
      'low/administrative-law/admin-general-08',
    ],
  },
  {
    type: 'category',
    label: '行政不服審査法',
    items: [
      'low/administrative-appeal-act/admin-appeal-01',
      'low/administrative-appeal-act/admin-appeal-02',
      'low/administrative-appeal-act/admin-appeal-03',
      'low/administrative-appeal-act/admin-appeal-04',
    ],
  },
  {
    type: 'category',
    label: '情報公開法',
    items: [
      'low/information-disclosure-act/01',
    ],
  },
  {
    type: 'category',
    label: '労働基準法',
    items: [
      'low/labor-standards-act/labor-01',
      'low/labor-standards-act/labor-02',
      'low/labor-standards-act/labor-03',
      'low/labor-standards-act/labor-04',
      'low/labor-standards-act/labor-05',
      'low/labor-standards-act/labor-06',
      'low/labor-standards-act/labor-07',
    ],
  },
  {
    type: 'category',
    label: '地方自治法',
    items: [
      'low/local-autonomy-act/local-gov-01',
      'low/local-autonomy-act/local-gov-02',
      'low/local-autonomy-act/local-gov-03',
      'low/local-autonomy-act/local-gov-04',
      'low/local-autonomy-act/local-gov-05',
      'low/local-autonomy-act/local-gov-06',
      'low/local-autonomy-act/local-gov-07',
      'low/local-autonomy-act/local-gov-08',
    ],
  },
  {
    type: 'category',
    label: '行政書士問題集',
    link: {
      type: 'generated-index',
      title: '行政書士 合格革命 問題集',
      slug: 'admin-scrivener-mondai',
    },
    items: [
      'low/admin-scrivener-mondai/intro',
      'low/admin-scrivener-mondai/technique',
      {
        type: 'category',
        label: '第1部 憲法',
        items: [
          'low/admin-scrivener-mondai/kenpo-guidance',
          'low/admin-scrivener-mondai/kenpo-general',
          'low/admin-scrivener-mondai/kenpo-human-rights',
          'low/admin-scrivener-mondai/kenpo-governance',
        ],
      },
      {
        type: 'category',
        label: '第2部 行政法',
        items: [
          'low/admin-scrivener-mondai/gyosei-guidance',
          'low/admin-scrivener-mondai/gyosei-general',
          'low/admin-scrivener-mondai/gyosei-procedure',
          'low/admin-scrivener-mondai/gyosei-appeal',
          'low/admin-scrivener-mondai/gyosei-litigation',
          'low/admin-scrivener-mondai/gyosei-compensation',
          'low/admin-scrivener-mondai/gyosei-local',
        ],
      },
      {
        type: 'category',
        label: '第3部 民法',
        items: [
          'low/admin-scrivener-mondai/minpo-guidance',
          'low/admin-scrivener-mondai/minpo-general',
          'low/admin-scrivener-mondai/minpo-real-rights',
          'low/admin-scrivener-mondai/minpo-obligations',
          'low/admin-scrivener-mondai/minpo-family',
          'low/admin-scrivener-mondai/minpo-succession',
        ],
      },
      {
        type: 'category',
        label: '第4部 商法',
        items: [
          'low/admin-scrivener-mondai/shoho-guidance',
          'low/admin-scrivener-mondai/shoho-commercial',
          'low/admin-scrivener-mondai/shoho-company',
        ],
      },
      {
        type: 'category',
        label: '第5部 基礎法学',
        items: [
          'low/admin-scrivener-mondai/kiso-guidance',
          'low/admin-scrivener-mondai/kiso-jurisprudence',
          'low/admin-scrivener-mondai/kiso-dispute',
        ],
      },
      {
        type: 'category',
        label: '第6部 一般知識',
        items: [
          'low/admin-scrivener-mondai/ippan-guidance',
          'low/admin-scrivener-mondai/ippan-politics',
          'low/admin-scrivener-mondai/ippan-economics',
          'low/admin-scrivener-mondai/ippan-society',
          'low/admin-scrivener-mondai/ippan-ict',
          'low/admin-scrivener-mondai/ippan-privacy',
          'low/admin-scrivener-mondai/ippan-reading',
        ],
      },
    ],
  },
];

export const portSidebar: SidebarItem[] = [
  {
    type: 'category',
    label: '漁港施設の地震・津波対策',
    link: {
      type: 'generated-index',
      title: '漁港施設の地震・津波対策の基本的な考え方',
      slug: 'fishery-guideline',
    },
    items: [
      'port/fishery-guideline/00-main',
      'port/fishery-guideline/01-ref1-2',
      'port/fishery-guideline/02-ref3-multi-protection-01',
      'port/fishery-guideline/02-ref3-multi-protection-02',
      'port/fishery-guideline/03-ref4-5',
      'port/fishery-guideline/04-ref6-7-8',
    ],
  },
  {
    type: 'category',
    label: '漁港・漁場の施設の設計参考図書',
    link: {
      type: 'generated-index',
      title: '漁港・漁場の施設の設計参考図書',
      slug: 'fishery-port',
    },
    items: [
      'port/fishery-port/01-overview',
      {
        type: 'category',
        label: '第2編 設計条件',
        items: [
          'port/fishery-port/02-ch01-basics',
          'port/fishery-port/02-ch02-tide',
          'port/fishery-port/02-ch03-wave-01',
          'port/fishery-port/02-ch04-wave-force',
          'port/fishery-port/02-ch05-tsunami',
          'port/fishery-port/02-ch06-flow',
          'port/fishery-port/02-ch07-wind',
          'port/fishery-port/02-ch08-sediment',
          'port/fishery-port/02-ch09-soil',
          'port/fishery-port/02-ch10-earth-pressure',
          'port/fishery-port/02-ch11-earthquake',
          'port/fishery-port/02-ch12-liquefaction',
          'port/fishery-port/02-ch13-load',
          'port/fishery-port/02-ch14-fishing-vessel',
          'port/fishery-port/02-ch15-water-quality',
        ],
      },
      'port/fishery-port/03-materials',
      {
        type: 'category',
        label: '第4編 基礎',
        items: [
          'port/fishery-port/04-foundation-01',
          'port/fishery-port/04-foundation-02',
        ],
      },
      {
        type: 'category',
        label: '第5編 外郭施設',
        items: [
          'port/fishery-port/05-outer-facilities-01',
          'port/fishery-port/05-outer-facilities-02',
        ],
      },
      {
        type: 'category',
        label: '第6編 係留施設',
        items: [
          'port/fishery-port/06-mooring-01',
          'port/fishery-port/06-mooring-02',
        ],
      },
      'port/fishery-port/07-water-area',
      'port/fishery-port/08-transport',
      'port/fishery-port/09-port-land',
      'port/fishery-port/10-seedling',
      'port/fishery-port/11-land-aquaculture',
      'port/fishery-port/12-aquaculture-work',
      'port/fishery-port/13-sorting',
      'port/fishery-port/14-distribution',
      'port/fishery-port/15-warehouse',
      'port/fishery-port/16-ice-cold',
      'port/fishery-port/17-processing',
      'port/fishery-port/18-wholesale',
      'port/fishery-port/19-direct-sales',
      'port/fishery-port/20-power-generation',
      'port/fishery-port/21-purification',
      'port/fishery-port/22-environment',
      'port/fishery-port/23-windbreak',
      {
        type: 'category',
        label: '第24編 漁業集落環境整備施設',
        items: [
          'port/fishery-port/24-settlement-01',
          'port/fishery-port/24-settlement-02',
        ],
      },
      'port/fishery-port/25-fish-reef',
      'port/fishery-port/26-propagation-reef',
      'port/fishery-port/27-aquaculture-reef',
      'port/fishery-port/28-promotion',
      'port/fishery-port/29-conservation',
    ],
  },
];

export const examSidebar: SidebarItem[] = [
  'exam/index',
  {
    type: 'category',
    label: '1級土木施工管理技士',
    link: {
      type: 'generated-index',
      title: '1級土木施工管理技士',
      slug: 'exam/civil-construction-1',
    },
    items: [
      {
        type: 'category',
        label: '試験対策ガイド',
        link: {
          type: 'generated-index',
          title: '1級土木施工管理 試験対策ガイド',
          slug: 'exam/civil-construction-1/guide',
        },
        items: [
          'exam/civil-construction-1/guide/strategy',
          'exam/civil-construction-1/guide/earthwork-key-points',
          'exam/civil-construction-1/guide/concrete-key-points',
          'exam/civil-construction-1/guide/four-management',
          'exam/civil-construction-1/guide/law-key-points',
          'exam/civil-construction-1/guide/concrete-maintenance',
        ],
      },
      {
        type: 'category',
        label: '第1次試験問題集',
        link: {
          type: 'generated-index',
          title: '1級土木施工管理 第1次試験問題集',
          slug: 'exam/civil-construction-1/primary',
        },
        items: [
          'exam/civil-construction-1/primary/r02-a',
          'exam/civil-construction-1/primary/r02-b',
          'exam/civil-construction-1/primary/r01-a',
          'exam/civil-construction-1/primary/r01-b',
          'exam/civil-construction-1/primary/h30-a',
          'exam/civil-construction-1/primary/h30-b',
          'exam/civil-construction-1/primary/h29-a',
          'exam/civil-construction-1/primary/h29-b',
          'exam/civil-construction-1/primary/h28-a',
          'exam/civil-construction-1/primary/h28-b',
          'exam/civil-construction-1/primary/h27-a',
          'exam/civil-construction-1/primary/h27-b',
          'exam/civil-construction-1/primary/h26-a',
          'exam/civil-construction-1/primary/h26-b',
        ],
      },
      {
        type: 'category',
        label: '第2次試験問題集',
        link: {
          type: 'generated-index',
          title: '1級土木施工管理 第2次試験問題集',
          slug: 'exam/civil-construction-1/secondary',
        },
        items: [
          {
            type: 'category',
            label: '施工経験記述',
            items: [
              'exam/civil-construction-1/secondary/experience-writing/guide',
              'exam/civil-construction-1/secondary/experience-writing/examples',
            ],
          },
          {
            type: 'category',
            label: '土工',
            items: [
              'exam/civil-construction-1/secondary/earthwork/past-problems',
              'exam/civil-construction-1/secondary/earthwork/basics',
            ],
          },
          {
            type: 'category',
            label: 'コンクリート工',
            items: [
              'exam/civil-construction-1/secondary/concrete/past-problems',
              'exam/civil-construction-1/secondary/concrete/basics',
            ],
          },
          {
            type: 'category',
            label: '施工計画',
            items: [
              'exam/civil-construction-1/secondary/construction-plan/past-problems',
              'exam/civil-construction-1/secondary/construction-plan/basics',
            ],
          },
          {
            type: 'category',
            label: '品質管理',
            items: [
              'exam/civil-construction-1/secondary/quality-management/past-problems',
              'exam/civil-construction-1/secondary/quality-management/basics',
            ],
          },
        ],
      },
    ],
  },
  {
    type: 'category',
    label: '技術士（建設部門）',
    link: {
      type: 'generated-index',
      title: '技術士試験対策（建設部門）',
      slug: 'exam/pe',
    },
    items: [
      'exam/pe/primary-guide',
      'exam/pe/soil-foundation',
      'exam/pe/concrete-points',
      'exam/pe/river-erosion',
      'exam/pe/construction-plan',
      'exam/pe/road-points',
      'exam/pe/secondary-guide',
    ],
  },
  {
    type: 'category',
    label: 'RCCM',
    items: [
      'exam/rccm/guide',
    ],
  },
];

export const environmentSidebar: SidebarItem[] = [
  'environment/noise-evaluation/general/01',
  {
    type: 'category',
    label: '騒音に係る環境基準の評価マニュアル（道路に面する地域編）',
    link: {
      type: 'doc',
      id: 'environment/noise-evaluation/road/intro',
    },
    items: [
      'environment/noise-evaluation/road/intro',
      'environment/noise-evaluation/road/evaluation',
      'environment/noise-evaluation/road/measurement',
    ],
  },
];

export const sidebars: SidebarConfig = {
  examSidebar,
  generalSidebar,
  roadSidebar,
  riverSidebar,
  lowSidebar,
  portSidebar,
  environmentSidebar,
};

// Navbar items mapping to sidebar IDs
// 1級土木施工管理技士に特化した5項目構成
// 非1級土木コンテンツ（道路法・河川・港湾・環境・法律等）はナビバーから除外するが、
// ページとサイドバーは維持しSEOインデックスを保持する
export const navbarItems = [
  { label: '試験ガイド', sidebarId: 'examSidebar', href: '/docs/exam/civil-construction-1/guide' },
  { label: '土木一般', sidebarId: 'generalSidebar', href: '/docs/civil-general' },
  { label: '施工管理', sidebarId: 'constructionManagementSidebar', href: '/docs/construction-management' },
  { label: '過去問', sidebarId: 'examSidebar', href: '/docs/exam/civil-construction-1/primary' },
];

// Build breadcrumb trail from sidebar tree to the current path
export function buildBreadcrumbs(
  currentPath: string,
  items: SidebarItem[],
  sidebarId?: string,
  titleMap: Record<string, string> = {}
): { label: string; href?: string }[] {
  // Add top-level category from navbarItems
  const navItem = navbarItems.find((n) => n.sidebarId === sidebarId);
  const trail: { label: string; href?: string }[] = [];
  if (navItem) {
    trail.push({ label: navItem.label, href: navItem.href });
  }

  // Recursively find the path through the sidebar tree
  function findTrail(items: SidebarItem[], path: string): { label: string; href?: string }[] | null {
    for (const item of items) {
      if (typeof item === 'string') {
        const itemPath = docIdToPath(item);
        if (itemPath === path) {
          const label = titleMap[item] || item.split('/').pop() || item;
          return [{ label }];
        }
      } else if (item.type === 'category') {
        const linkPath = getSidebarItemPath(item);
        if (linkPath === path) {
          return [{ label: item.label }];
        }
        const childTrail = findTrail(item.items, path);
        if (childTrail) {
          return [{ label: item.label, href: linkPath }, ...childTrail];
        }
      }
    }
    return null;
  }

  const innerTrail = findTrail(items, currentPath);
  if (innerTrail) {
    trail.push(...innerTrail);
  }

  return trail;
}

// Get all generated-index slugs
export function getGeneratedIndexSlugs(): { slug: string; title: string; items: SidebarItem[] }[] {
  const results: { slug: string; title: string; items: SidebarItem[] }[] = [];

  function traverse(items: SidebarItem[]) {
    for (const item of items) {
      if (typeof item !== 'string' && item.type === 'category') {
        if (item.link?.type === 'generated-index') {
          results.push({
            slug: item.link.slug,
            title: item.link.title,
            items: item.items,
          });
        }
        traverse(item.items);
      }
    }
  }

  for (const items of Object.values(sidebars)) {
    traverse(items);
  }

  return results;
}
