import { readFileSync, existsSync, readdirSync } from 'node:fs'

const ROOT = '/Users/minamidaisuke/doboku-note'
const MAP = `${ROOT}/.claude/plans/civil-practice-theme-map.md`
const SRC = `${ROOT}/content/sources/textbook/土木施工実務ノート`

// マップの計画スラッグ → 実際に書いた統合スラッグ
const MERGED = {
  'backfill-and-removal': 'backfill-river-excavation',
  'river-channel-excavation': 'backfill-river-excavation',
  'slope-drainage-planning': 'slope-drainage-monitoring',
  'embankment-monitoring': 'slope-drainage-monitoring',
  'large-sandbag-method': 'soil-improvement-sandbag',
  'soil-classification-improvement': 'soil-improvement-sandbag',
  'road-terms-guardrail': 'road-fixtures-precast',
  'precast-product-layout': 'road-fixtures-precast',
  'river-work-season': 'river-park-erosion-control',
  'park-erosion-control-work': 'river-park-erosion-control',
  'quality-control-chart': 'quality-record-site-bcp',
  'site-bcp-weekly-stance': 'quality-record-site-bcp',
  'preventive-maintenance': 'preventive-maintenance-diagnosis',
  'concrete-deterioration-diagnosis': 'preventive-maintenance-diagnosis',
  'schedule-progress-control': 'schedule-and-road-permit',
  'preparation-cleanup-period': 'schedule-and-road-permit',
  'road-use-permit': 'schedule-and-road-permit',
  'stacking-heat-safety': 'stacking-heat-machine-safety',
  'backhoe-lifting-work': 'stacking-heat-machine-safety',
  'neighborhood-complaints': 'environment-neighborhood',
  'site-co2-reduction': 'environment-neighborhood',
  'cost-control-procedure': 'cost-and-design-change',
  'design-change-negotiation': 'cost-and-design-change',
  'temporary-beam-deflection': 'lifting-equipment-selection',
  'snow-removal-operations': 'sheet-pile-snow-coating',
  'sheet-pile-driving-methods': 'sheet-pile-snow-coating',
  'waterproof-coating-layers': 'sheet-pile-snow-coating',
  'construction-checklist-design': 'checklist-shoring-buoyancy',
  'shoring-ground-support': 'checklist-shoring-buoyancy',
  'pipe-buoyancy-countermeasure': 'checklist-shoring-buoyancy',
}

const map = readFileSync(MAP, 'utf8')
const planned = []
for (const m of map.matchAll(/^\| ([A-J]\d+) \| `([a-z0-9-]+)` \| ([^|]+) \| ([^|]+) \|$/gm)) {
  planned.push({ id: m[1], slug: m[2], title: m[3].trim(), items: m[4].trim() })
}

const written = new Set(
  readdirSync(`${ROOT}/content/site/civil-practice`).filter((d) =>
    existsSync(`${ROOT}/content/site/civil-practice/${d}/article.mdx`)
  )
)

const covered = []
const missing = []
for (const p of planned) {
  const actual = written.has(p.slug) ? p.slug : MERGED[p.slug]
  if (actual && written.has(actual)) covered.push({ ...p, actual })
  else missing.push(p)
}

// 160項目のカバレッジ
const idx = readFileSync(`${SRC}/00_キーワード一覧.md`, 'utf8')
const allItems = new Set()
for (const m of idx.matchAll(/^\|\s*(\d+)-(\d+)\s*\|/gm)) allItems.add(`${m[1]}-${m[2]}`)

const coveredItems = new Set()
for (const p of covered) {
  for (const tok of p.items.split(',').map((t) => t.trim())) {
    const range = /^(\d+)-(\d+)〜(?:\d+-)?(\d+)$/.exec(tok)
    if (range) {
      const ch = Number(range[1])
      for (let i = Number(range[2]); i <= Number(range[3]); i++) coveredItems.add(`${ch}-${i}`)
    } else if (/^\d+-\d+$/.test(tok)) coveredItems.add(tok)
  }
}

const num = (k) => k.split('-').map(Number)
const sortK = (a, b) => num(a)[0] - num(b)[0] || num(a)[1] - num(b)[1]
const uncoveredItems = [...allItems].filter((k) => !coveredItems.has(k)).sort(sortK)

console.log(`計画スロット ${planned.length} / 記事化済み ${written.size} 本`)
console.log(`\n■ 未着手の計画スロット (${missing.length}):`)
for (const m of missing) console.log(`  ${m.id} ${m.slug} — ${m.title}（項目 ${m.items}）`)
console.log(`\n■ 160項目のカバレッジ: ${coveredItems.size}/${allItems.size}`)
console.log(`  未カバー (${uncoveredItems.length}): ${uncoveredItems.join(', ') || 'なし'}`)
