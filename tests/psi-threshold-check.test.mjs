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
