#!/usr/bin/env node
/**
 * Phase 5.5 — Lighthouse performance budget gate.
 *
 * Runs Lighthouse against a deployed preview/production URL and asserts the
 * plan's budgets (LCP <= 2.5s, CLS <= 0.1, TBT <= 300ms, performance >= 0.85).
 * Prints a machine-readable JSON summary to stdout; a missing/unmeasurable
 * metric counts as a breach. Exits 0 on pass, 1 on budget breach, 2 on error.
 *
 * Usage:
 *   node scripts/lighthouse-budget.mjs <url> [--output=lh-report.json]
 *   LIGHTHOUSE_URL=https://angisoft.co.ke pnpm perf:lighthouse
 *
 * Chrome is discovered automatically (or via CHROME_PATH). Use a *deployed*
 * URL — a prerendered/static response has no server spans but is exactly what
 * Lighthouse should measure for these field metrics.
 */
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const BUDGETS = Object.freeze({
  lcpMs: { audit: 'largest-contentful-paint', max: 2500, comparison: '<=', unit: 'ms' },
  cls: { audit: 'cumulative-layout-shift', max: 0.1, comparison: '<=', unit: 'ratio' },
  tbtMs: { audit: 'total-blocking-time', max: 300, comparison: '<=', unit: 'ms' },
  performanceScore: { category: 'performance', min: 0.85, comparison: '>=', unit: 'ratio' },
})

const USAGE = `Usage: node scripts/lighthouse-budget.mjs <url> [--output=report.json]
  <url>            Preview/production URL to audit (or set LIGHTHOUSE_URL)
  --url=<url>      Same as the positional argument
  --output=<file>  Optional path for the full Lighthouse JSON report
  --help           Show this message

Budgets: LCP <= 2500ms, CLS <= 0.1, TBT <= 300ms, performance score >= 0.85.`

function parseArgs(argv) {
  const options = { url: process.env.LIGHTHOUSE_URL || '', output: '', help: false }
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true
    else if (arg.startsWith('--url=')) options.url = arg.slice('--url='.length)
    else if (arg.startsWith('--output=')) options.output = arg.slice('--output='.length)
    else if (!arg.startsWith('-') && !options.url) options.url = arg
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

function normalizeUrl(raw) {
  if (!raw) throw new Error('A URL is required (positional, --url=, or LIGHTHOUSE_URL)')
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(`Invalid URL: ${raw}`)
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Only http(s) URLs are supported: ${raw}`)
  }
  return parsed.href
}

const numericValue = (lhr, auditId) => {
  const value = lhr?.audits?.[auditId]?.numericValue
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const round = (value, digits) =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(digits)) : null

/** Evaluate a raw Lighthouse Result (LHR). Exported to allow fixture-based tests. */
export function evaluate(lhr, requestedUrl) {
  const metrics = {
    lcpMs: round(numericValue(lhr, BUDGETS.lcpMs.audit), 1),
    cls: round(numericValue(lhr, BUDGETS.cls.audit), 4),
    tbtMs: round(numericValue(lhr, BUDGETS.tbtMs.audit), 1),
    performanceScore: round(lhr?.categories?.performance?.score ?? null, 4),
  }

  const violations = []
  const checks = [
    { metric: 'lcpMs', budget: BUDGETS.lcpMs.max, unit: 'ms' },
    { metric: 'cls', budget: BUDGETS.cls.max, unit: 'ratio' },
    { metric: 'tbtMs', budget: BUDGETS.tbtMs.max, unit: 'ms' },
    { metric: 'performanceScore', budget: BUDGETS.performanceScore.min, unit: 'ratio' },
  ]

  for (const check of checks) {
    const actual = metrics[check.metric]
    const limit = check.budget
    const passes =
      actual !== null &&
      (check.metric === 'performanceScore' ? actual >= limit : actual <= limit)
    if (!passes) {
      violations.push({
        metric: check.metric,
        actual,
        budget: limit,
        comparison: check.metric === 'performanceScore' ? '>=' : '<=',
        unit: check.unit,
        reason: actual === null ? 'metric unavailable in LHR' : 'budget exceeded',
      })
    }
  }

  return {
    requestedUrl,
    finalUrl: lhr?.finalDisplayedUrl ?? null,
    lighthouseVersion: lhr?.lighthouseVersion ?? null,
    fetchTime: lhr?.fetchTime ?? null,
    settings: {
      formFactor: lhr?.configSettings?.formFactor ?? null,
      throttlingMethod: lhr?.configSettings?.throttlingMethod ?? null,
    },
    budgets: {
      lcpMs: { max: BUDGETS.lcpMs.max, unit: 'ms' },
      cls: { max: BUDGETS.cls.max, unit: 'ratio' },
      tbtMs: { max: BUDGETS.tbtMs.max, unit: 'ms' },
      performanceScore: { min: BUDGETS.performanceScore.min, unit: 'ratio' },
    },
    metrics,
    passed: violations.length === 0,
    violations,
  }
}

async function main() {
  // Loaded lazily so `evaluate()` can be unit-tested with fixture LHRs
  // without a Chrome binary or the launcher dependency present.
  const [{ default: lighthouse }, chromeLauncher] = await Promise.all([
    import('lighthouse'),
    import('chrome-launcher'),
  ])
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(USAGE)
    return
  }
  const url = normalizeUrl(options.url)
  const chrome = await chromeLauncher.launch({
    // chrome-launcher honours CHROME_PATH and adds its own measurement-safe
    // default flags (fresh profile, remote debugging port, etc.).
    chromeFlags: [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      // Chrome's HTTPS-first upgrade turns local http:// previews into an
      // interstitial; the budget script supports preview/production URLs.
      '--disable-features=HttpsFirstMode,HttpsUpgrades',
    ],
    logLevel: 'error',
  })
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'silent',
      onlyCategories: ['performance'],
    })
    if (!result?.lhr) throw new Error('Lighthouse returned no LHR')
    if (result.lhr.runtimeError) {
      throw new Error(`Lighthouse runtime error: ${result.lhr.runtimeError.message ?? 'unknown'}`)
    }
    if (options.output && typeof result.report === 'string') {
      writeFileSync(options.output, result.report)
    }
    const summary = evaluate(result.lhr, url)
    console.log(JSON.stringify(summary, null, 2))
    process.exitCode = summary.passed ? 0 : 1
  } finally {
    await chrome.kill()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`lighthouse-budget: ${error?.message ?? String(error)}`)
    process.exitCode = 2
  })
}
