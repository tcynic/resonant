# Static Analysis and Security Scanning

## Overview

This document covers the static analysis tools and security scanning processes used to maintain code quality, identify vulnerabilities, and ensure secure coding practices in the Resonant application.

## Static Analysis Tools

### SonarCloud Configuration

#### Project Configuration
```properties
# sonar-project.properties
sonar.projectKey=resonant-app
sonar.organization=your-org
sonar.projectName=Resonant App
sonar.projectVersion=1.0

# Source and test paths
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts

# Coverage
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.test.tsx,**/*.stories.tsx,**/*.d.ts

# Analysis exclusions
sonar.exclusions=**/node_modules/**,**/.next/**,**/coverage/**,**/*.stories.tsx

# Code quality thresholds
sonar.qualitygate.wait=true
```

#### Quality Gate Metrics
- **Maintainability Rating**: A (≤ 5% technical debt ratio)
- **Reliability Rating**: A (≤ 0.5% bug density)
- **Security Rating**: A (zero security vulnerabilities)
- **Coverage**: ≥ 80% on new code
- **Duplications**: ≤ 3% duplicated lines on new code

### TypeScript Strict Configuration

#### Enhanced Type Safety
```json
// tsconfig.strict.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // Strict type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    
    // Additional checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    
    // Import/module resolution
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

#### Benefits of Strict TypeScript
- **Null Safety**: Prevents null/undefined runtime errors
- **Type Completeness**: Ensures all code paths are typed
- **Import Safety**: Validates module imports and exports
- **Parameter Safety**: Catches unused parameters and variables
- **Switch Completeness**: Ensures all switch cases are handled

## Security Scanning and Monitoring

### Comprehensive Security Workflow

#### Multi-layered Security Pipeline
```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: npm audit
        run: npm audit --audit-level moderate --production
      
      - name: Snyk vulnerability scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=medium --fail-on=all
      
      - name: Semgrep security analysis
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/react
            p/typescript
            p/owasp-top-ten
            p/nodejs
      
      - name: CodeQL analysis
        uses: github/codeql-action/init@v3
        with:
          languages: javascript
      
      - name: Perform CodeQL analysis
        uses: github/codeql-action/analyze@v3
      
      - name: FOSSA license compliance
        uses: fossas/fossa-action@main
        with:
          api-key: ${{ secrets.FOSSA_API_KEY }}
          
      - name: Generate security report
        run: |
          echo "# Security Scan Report" > security-report.md
          echo "Generated on: $(date)" >> security-report.md
          echo "" >> security-report.md
          echo "## npm audit results" >> security-report.md
          npm audit --json || true >> security-report.md
          
      - name: Upload security report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-report.md
```

### Security Monitoring Implementation

#### Runtime Security Tracking
```typescript
// src/lib/security/monitoring.ts
import * as Sentry from '@sentry/nextjs'

// Security event tracking
export function trackSecurityEvent(event: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: `Security event: ${event}`,
    level: 'warning',
    data,
  })
  
  // Log to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[SECURITY] ${event}`, data)
  }
}

// Content Security Policy violation handler
export function handleCSPViolation(violation: SecurityPolicyViolationEvent) {
  trackSecurityEvent('CSP Violation', {
    blockedURI: violation.blockedURI,
    violatedDirective: violation.violatedDirective,
    originalPolicy: violation.originalPolicy,
  })
}

// Rate limiting detection
export function detectRateLimit(ip: string, endpoint: string) {
  trackSecurityEvent('Rate Limit Hit', {
    ip,
    endpoint,
    timestamp: new Date().toISOString(),
  })
}

// Suspicious activity detection
export function detectSuspiciousActivity(
  userId: string, 
  activity: string, 
  metadata: Record<string, any>
) {
  trackSecurityEvent('Suspicious Activity', {
    userId,
    activity,
    metadata,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  })
}
```

### Security Scanning Tools

#### 1. npm audit
- **Purpose**: Detect known vulnerabilities in dependencies
- **Frequency**: Every commit and weekly scheduled scan
- **Threshold**: Moderate+ severity vulnerabilities block builds
- **Remediation**: Automated dependency updates via Dependabot

#### 2. Snyk
- **Purpose**: Advanced vulnerability detection and license compliance
- **Features**: Dependency scanning, container scanning, code analysis
- **Integration**: GitHub PR comments with vulnerability details
- **Reporting**: Weekly security digest and trend analysis

#### 3. Semgrep
- **Purpose**: Static analysis for security anti-patterns
- **Rule Sets**: OWASP Top 10, React security, Node.js security
- **Custom Rules**: Resonant-specific security patterns
- **Output**: Security hotspots and remediation guidance

#### 4. CodeQL
- **Purpose**: Semantic code analysis for complex vulnerabilities
- **Languages**: JavaScript, TypeScript
- **Queries**: GitHub's security query database
- **Integration**: Security Advisory creation for found vulnerabilities

#### 5. FOSSA
- **Purpose**: License compliance and open-source risk management
- **Features**: License conflict detection, policy enforcement
- **Compliance**: Ensures all dependencies meet licensing requirements
- **Reporting**: License inventory and compliance dashboard

### Security Best Practices Enforcement

#### Secure Coding Guidelines

##### Input Validation
```typescript
// Enforce input validation at boundaries
import { z } from 'zod'

const userInputSchema = z.object({
  email: z.string().email(),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).optional(),
})

export function validateUserInput(input: unknown) {
  return userInputSchema.parse(input)
}
```

##### Authentication Security
```typescript
// Secure authentication patterns
import { auth } from '@clerk/nextjs'

export async function requireAuth() {
  const { userId } = auth()
  if (!userId) {
    throw new Error('Unauthorized access attempt')
  }
  return userId
}

export function requireOwnership(resourceUserId: string, currentUserId: string) {
  if (resourceUserId !== currentUserId) {
    trackSecurityEvent('Unauthorized Resource Access', {
      resourceUserId,
      currentUserId,
    })
    throw new Error('Access denied')
  }
}
```

##### Data Sanitization
```typescript
// Prevent XSS and injection attacks
import DOMPurify from 'dompurify'

export function sanitizeUserContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: [],
  })
}

export function sanitizeSearchQuery(query: string): string {
  return query.replace(/[<>\"'&]/g, '').trim()
}
```

### Content Security Policy

#### CSP Configuration
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' *.clerk.dev *.google.com;
      child-src *.clerk.dev;
      style-src 'self' 'unsafe-inline' *.googleapis.com;
      img-src * blob: data:;
      media-src 'none';
      connect-src *;
      font-src 'self' *.googleapis.com *.gstatic.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
]
```

#### CSP Violation Monitoring
```typescript
// src/pages/_app.tsx
useEffect(() => {
  // Monitor CSP violations
  document.addEventListener('securitypolicyviolation', handleCSPViolation)
  
  return () => {
    document.removeEventListener('securitypolicyviolation', handleCSPViolation)
  }
}, [])
```

### Security Incident Response

#### Automated Response Actions
1. **High Severity Vulnerability**: Immediate Slack notification
2. **Suspicious Activity**: Rate limiting and user notification
3. **CSP Violations**: Logging and investigation
4. **Failed Authentication**: Account lockout after threshold

#### Manual Response Procedures
1. **Vulnerability Assessment**: Security team review within 4 hours
2. **Impact Analysis**: Affected users and data identification
3. **Mitigation Deployment**: Emergency patches and hotfixes
4. **Post-Incident Review**: Process improvement and documentation

### Security Metrics and KPIs

#### Primary Security Metrics
- **Vulnerability Count**: Zero high/critical vulnerabilities
- **Mean Time to Patch**: < 24 hours for critical vulnerabilities
- **Security Test Coverage**: 100% of authentication flows
- **Dependency Risk Score**: Low risk rating maintained

#### Security Monitoring Dashboard
- Real-time vulnerability alerts
- Security scanning trend analysis
- License compliance status
- Security event correlation and investigation

### Compliance and Auditing

#### Data Protection Compliance
- **GDPR Article 32**: Technical security measures
- **CCPA Section 1798.150**: Data security requirements
- **SOC 2 Type II**: Security and availability controls

#### Security Audit Trail
- All security events logged with timestamps
- User access patterns and anomaly detection
- Configuration changes and privilege escalations
- Regular security assessment reports

---

**Related Documentation:**
- [QA Philosophy & Strategy](qa-philosophy-and-strategy.md) - Overall security approach
- [Automated Code Review](automated-code-review.md) - Security in CI/CD
- [Production Monitoring](production-monitoring.md) - Runtime security monitoring

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025