#!/usr/bin/env node

/**
 * Test Performance Monitoring System
 * Monitors and analyzes test execution performance metrics
 */

const fs = require('fs');
const path = require('path');
const { config } = require('dotenv');

// Load test environment variables
config({ path: path.resolve(process.cwd(), '.env.test') });

class TestPerformanceMonitor {
  constructor() {
    this.metricsFile = path.join(process.cwd(), 'test-results', 'performance-history.json');
    this.thresholds = {
      avgTestDuration: 5.0, // seconds
      totalExecutionTime: 900, // 15 minutes
      memoryUsage: 512, // MB
      cpuUsage: 80, // percent
      errorRate: 5.0, // percent
      timeoutRate: 2.0 // percent
    };
  }

  async collectMetrics(testResults) {
    console.log('📊 Collecting performance metrics...');
    
    const metrics = {
      timestamp: new Date().toISOString(),
      runId: this.generateRunId(),
      environment: process.env.NODE_ENV || 'test',
      branch: process.env.GITHUB_REF_NAME || 'local',
      commit: process.env.GITHUB_SHA || 'local',
      execution: this.calculateExecutionMetrics(testResults),
      resource: await this.collectResourceMetrics(),
      reliability: this.calculateReliabilityMetrics(testResults),
      trends: await this.calculateTrends()
    };

    await this.saveMetrics(metrics);
    await this.analyzePerformance(metrics);
    
    return metrics;
  }

  generateRunId() {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateExecutionMetrics(testResults) {
    const totalTests = testResults.totalTests || 0;
    const totalDuration = testResults.totalDuration || 0;
    
    return {
      totalTests,
      totalDuration,
      averageTestDuration: totalTests > 0 ? totalDuration / totalTests : 0,
      slowestTest: testResults.slowestTest || null,
      fastestTest: testResults.fastestTest || null,
      testsPerSecond: totalDuration > 0 ? totalTests / totalDuration : 0,
      parallelization: this.calculateParallelizationEfficiency(testResults)
    };
  }

  calculateParallelizationEfficiency(testResults) {
    // Calculate how efficiently tests are running in parallel
    const serialDuration = testResults.serialDuration || testResults.totalDuration;
    const parallelDuration = testResults.totalDuration || 0;
    
    if (serialDuration > 0 && parallelDuration > 0) {
      return {
        efficiency: (serialDuration / parallelDuration) * 100,
        timesSaved: serialDuration - parallelDuration,
        optimalWorkers: testResults.optimalWorkers || 1
      };
    }
    
    return { efficiency: 0, timesSaved: 0, optimalWorkers: 1 };
  }

  async collectResourceMetrics() {
    // In a real implementation, this would collect actual system metrics
    // For now, we'll simulate resource collection
    
    return {
      memory: {
        peak: this.simulateMetric(200, 600), // MB
        average: this.simulateMetric(150, 400),
        baseline: this.simulateMetric(100, 200)
      },
      cpu: {
        peak: this.simulateMetric(50, 90), // percent
        average: this.simulateMetric(30, 60),
        baseline: this.simulateMetric(10, 30)
      },
      disk: {
        reads: this.simulateMetric(100, 500), // MB
        writes: this.simulateMetric(50, 200),
        space: this.simulateMetric(1000, 5000) // MB available
      },
      network: {
        requests: this.simulateMetric(50, 200),
        dataTransferred: this.simulateMetric(10, 100), // MB
        latency: this.simulateMetric(50, 200) // ms
      }
    };
  }

  simulateMetric(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  calculateReliabilityMetrics(testResults) {
    const totalTests = testResults.totalTests || 0;
    const failedTests = testResults.failedTests || 0;
    const timeoutTests = testResults.timeoutTests || 0;
    const retryCount = testResults.retryCount || 0;
    
    return {
      errorRate: totalTests > 0 ? (failedTests / totalTests) * 100 : 0,
      timeoutRate: totalTests > 0 ? (timeoutTests / totalTests) * 100 : 0,
      retryRate: totalTests > 0 ? (retryCount / totalTests) * 100 : 0,
      stability: this.calculateStabilityScore(testResults),
      flakiness: this.detectFlakyTests(testResults)
    };
  }

  calculateStabilityScore(testResults) {
    // Calculate a stability score based on various factors
    const factors = {
      passRate: testResults.passRate || 0,
      consistency: 100 - (testResults.varianceInDuration || 0),
      errorFrequency: 100 - (testResults.errorRate || 0),
      timeoutFrequency: 100 - (testResults.timeoutRate || 0)
    };
    
    const weights = { passRate: 0.4, consistency: 0.2, errorFrequency: 0.2, timeoutFrequency: 0.2 };
    
    return Object.entries(factors).reduce((score, [factor, value]) => {
      return score + (value * weights[factor]);
    }, 0);
  }

  detectFlakyTests(testResults) {
    // Simulate flaky test detection
    const flakyTests = [
      { name: 'dashboard load with slow network', flakinessScore: 15 },
      { name: 'real-time update synchronization', flakinessScore: 8 }
    ];
    
    return {
      count: flakyTests.length,
      tests: flakyTests,
      totalFlakinessScore: flakyTests.reduce((sum, test) => sum + test.flakinessScore, 0)
    };
  }

  async calculateTrends() {
    const history = await this.loadMetricsHistory();
    
    if (history.length < 2) {
      return { available: false, reason: 'Insufficient historical data' };
    }
    
    const recent = history.slice(-10); // Last 10 runs
    
    return {
      available: true,
      executionTime: this.calculateTrend(recent.map(h => h.execution.totalDuration)),
      errorRate: this.calculateTrend(recent.map(h => h.reliability.errorRate)),
      memoryUsage: this.calculateTrend(recent.map(h => h.resource.memory.peak)),
      stability: this.calculateTrend(recent.map(h => h.reliability.stability))
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return { direction: 'stable', change: 0 };
    
    const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = values.slice(0, -3).reduce((a, b) => a + b, 0) / (values.length - 3);
    
    const change = ((recent - older) / older) * 100;
    
    return {
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      change: change.toFixed(2),
      recent,
      older
    };
  }

  async analyzePerformance(metrics) {
    console.log('🔍 Analyzing performance metrics...');
    
    const issues = [];
    const recommendations = [];
    
    // Check execution time
    if (metrics.execution.averageTestDuration > this.thresholds.avgTestDuration) {
      issues.push({
        type: 'warning',
        category: 'execution',
        message: `Average test duration (${metrics.execution.averageTestDuration.toFixed(2)}s) exceeds threshold (${this.thresholds.avgTestDuration}s)`,
        impact: 'medium'
      });
      
      recommendations.push('Consider optimizing slow tests or increasing parallelization');
    }
    
    // Check memory usage
    if (metrics.resource.memory.peak > this.thresholds.memoryUsage) {
      issues.push({
        type: 'error',
        category: 'resource',
        message: `Peak memory usage (${metrics.resource.memory.peak}MB) exceeds threshold (${this.thresholds.memoryUsage}MB)`,
        impact: 'high'
      });
      
      recommendations.push('Investigate memory leaks in test setup or application code');
    }
    
    // Check error rate
    if (metrics.reliability.errorRate > this.thresholds.errorRate) {
      issues.push({
        type: 'error',
        category: 'reliability',
        message: `Error rate (${metrics.reliability.errorRate.toFixed(1)}%) exceeds threshold (${this.thresholds.errorRate}%)`,
        impact: 'high'
      });
      
      recommendations.push('Review and fix failing tests to improve reliability');
    }
    
    // Check for flaky tests
    if (metrics.reliability.flakiness.count > 0) {
      issues.push({
        type: 'info',
        category: 'reliability',
        message: `${metrics.reliability.flakiness.count} flaky tests detected`,
        impact: 'medium'
      });
      
      recommendations.push('Investigate and stabilize flaky tests to improve consistency');
    }
    
    // Generate performance report
    const report = {
      timestamp: new Date().toISOString(),
      runId: metrics.runId,
      overall: this.calculateOverallScore(metrics),
      issues,
      recommendations,
      metrics: this.summarizeMetrics(metrics)
    };
    
    await this.savePerformanceReport(report);
    this.printAnalysisResults(report);
    
    return report;
  }

  calculateOverallScore(metrics) {
    const scores = {
      execution: this.scoreExecution(metrics.execution),
      resource: this.scoreResource(metrics.resource),
      reliability: this.scoreReliability(metrics.reliability)
    };
    
    const weights = { execution: 0.4, resource: 0.3, reliability: 0.3 };
    
    const overall = Object.entries(scores).reduce((total, [category, score]) => {
      return total + (score * weights[category]);
    }, 0);
    
    return {
      overall: Math.round(overall),
      breakdown: scores,
      grade: this.getGrade(overall)
    };
  }

  scoreExecution(execution) {
    // Score based on average test duration
    if (execution.averageTestDuration <= 2) return 100;
    if (execution.averageTestDuration <= 3) return 90;
    if (execution.averageTestDuration <= 5) return 75;
    if (execution.averageTestDuration <= 8) return 60;
    return 40;
  }

  scoreResource(resource) {
    // Score based on resource efficiency
    const memoryScore = resource.memory.peak <= 256 ? 100 : 
                       resource.memory.peak <= 512 ? 80 : 60;
    const cpuScore = resource.cpu.peak <= 50 ? 100 :
                    resource.cpu.peak <= 70 ? 80 : 60;
    
    return (memoryScore + cpuScore) / 2;
  }

  scoreReliability(reliability) {
    // Score based on stability and error rates
    return Math.max(0, 100 - (reliability.errorRate * 10) - (reliability.timeoutRate * 5));
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  summarizeMetrics(metrics) {
    return {
      execution: `${metrics.execution.totalTests} tests in ${metrics.execution.totalDuration.toFixed(1)}s`,
      resource: `Peak: ${metrics.resource.memory.peak}MB RAM, ${metrics.resource.cpu.peak}% CPU`,
      reliability: `${metrics.reliability.errorRate.toFixed(1)}% error rate, stability: ${metrics.reliability.stability.toFixed(1)}`
    };
  }

  async saveMetrics(metrics) {
    const history = await this.loadMetricsHistory();
    history.push(metrics);
    
    // Keep only last 100 runs
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    // Ensure directory exists
    const dir = path.dirname(this.metricsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(this.metricsFile, JSON.stringify(history, null, 2));
    console.log(`  💾 Performance metrics saved to: ${this.metricsFile}`);
  }

  async loadMetricsHistory() {
    try {
      if (fs.existsSync(this.metricsFile)) {
        return JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
      }
    } catch (error) {
      console.log(`  ⚠️  Error loading metrics history: ${error.message}`);
    }
    
    return [];
  }

  async savePerformanceReport(report) {
    const reportPath = path.join(process.cwd(), 'test-results', 'performance-report.json');
    
    // Ensure directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  📊 Performance report saved to: ${reportPath}`);
  }

  printAnalysisResults(report) {
    console.log('\n📈 Performance Analysis Results:');
    console.log(`  Overall Score: ${report.overall.overall}/100 (Grade: ${report.overall.grade})`);
    console.log(`  Execution: ${report.overall.breakdown.execution}/100`);
    console.log(`  Resource: ${report.overall.breakdown.resource}/100`);
    console.log(`  Reliability: ${report.overall.breakdown.reliability}/100`);
    
    if (report.issues.length > 0) {
      console.log('\n⚠️  Issues Detected:');
      report.issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} ${issue.message}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
  }
}

// Main function for CLI usage
async function runPerformanceMonitoring() {
  console.log('🔍 Starting test performance monitoring...');
  
  const monitor = new TestPerformanceMonitor();
  
  // Simulate test results (in real usage, this would come from actual test execution)
  const simulatedResults = {
    totalTests: 41,
    failedTests: 2,
    timeoutTests: 1,
    totalDuration: 847,
    passRate: 95.1,
    retryCount: 3,
    slowestTest: { name: 'dashboard data loading', duration: 12.4 },
    fastestTest: { name: 'homepage load', duration: 0.8 }
  };
  
  const metrics = await monitor.collectMetrics(simulatedResults);
  
  console.log('✅ Performance monitoring completed successfully');
  return metrics;
}

// Run if called directly
if (require.main === module) {
  runPerformanceMonitoring()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Performance monitoring crashed:', error);
      process.exit(1);
    });
}

module.exports = { TestPerformanceMonitor, runPerformanceMonitoring };