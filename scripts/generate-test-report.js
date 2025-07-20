#!/usr/bin/env node

/**
 * Test Report Generation Script for CI/CD
 * Generates comprehensive test reports from Playwright results
 */

const fs = require('fs');
const path = require('path');
const { config } = require('dotenv');

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });

async function generateTestReport() {
  console.log('📊 Generating comprehensive test report...');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    commit: process.env.GITHUB_SHA || 'local',
    branch: process.env.GITHUB_REF_NAME || 'local',
    testResults: await gatherTestResults(),
    coverage: await gatherCoverageData(),
    performance: await gatherPerformanceMetrics(),
    summary: null
  };

  // Generate summary
  reportData.summary = generateSummary(reportData);

  // Write reports in multiple formats
  await writeJsonReport(reportData);
  await writeMarkdownReport(reportData);
  await writeHtmlReport(reportData);

  console.log('✅ Test report generation completed');
  return reportData;
}

async function gatherTestResults() {
  console.log('  📋 Gathering test results...');
  
  const testResultsDir = path.join(process.cwd(), 'test-results');
  const resultsData = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    testGroups: {
      auth: { total: 0, passed: 0, failed: 0 },
      userJourneys: { total: 0, passed: 0, failed: 0 },
      advancedFeatures: { total: 0, passed: 0, failed: 0 }
    },
    executionTime: null,
    errors: []
  };

  try {
    // Check if test results directory exists
    if (!fs.existsSync(testResultsDir)) {
      console.log('    ⚠️  No test results directory found');
      return resultsData;
    }

    // Look for Playwright JSON reports
    const reportFiles = fs.readdirSync(testResultsDir)
      .filter(file => file.endsWith('.json'));

    for (const file of reportFiles) {
      const filePath = path.join(testResultsDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Process Playwright test results
        if (data.suites) {
          for (const suite of data.suites) {
            for (const spec of suite.specs || []) {
              resultsData.totalTests++;
              
              const testPassed = spec.tests?.every(test => 
                test.results?.every(result => result.status === 'passed')
              );
              
              if (testPassed) {
                resultsData.passedTests++;
              } else {
                resultsData.failedTests++;
              }
            }
          }
        }
        
      } catch (error) {
        console.log(`    ❌ Error reading ${file}: ${error.message}`);
        resultsData.errors.push(`Failed to parse ${file}: ${error.message}`);
      }
    }

    console.log(`    ✅ Processed ${reportFiles.length} test result files`);
    
  } catch (error) {
    console.log(`    ❌ Error gathering test results: ${error.message}`);
    resultsData.errors.push(`Test results gathering failed: ${error.message}`);
  }

  return resultsData;
}

async function gatherCoverageData() {
  console.log('  📈 Gathering coverage data...');
  
  const coverageData = {
    statements: { total: 0, covered: 0, percentage: 0 },
    branches: { total: 0, covered: 0, percentage: 0 },
    functions: { total: 0, covered: 0, percentage: 0 },
    lines: { total: 0, covered: 0, percentage: 0 }
  };

  try {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    
    if (fs.existsSync(coveragePath)) {
      const coverageReport = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      
      if (coverageReport.total) {
        const total = coverageReport.total;
        coverageData.statements = {
          total: total.statements.total,
          covered: total.statements.covered,
          percentage: total.statements.pct
        };
        coverageData.branches = {
          total: total.branches.total,
          covered: total.branches.covered,
          percentage: total.branches.pct
        };
        coverageData.functions = {
          total: total.functions.total,
          covered: total.functions.covered,
          percentage: total.functions.pct
        };
        coverageData.lines = {
          total: total.lines.total,
          covered: total.lines.covered,
          percentage: total.lines.pct
        };
      }
      
      console.log('    ✅ Coverage data loaded');
    } else {
      console.log('    ⚠️  No coverage data found');
    }
    
  } catch (error) {
    console.log(`    ❌ Error gathering coverage data: ${error.message}`);
  }

  return coverageData;
}

async function gatherPerformanceMetrics() {
  console.log('  ⚡ Gathering performance metrics...');
  
  const performanceData = {
    averageTestDuration: 0,
    slowestTest: null,
    fastestTest: null,
    totalExecutionTime: 0,
    resourceUsage: {
      memory: null,
      cpu: null
    }
  };

  // In a real implementation, we would parse actual performance data
  // For now, we'll return placeholder data
  
  return performanceData;
}

function generateSummary(reportData) {
  const { testResults } = reportData;
  
  const passRate = testResults.totalTests > 0 
    ? (testResults.passedTests / testResults.totalTests) * 100
    : 0;

  const status = passRate === 100 ? 'PASSED' : passRate >= 90 ? 'WARNING' : 'FAILED';
  
  return {
    status,
    passRate: passRate.toFixed(1),
    totalTests: testResults.totalTests,
    passedTests: testResults.passedTests,
    failedTests: testResults.failedTests,
    hasErrors: testResults.errors.length > 0
  };
}

async function writeJsonReport(reportData) {
  const reportPath = path.join(process.cwd(), 'test-results', 'comprehensive-report.json');
  
  // Ensure directory exists
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`  💾 JSON report written to: ${reportPath}`);
}

async function writeMarkdownReport(reportData) {
  const { summary, testResults, coverage } = reportData;
  
  const markdown = `# Test Execution Report

## Summary

- **Status**: ${summary.status}
- **Pass Rate**: ${summary.passRate}%
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests}
- **Failed**: ${summary.failedTests}
- **Generated**: ${reportData.timestamp}
- **Environment**: ${reportData.environment}
- **Branch**: ${reportData.branch}
- **Commit**: ${reportData.commit.substring(0, 8)}

## Test Results

### Overall Results
- ✅ **Passed**: ${testResults.passedTests}
- ❌ **Failed**: ${testResults.failedTests}
- ⏭️ **Skipped**: ${testResults.skippedTests}

### Test Groups
- **Authentication**: ${testResults.testGroups.auth.passed}/${testResults.testGroups.auth.total}
- **User Journeys**: ${testResults.testGroups.userJourneys.passed}/${testResults.testGroups.userJourneys.total}
- **Advanced Features**: ${testResults.testGroups.advancedFeatures.passed}/${testResults.testGroups.advancedFeatures.total}

## Coverage

- **Statements**: ${coverage.statements.percentage}% (${coverage.statements.covered}/${coverage.statements.total})
- **Branches**: ${coverage.branches.percentage}% (${coverage.branches.covered}/${coverage.branches.total})
- **Functions**: ${coverage.functions.percentage}% (${coverage.functions.covered}/${coverage.functions.total})
- **Lines**: ${coverage.lines.percentage}% (${coverage.lines.covered}/${coverage.lines.total})

${testResults.errors.length > 0 ? `## Errors

${testResults.errors.map(error => `- ${error}`).join('\n')}
` : ''}

---
*Report generated by Resonant Test Automation System*
`;

  const reportPath = path.join(process.cwd(), 'test-results', 'test-report.md');
  fs.writeFileSync(reportPath, markdown);
  console.log(`  📝 Markdown report written to: ${reportPath}`);
}

async function writeHtmlReport(reportData) {
  const { summary } = reportData;
  
  const statusColor = summary.status === 'PASSED' ? '#22c55e' : 
                     summary.status === 'WARNING' ? '#f59e0b' : '#ef4444';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - Resonant</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .status { display: inline-block; padding: 8px 20px; border-radius: 20px; color: white; font-weight: bold; background: ${statusColor}; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor}; }
        .card h3 { margin: 0 0 10px 0; color: #374151; }
        .metric { font-size: 2em; font-weight: bold; color: ${statusColor}; }
        .details { margin-top: 30px; }
        .timestamp { color: #6b7280; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Execution Report</h1>
            <div class="status">${summary.status}</div>
            <p class="timestamp">Generated: ${reportData.timestamp}</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>Pass Rate</h3>
                <div class="metric">${summary.passRate}%</div>
            </div>
            <div class="card">
                <h3>Total Tests</h3>
                <div class="metric">${summary.totalTests}</div>
            </div>
            <div class="card">
                <h3>Passed</h3>
                <div class="metric">${summary.passedTests}</div>
            </div>
            <div class="card">
                <h3>Failed</h3>
                <div class="metric">${summary.failedTests}</div>
            </div>
        </div>
        
        <div class="details">
            <h2>Environment Details</h2>
            <p><strong>Environment:</strong> ${reportData.environment}</p>
            <p><strong>Branch:</strong> ${reportData.branch}</p>
            <p><strong>Commit:</strong> ${reportData.commit}</p>
        </div>
    </div>
</body>
</html>`;

  const reportPath = path.join(process.cwd(), 'test-results', 'test-report.html');
  fs.writeFileSync(reportPath, html);
  console.log(`  🌐 HTML report written to: ${reportPath}`);
}

// Run if called directly
if (require.main === module) {
  generateTestReport()
    .then(() => {
      console.log('🎉 Test report generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Report generation crashed:', error);
      process.exit(1);
    });
}

module.exports = { generateTestReport };