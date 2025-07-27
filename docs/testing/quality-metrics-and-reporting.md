# Quality Metrics and Reporting

## Overview

This document outlines the quality metrics collection, analysis, and reporting systems that provide visibility into the overall health and quality of the Resonant application development process.

## Automated Quality Reports

### Quality Metrics Dashboard

#### Comprehensive Quality Score

```typescript
// scripts/generate-quality-report.ts
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

interface QualityMetrics {
  coverage: {
    statements: number
    branches: number
    functions: number
    lines: number
  }
  codeQuality: {
    eslintErrors: number
    eslintWarnings: number
    typeErrors: number
  }
  security: {
    vulnerabilities: number
    licenseIssues: number
  }
  performance: {
    bundleSize: number
    lighthouseScore: number
  }
}

async function generateQualityReport(): Promise<QualityMetrics> {
  // Run tests and collect coverage
  const coverageResult = JSON.parse(
    execSync('npm run test:ci -- --coverage --json', { encoding: 'utf8' })
  )

  // Run ESLint
  const eslintResult = JSON.parse(
    execSync('npm run lint -- --format=json', { encoding: 'utf8' })
  )

  // Run TypeScript check
  const typeCheckResult = execSync('npm run typecheck', { encoding: 'utf8' })

  // Run security audit
  const auditResult = JSON.parse(
    execSync('npm audit --json', { encoding: 'utf8' })
  )

  // Analyze bundle
  const bundleStats = JSON.parse(
    execSync('npx next build --profile', { encoding: 'utf8' })
  )

  const metrics: QualityMetrics = {
    coverage: {
      statements:
        coverageResult.coverageMap.getCoverageSummary().statements.pct,
      branches: coverageResult.coverageMap.getCoverageSummary().branches.pct,
      functions: coverageResult.coverageMap.getCoverageSummary().functions.pct,
      lines: coverageResult.coverageMap.getCoverageSummary().lines.pct,
    },
    codeQuality: {
      eslintErrors: eslintResult.reduce(
        (acc, file) => acc + file.errorCount,
        0
      ),
      eslintWarnings: eslintResult.reduce(
        (acc, file) => acc + file.warningCount,
        0
      ),
      typeErrors: (typeCheckResult.match(/error TS/g) || []).length,
    },
    security: {
      vulnerabilities: auditResult.metadata.vulnerabilities.total,
      licenseIssues: 0, // Implement license checking
    },
    performance: {
      bundleSize: bundleStats.pages['/'].size,
      lighthouseScore: 0, // Implement Lighthouse score extraction
    },
  }

  // Generate report
  const report = `
# Quality Report
Generated: ${new Date().toISOString()}

## Test Coverage
- Statements: ${metrics.coverage.statements}%
- Branches: ${metrics.coverage.branches}%
- Functions: ${metrics.coverage.functions}%
- Lines: ${metrics.coverage.lines}%

## Code Quality
- ESLint Errors: ${metrics.codeQuality.eslintErrors}
- ESLint Warnings: ${metrics.codeQuality.eslintWarnings}
- TypeScript Errors: ${metrics.codeQuality.typeErrors}

## Security
- Vulnerabilities: ${metrics.security.vulnerabilities}
- License Issues: ${metrics.security.licenseIssues}

## Performance
- Bundle Size: ${metrics.performance.bundleSize} bytes
- Lighthouse Score: ${metrics.performance.lighthouseScore}%
`

  writeFileSync('quality-report.md', report)
  return metrics
}

if (require.main === module) {
  generateQualityReport().catch(console.error)
}
```

### Daily and Weekly Reports

#### Automated Report Generation

```javascript
// scripts/quality-reporter.js
const { Octokit } = require('@octokit/rest')
const { createReadStream } = require('fs')

class QualityReporter {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })
  }

  async generateDailyReport() {
    const metrics = await this.collectMetrics()
    const report = this.formatDailyReport(metrics)

    await this.sendToSlack(report, '#quality-daily')
    await this.createGitHubIssue('Daily Quality Report', report)
  }

  async generateWeeklyReport() {
    const weeklyMetrics = await this.collectWeeklyTrends()
    const report = this.formatWeeklyReport(weeklyMetrics)

    await this.sendToSlack(report, '#quality-weekly')
    await this.sendEmail(report, 'team-leads@company.com')
  }

  async collectMetrics() {
    // Collect from various sources
    const coverage = await this.getCoverageMetrics()
    const security = await this.getSecurityMetrics()
    const performance = await this.getPerformanceMetrics()
    const codeQuality = await this.getCodeQualityMetrics()

    return { coverage, security, performance, codeQuality }
  }

  formatDailyReport(metrics) {
    return `
📊 **Daily Quality Report** - ${new Date().toDateString()}

## Coverage
- Overall: ${metrics.coverage.overall}% (${this.getTrend(metrics.coverage.trend)})
- Critical Components: ${metrics.coverage.critical}%

## Security
- Vulnerabilities: ${metrics.security.count} (${metrics.security.severity})
- License Issues: ${metrics.security.licenses}

## Performance
- Bundle Size: ${metrics.performance.bundleSize}kb
- Lighthouse Score: ${metrics.performance.lighthouse}

## Code Quality
- ESLint Issues: ${metrics.codeQuality.eslint}
- TypeScript Errors: ${metrics.codeQuality.typescript}

${this.getActionItems(metrics)}
`
  }

  getTrend(trendValue) {
    if (trendValue > 0) return `📈 +${trendValue}%`
    if (trendValue < 0) return `📉 ${trendValue}%`
    return `➡️ no change`
  }

  getActionItems(metrics) {
    const items = []

    if (metrics.coverage.overall < 80) {
      items.push('⚠️ Coverage below 80% - review test gaps')
    }

    if (metrics.security.count > 0) {
      items.push(
        '🔒 Security vulnerabilities found - immediate attention required'
      )
    }

    if (metrics.performance.lighthouse < 80) {
      items.push('⚡ Performance below target - optimize critical paths')
    }

    return items.length > 0
      ? `\n## Action Items\n${items.map(item => `- ${item}`).join('\n')}`
      : '\n✅ All quality metrics within targets'
  }

  async sendToSlack(message, channel) {
    if (!process.env.SLACK_WEBHOOK) return

    await fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        text: message,
        username: 'Quality Bot',
        icon_emoji: ':bar_chart:',
      }),
    })
  }
}
```

## Test Coverage Analysis

### Coverage Tracking and Trends

#### Coverage Monitoring System

```typescript
// src/lib/testing/coverage-monitor.ts
export interface CoverageReport {
  overall: number
  statements: number
  branches: number
  functions: number
  lines: number
  uncoveredLines: string[]
  files: FileCoverage[]
}

export interface FileCoverage {
  path: string
  coverage: number
  statements: number
  branches: number
  functions: number
  lines: number
  isNew: boolean
  trend: number
}

export class CoverageMonitor {
  async generateCoverageReport(): Promise<CoverageReport> {
    const rawCoverage = await this.runCoverageAnalysis()
    const previousCoverage = await this.getPreviousCoverage()

    return this.analyzeCoverageData(rawCoverage, previousCoverage)
  }

  async identifyUncoveredCriticalPaths(): Promise<string[]> {
    const coverage = await this.generateCoverageReport()

    return coverage.files
      .filter(file => file.coverage < 80 && this.isCriticalFile(file.path))
      .map(file => file.path)
  }

  private isCriticalFile(path: string): boolean {
    const criticalPatterns = [
      /src\/app\/.*\/page\.tsx$/,
      /src\/components\/features\/.*\/.*\.tsx$/,
      /src\/lib\/.*\.ts$/,
      /convex\/.*\.ts$/,
    ]

    return criticalPatterns.some(pattern => pattern.test(path))
  }

  async generateCoverageHotspots(): Promise<
    Array<{
      file: string
      coverage: number
      priority: 'high' | 'medium' | 'low'
      reason: string
    }>
  > {
    const coverage = await this.generateCoverageReport()

    return coverage.files
      .filter(file => file.coverage < 80)
      .map(file => ({
        file: file.path,
        coverage: file.coverage,
        priority: this.calculatePriority(file),
        reason: this.getCoverageReasonAnalysis(file),
      }))
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
  }

  private calculatePriority(file: FileCoverage): 'high' | 'medium' | 'low' {
    if (this.isCriticalFile(file.path) && file.coverage < 60) {
      return 'high'
    }
    if (file.coverage < 50) {
      return 'medium'
    }
    return 'low'
  }
}
```

### Coverage Quality Gates

#### Differential Coverage Analysis

```typescript
// scripts/coverage-gate.ts
interface CoverageGate {
  overall: number
  newCode: number
  criticalFiles: number
  regressionThreshold: number
}

const coverageGates: CoverageGate = {
  overall: 80,
  newCode: 90,
  criticalFiles: 95,
  regressionThreshold: -2, // Don't allow more than 2% regression
}

export async function validateCoverageGates(): Promise<{
  passed: boolean
  violations: string[]
  recommendations: string[]
}> {
  const current = await getCoverageMetrics()
  const previous = await getPreviousCoverageMetrics()

  const violations: string[] = []
  const recommendations: string[] = []

  // Check overall coverage
  if (current.overall < coverageGates.overall) {
    violations.push(
      `Overall coverage ${current.overall}% below ${coverageGates.overall}%`
    )
    recommendations.push('Add tests for uncovered critical paths')
  }

  // Check new code coverage
  const newCodeCoverage = await getNewCodeCoverage()
  if (newCodeCoverage < coverageGates.newCode) {
    violations.push(
      `New code coverage ${newCodeCoverage}% below ${coverageGates.newCode}%`
    )
    recommendations.push('Ensure all new code has comprehensive tests')
  }

  // Check for regressions
  const regression = current.overall - previous.overall
  if (regression < coverageGates.regressionThreshold) {
    violations.push(`Coverage regression of ${Math.abs(regression)}%`)
    recommendations.push('Review removed or modified tests')
  }

  // Check critical files
  const criticalFilesCoverage = await getCriticalFilesCoverage()
  if (criticalFilesCoverage < coverageGates.criticalFiles) {
    violations.push(
      `Critical files coverage ${criticalFilesCoverage}% below ${coverageGates.criticalFiles}%`
    )
    recommendations.push(
      'Focus testing efforts on business-critical components'
    )
  }

  return {
    passed: violations.length === 0,
    violations,
    recommendations,
  }
}
```

## Performance Metrics Tracking

### Performance Budget Monitoring

#### Continuous Performance Monitoring

```typescript
// src/lib/monitoring/performance-budget.ts
export interface PerformanceBudget {
  firstContentfulPaint: number
  largestContentfulPaint: number
  totalBlockingTime: number
  cumulativeLayoutShift: number
  bundleSizes: {
    main: number
    vendor: number
    css: number
  }
}

export const performanceBudgets: PerformanceBudget = {
  firstContentfulPaint: 1800, // 1.8s
  largestContentfulPaint: 2500, // 2.5s
  totalBlockingTime: 300, // 300ms
  cumulativeLayoutShift: 0.1, // 0.1
  bundleSizes: {
    main: 250000, // 250kb
    vendor: 500000, // 500kb
    css: 50000, // 50kb
  },
}

export class PerformanceBudgetMonitor {
  async validateBudgets(): Promise<{
    passed: boolean
    violations: Array<{
      metric: string
      actual: number
      budget: number
      severity: 'error' | 'warning'
    }>
  }> {
    const metrics = await this.collectPerformanceMetrics()
    const violations = []

    // Web Vitals checks
    if (metrics.fcp > performanceBudgets.firstContentfulPaint) {
      violations.push({
        metric: 'First Contentful Paint',
        actual: metrics.fcp,
        budget: performanceBudgets.firstContentfulPaint,
        severity: 'error' as const,
      })
    }

    if (metrics.lcp > performanceBudgets.largestContentfulPaint) {
      violations.push({
        metric: 'Largest Contentful Paint',
        actual: metrics.lcp,
        budget: performanceBudgets.largestContentfulPaint,
        severity: 'error' as const,
      })
    }

    if (metrics.tbt > performanceBudgets.totalBlockingTime) {
      violations.push({
        metric: 'Total Blocking Time',
        actual: metrics.tbt,
        budget: performanceBudgets.totalBlockingTime,
        severity: 'warning' as const,
      })
    }

    if (metrics.cls > performanceBudgets.cumulativeLayoutShift) {
      violations.push({
        metric: 'Cumulative Layout Shift',
        actual: metrics.cls,
        budget: performanceBudgets.cumulativeLayoutShift,
        severity: 'error' as const,
      })
    }

    // Bundle size checks
    const bundleSizes = await this.getBundleSizes()
    Object.entries(performanceBudgets.bundleSizes).forEach(
      ([bundle, budget]) => {
        const actual = bundleSizes[bundle]
        if (actual > budget) {
          violations.push({
            metric: `${bundle} bundle size`,
            actual,
            budget,
            severity: actual > budget * 1.2 ? 'error' : 'warning',
          })
        }
      }
    )

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      violations,
    }
  }

  async generatePerformanceReport(): Promise<string> {
    const budgetCheck = await this.validateBudgets()
    const trends = await this.getPerformanceTrends()

    return `
# Performance Report
Generated: ${new Date().toISOString()}

## Budget Compliance
${budgetCheck.passed ? '✅ All budgets met' : '❌ Budget violations detected'}

${budgetCheck.violations
  .map(
    v =>
      `- ${v.metric}: ${v.actual} (budget: ${v.budget}) ${v.severity === 'error' ? '🚨' : '⚠️'}`
  )
  .join('\n')}

## Performance Trends
- FCP Trend: ${trends.fcp}
- LCP Trend: ${trends.lcp}
- Bundle Size Trend: ${trends.bundleSize}

## Recommendations
${this.generateRecommendations(budgetCheck.violations)}
`
  }

  private generateRecommendations(violations: any[]): string {
    const recommendations = []

    violations.forEach(violation => {
      switch (violation.metric) {
        case 'First Contentful Paint':
          recommendations.push('- Optimize critical resource loading')
          recommendations.push('- Implement resource hints (preload, prefetch)')
          break
        case 'Largest Contentful Paint':
          recommendations.push('- Optimize largest content elements')
          recommendations.push(
            '- Implement lazy loading for below-fold content'
          )
          break
        case 'Total Blocking Time':
          recommendations.push('- Split large JavaScript bundles')
          recommendations.push('- Optimize third-party scripts')
          break
        case 'main bundle size':
          recommendations.push('- Implement code splitting')
          recommendations.push('- Remove unused dependencies')
          break
      }
    })

    return recommendations.length > 0
      ? recommendations.join('\n')
      : '✅ No specific recommendations - performance is within targets'
  }
}
```

## Quality Trend Analysis

### Historical Quality Metrics

#### Quality Score Evolution

```typescript
// src/lib/analytics/quality-trends.ts
export interface QualitySnapshot {
  timestamp: string
  coverage: number
  performance: number
  security: number
  maintainability: number
  reliability: number
  overallScore: number
}

export class QualityTrendAnalyzer {
  async generateTrendReport(days: number = 30): Promise<{
    snapshots: QualitySnapshot[]
    trends: {
      coverage: 'improving' | 'declining' | 'stable'
      performance: 'improving' | 'declining' | 'stable'
      security: 'improving' | 'declining' | 'stable'
    }
    insights: string[]
  }> {
    const snapshots = await this.getQualitySnapshots(days)
    const trends = this.analyzeTrends(snapshots)
    const insights = this.generateInsights(snapshots, trends)

    return { snapshots, trends, insights }
  }

  private analyzeTrends(snapshots: QualitySnapshot[]): any {
    if (snapshots.length < 2) {
      return { coverage: 'stable', performance: 'stable', security: 'stable' }
    }

    const first = snapshots[0]
    const last = snapshots[snapshots.length - 1]

    return {
      coverage: this.determineTrend(first.coverage, last.coverage),
      performance: this.determineTrend(first.performance, last.performance),
      security: this.determineTrend(first.security, last.security),
    }
  }

  private determineTrend(
    start: number,
    end: number
  ): 'improving' | 'declining' | 'stable' {
    const change = ((end - start) / start) * 100

    if (change > 2) return 'improving'
    if (change < -2) return 'declining'
    return 'stable'
  }

  private generateInsights(
    snapshots: QualitySnapshot[],
    trends: any
  ): string[] {
    const insights = []

    if (trends.coverage === 'declining') {
      insights.push(
        'Test coverage has declined - consider implementing coverage gates'
      )
    }

    if (trends.performance === 'declining') {
      insights.push(
        'Performance metrics trending downward - review recent changes'
      )
    }

    if (trends.security === 'improving') {
      insights.push(
        'Security posture has improved - great work on vulnerability resolution'
      )
    }

    // Analyze volatility
    const coverageVolatility = this.calculateVolatility(
      snapshots.map(s => s.coverage)
    )
    if (coverageVolatility > 5) {
      insights.push(
        'Coverage metrics are volatile - consider more stable testing practices'
      )
    }

    return insights
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0

    const mean = values.reduce((a, b) => a + b) / values.length
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      values.length

    return Math.sqrt(variance)
  }
}
```

---

**Related Documentation:**

- [Production Monitoring](production-monitoring.md) - Runtime metrics collection
- [QA Philosophy & Strategy](qa-philosophy-and-strategy.md) - Quality objectives
- [Automated Code Review](automated-code-review.md) - Code quality automation

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025
