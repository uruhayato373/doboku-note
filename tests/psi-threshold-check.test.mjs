import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const SCRIPT = '.claude/scripts/psi-threshold-check.mjs'

function runWith(result) {
  const dir = mkdtempSync(join(tmpdir(), 'psi-threshold-test-'))
  writeFileSync(join(dir, 'psi-batch-2026-08-21T00-00-00.json'), JSON.stringify({ results: [result] }))
  const run = spawnSync(process.execPath, [SCRIPT, '--json', '--state-dir', dir], { encoding: 'utf8' })
  rmSync(dir, { recursive: true, force: true })
  return { ...run, json: JSON.parse(run.stdout) }
}

const base = {
  url: 'https://doboku-note.com/',
  strategy: 'mobile',
  scores: { performance: 50, accessibility: 95, best_practices: 100, seo: 100 },
  lab_data: { LCP_ms: 6000, CLS: 0.01, FCP_ms: 3000, TBT_ms: 100 },
  field_data: {
    LCP: { percentile: 1200, category: 'FAST' },
    INP: { percentile: 100, category: 'FAST' },
    CLS: { percentile: 0.03, category: 'FAST' },
    TTFB: { percentile: 500, category: 'FAST' },
  },
}

test('lab-only violations stay diagnostic and do not fail CI', () => {
  const run = runWith(base)
  assert.equal(run.status, 0)
  assert.ok(run.json.violations.some((v) => v.type === 'lab'))
  assert.deepEqual(run.json.gate_violations, [])
})

test('non-FAST field category fails CI', () => {
  const run = runWith({
    ...base,
    field_data: { ...base.field_data, LCP: { percentile: 3100, category: 'AVERAGE' } },
  })
  assert.equal(run.status, 1)
  assert.ok(run.json.gate_violations.some((v) => v.type === 'field-category' && v.metric === 'LCP (field)'))
})

test('collection errors fail CI', () => {
  const run = runWith({ url: base.url, strategy: base.strategy, error: 'PSI API 503' })
  assert.equal(run.status, 1)
  assert.equal(run.json.gate_violations[0].type, 'coverage')
})

// ── DN-0158 診断 (1): field 判定不能の内訳 ──────────────────────────────
// CrUX が 0/N のとき「URL レベル閾値割れ (2)」と「origin にも無い (3)」を区別できないと
// primary_source を切り替えるべきかの判断材料が無い。fetch-psi-data が result に残す
// field_availability を threshold-check が集計し、--json と markdown の両方に出すことを固定する。

test('field-coverage violation carries field_availability and the DN-0158 (2) hint when only origin-level CrUX exists', () => {
  const run = runWith({
    url: base.url,
    strategy: base.strategy,
    scores: base.scores,
    lab_data: base.lab_data,
    field_data: null,
    field_availability: {
      url_level: false,
      origin_level: true,
      origin_fallback: true,
      url_overall_category: null,
      origin_overall_category: 'FAST',
    },
  })
  assert.equal(run.status, 1)
  const v = run.json.gate_violations.find((x) => x.type === 'field-coverage')
  assert.ok(v, 'field-coverage violation missing')
  assert.deepEqual(v.field_availability, { urlLevel: 0, originLevel: 1, neither: 0, unrecorded: 0, total: 1 })
  assert.match(v.detail, /origin レベル 1/)
  assert.match(v.detail, /DN-0158 \(2\)/)
})

test('batches recorded before field_availability existed are reported as unrecorded, not as (2)/(3)', () => {
  const run = runWith({
    url: base.url,
    strategy: base.strategy,
    scores: base.scores,
    lab_data: base.lab_data,
    field_data: null,
  })
  assert.equal(run.status, 1)
  const v = run.json.gate_violations.find((x) => x.type === 'field-coverage')
  assert.ok(v, 'field-coverage violation missing')
  assert.deepEqual(v.field_availability, { urlLevel: 0, originLevel: 0, neither: 0, unrecorded: 1, total: 1 })
  assert.match(v.detail, /フラグ未記録 1/)
  assert.match(v.detail, /導入前/)
  assert.doesNotMatch(v.detail, /DN-0158 \(2\)|DN-0158 \(3\)/)
})

test('countFieldAvailability partitions url-level / origin-level / neither / unrecorded', async () => {
  const { countFieldAvailability } = await import('../.claude/scripts/psi-threshold-check.mjs')
  const c = countFieldAvailability([
    { field_availability: { url_level: true, origin_level: true } },
    { field_availability: { url_level: false, origin_level: true } },
    { field_availability: { url_level: false, origin_level: false } },
    {},
  ])
  assert.deepEqual(c, { urlLevel: 1, originLevel: 1, neither: 1, unrecorded: 1, total: 4 })
})

test('extractFieldAvailability does not count an origin_fallback loadingExperience as URL-level CrUX', async () => {
  const { extractFieldAvailability } = await import('../.claude/scripts/fetch-psi-data.mjs')
  const fallback = extractFieldAvailability({
    loadingExperience: { origin_fallback: true, overall_category: 'FAST', metrics: { LARGEST_CONTENTFUL_PAINT_MS: {} } },
    originLoadingExperience: { overall_category: 'FAST', metrics: { LARGEST_CONTENTFUL_PAINT_MS: {} } },
  })
  assert.equal(fallback.url_level, false)
  assert.equal(fallback.origin_level, true)
  assert.equal(fallback.origin_fallback, true)
  assert.equal(fallback.origin_overall_category, 'FAST')

  const urlLevel = extractFieldAvailability({
    loadingExperience: { overall_category: 'AVERAGE', metrics: { CUMULATIVE_LAYOUT_SHIFT_SCORE: {} } },
  })
  assert.equal(urlLevel.url_level, true)
  assert.equal(urlLevel.origin_level, false)
  assert.equal(urlLevel.url_overall_category, 'AVERAGE')

  const nothing = extractFieldAvailability({ loadingExperience: { metrics: {} } })
  assert.deepEqual(nothing, {
    url_level: false, origin_level: false, origin_fallback: false,
    url_overall_category: null, origin_overall_category: null,
  })
})
