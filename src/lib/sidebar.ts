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
    label: '技術士（総合技術監理部門）',
    link: {
      type: 'generated-index',
      title: '技術士試験対策（総合技術監理部門）',
      slug: 'exam/cem',
    },
    items: [
      'exam/cem/index',
      'exam/cem/schedule-2025',
      'exam/cem/exam-structure',
      'exam/cem/study-plan',
      {
        type: 'category',
        label: '5つの管理技術',
        items: [
          'exam/cem/five-fields/safety',
          'exam/cem/five-fields/social-environment',
          'exam/cem/five-fields/economics',
          'exam/cem/five-fields/information',
          'exam/cem/five-fields/human-resources',
        ],
      },
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
};

// Navbar items mapping to sidebar IDs
// 1級土木施工管理技士に特化した5項目構成
// 非1級土木コンテンツ（道路法・河川・港湾・環境・法律等）はナビバーから除外するが、
// ページとサイドバーは維持しSEOインデックスを保持する
export const navbarItems = [
  { label: '試験ガイド', sidebarId: 'examSidebar', href: '/docs/exam/civil-construction-1/guide' },
  { label: '土木一般', sidebarId: 'generalSidebar', href: '/docs/civil-general' },
  { label: '施工管理', sidebarId: 'constructionManagementSidebar', href: '/docs/construction-management' },
  { label: '過去問', sidebarId: 'examPrimarySidebar', href: '/docs/exam/civil-construction-1/primary' },
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
