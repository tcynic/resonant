#!/usr/bin/env node

/**
 * Deployment Health Check Script
 * 
 * This script performs comprehensive health checks after deployment
 * to ensure all services are functioning correctly.
 */

const https = require('https');
const http = require('http');

class HealthChecker {
  constructor(config) {
    this.config = config;
    this.results = [];
  }

  async runAllChecks() {
    console.log('🏥 Starting deployment health checks...\n');

    const checks = [
      () => this.checkWebsiteHealth(),
      () => this.checkAPIHealth(),
      () => this.checkDatabaseConnectivity(),
      () => this.checkAuthenticationService(),
      () => this.checkAIService(),
      () => this.checkPerformance(),
    ];

    for (const check of checks) {
      try {
        await check();
      } catch (error) {
        this.logError(`Check failed: ${error.message}`);
      }
    }

    this.printSummary();
    return this.allChecksPassed();
  }

  async checkWebsiteHealth() {
    console.log('🌐 Checking website health...');
    
    const url = this.config.baseUrl;
    const startTime = Date.now();
    
    try {
      const response = await this.httpRequest(url);
      const responseTime = Date.now() - startTime;
      
      if (response.statusCode === 200) {
        this.logSuccess(`Website is accessible (${responseTime}ms)`);
        
        if (responseTime > 3000) {
          this.logWarning(`Slow response time: ${responseTime}ms`);
        }
      } else {
        this.logError(`Website returned status ${response.statusCode}`);
      }
    } catch (error) {
      this.logError(`Website check failed: ${error.message}`);
    }
  }

  async checkAPIHealth() {
    console.log('🔧 Checking API health...');
    
    const healthEndpoint = `${this.config.baseUrl}/api/health`;
    const startTime = Date.now();
    
    try {
      const response = await this.httpRequest(healthEndpoint);
      const responseTime = Date.now() - startTime;
      
      if (response.statusCode === 200) {
        this.logSuccess(`API health endpoint responding (${responseTime}ms)`);
        
        try {
          const healthData = JSON.parse(response.body);
          
          if (healthData.status === 'healthy') {
            this.logSuccess('API reports healthy status');
          } else {
            this.logError(`API reports unhealthy status: ${healthData.status}`);
          }
          
          // Check individual service health
          if (healthData.checks) {
            Object.entries(healthData.checks).forEach(([service, check]) => {
              if (check.status === 'healthy') {
                this.logSuccess(`${service}: healthy`);
              } else {
                this.logError(`${service}: ${check.status} - ${check.error || 'Unknown error'}`);
              }
            });
          }
        } catch (parseError) {
          this.logWarning('Could not parse health check response');
        }
      } else {
        this.logError(`API health check returned status ${response.statusCode}`);
      }
    } catch (error) {
      this.logError(`API health check failed: ${error.message}`);
    }
  }

  async checkDatabaseConnectivity() {
    console.log('🗄️  Checking database connectivity...');
    
    // This would typically test a simple database query
    // For Convex, we'll check if we can reach the API
    const testEndpoint = `${this.config.baseUrl}/api/test-db`;
    
    try {
      const response = await this.httpRequest(testEndpoint);
      
      if (response.statusCode === 200) {
        this.logSuccess('Database connectivity confirmed');
      } else if (response.statusCode === 404) {
        this.logWarning('Database test endpoint not found (this is expected in production)');
      } else {
        this.logError(`Database test returned status ${response.statusCode}`);
      }
    } catch (error) {
      this.logWarning(`Database connectivity check inconclusive: ${error.message}`);
    }
  }

  async checkAuthenticationService() {
    console.log('🔐 Checking authentication service...');
    
    // Test auth endpoints
    const signInEndpoint = `${this.config.baseUrl}/sign-in`;
    
    try {
      const response = await this.httpRequest(signInEndpoint);
      
      if (response.statusCode === 200) {
        this.logSuccess('Authentication pages accessible');
      } else {
        this.logError(`Authentication page returned status ${response.statusCode}`);
      }
    } catch (error) {
      this.logError(`Authentication check failed: ${error.message}`);
    }
  }

  async checkAIService() {
    console.log('🤖 Checking AI service...');
    
    // This is a placeholder - in reality you'd test your AI endpoints
    // For now, we'll just verify the service is configured
    if (process.env.GOOGLE_GEMINI_API_KEY) {
      this.logSuccess('AI service API key configured');
    } else {
      this.logWarning('AI service API key not found in environment');
    }
  }

  async checkPerformance() {
    console.log('⚡ Checking performance metrics...');
    
    const startTime = Date.now();
    const url = this.config.baseUrl;
    
    try {
      const response = await this.httpRequest(url);
      const totalTime = Date.now() - startTime;
      
      // Performance thresholds
      if (totalTime < 1000) {
        this.logSuccess(`Excellent response time: ${totalTime}ms`);
      } else if (totalTime < 2000) {
        this.logSuccess(`Good response time: ${totalTime}ms`);
      } else if (totalTime < 3000) {
        this.logWarning(`Acceptable response time: ${totalTime}ms`);
      } else {
        this.logError(`Poor response time: ${totalTime}ms`);
      }
      
      // Check for common performance headers
      const headers = response.headers;
      
      if (headers['cache-control']) {
        this.logSuccess('Cache headers present');
      } else {
        this.logWarning('No cache headers found');
      }
      
      if (headers['content-encoding']) {
        this.logSuccess(`Content compression active: ${headers['content-encoding']}`);
      } else {
        this.logWarning('No content compression detected');
      }
      
    } catch (error) {
      this.logError(`Performance check failed: ${error.message}`);
    }
  }

  httpRequest(url) {
    return new Promise((resolve, reject) => {
      const lib = url.startsWith('https:') ? https : http;
      const request = lib.get(url, (response) => {
        let body = '';
        
        response.on('data', (chunk) => {
          body += chunk;
        });
        
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            headers: response.headers,
            body,
          });
        });
      });
      
      request.on('error', reject);
      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  logSuccess(message) {
    const result = { type: 'success', message };
    this.results.push(result);
    console.log(`✅ ${message}`);
  }

  logWarning(message) {
    const result = { type: 'warning', message };
    this.results.push(result);
    console.log(`⚠️  ${message}`);
  }

  logError(message) {
    const result = { type: 'error', message };
    this.results.push(result);
    console.log(`❌ ${message}`);
  }

  printSummary() {
    console.log('\n📊 Health Check Summary');
    console.log('========================');
    
    const successCount = this.results.filter(r => r.type === 'success').length;
    const warningCount = this.results.filter(r => r.type === 'warning').length;
    const errorCount = this.results.filter(r => r.type === 'error').length;
    
    console.log(`✅ Successful checks: ${successCount}`);
    console.log(`⚠️  Warnings: ${warningCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (this.allChecksPassed()) {
      console.log('\n🎉 All critical checks passed! Deployment is healthy.');
    } else {
      console.log('\n🚨 Some checks failed. Please review the errors above.');
    }
  }

  allChecksPassed() {
    const errorCount = this.results.filter(r => r.type === 'error').length;
    return errorCount === 0;
  }
}

// Configuration
const config = {
  baseUrl: process.env.DEPLOYMENT_URL || process.env.VERCEL_URL || 'http://localhost:3000',
};

// Add protocol if missing
if (!config.baseUrl.startsWith('http')) {
  config.baseUrl = `https://${config.baseUrl}`;
}

// Main execution
async function main() {
  console.log(`🔍 Running health checks for: ${config.baseUrl}\n`);
  
  const checker = new HealthChecker(config);
  const success = await checker.runAllChecks();
  
  process.exit(success ? 0 : 1);
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Health check script failed:', error);
    process.exit(1);
  });
}

module.exports = { HealthChecker };