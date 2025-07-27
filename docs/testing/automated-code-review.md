# Automated Code Review Workflows

## Overview

This document details the automated code review processes for the Resonant application, including CI/CD pipeline configuration, static analysis setup, and code quality enforcement through GitHub Actions.

## GitHub Actions Integration

### Quality Assurance Pipeline

```yaml
# .github/workflows/quality-assurance.yml
name: Quality Assurance Pipeline

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  code-quality:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history for SonarCloud
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run TypeScript compilation
        run: npm run typecheck
      
      - name: Run ESLint
        run: npm run lint -- --format=json --output-file=eslint-report.json
      
      - name: Run Prettier check
        run: npm run format:check
      
      - name: Run tests with coverage
        run: npm run test:ci
      
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  
  security-audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run npm audit
        run: npm audit --audit-level high --production
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=medium
      
      - name: FOSSA license scan
        uses: fossas/fossa-action@main
        with:
          api-key: ${{ secrets.FOSSA_API_KEY }}
  
  performance-audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Analyze bundle size
        run: |
          npx @next/bundle-analyzer
          npx bundlesize
      
      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: '.lighthouserc.json'
          uploadArtifacts: true
```

## Enhanced ESLint Configuration

### Comprehensive Rule Set

```javascript
// eslint.config.mjs
import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import next from '@next/eslint-plugin-next'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@next/next': next,
    },
    rules: {
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      
      // React best practices
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off', // Using TypeScript
      'react/react-in-jsx-scope': 'off', // Next.js handles this
      'react/display-name': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-target-blank': 'error',
      
      // Accessibility
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      
      // Next.js specific
      '@next/next/no-img-element': 'error',
      '@next/next/no-page-custom-font': 'error',
      
      // Code quality
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-duplicate-imports': 'error',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.test.{js,jsx,ts,tsx}'],
    rules: {
      // Relaxed rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
]
```

## Code Review Automation Features

### Pull Request Checks

#### Required Status Checks
- ✅ **ESLint**: Zero errors, warnings allowed with approval
- ✅ **TypeScript**: Must compile without errors
- ✅ **Prettier**: Code must be properly formatted
- ✅ **Tests**: All tests must pass with ≥ 80% coverage
- ✅ **Security**: No high-severity vulnerabilities
- ✅ **Bundle Size**: Must stay within defined limits

#### Automated Comments
The CI system automatically comments on PRs with:
- Code coverage reports and trends
- Bundle size impact analysis
- Security vulnerability summaries
- Performance metric changes
- Accessibility compliance status

### SonarCloud Integration

#### Quality Gate Configuration
```properties
# sonar-project.properties
sonar.projectKey=resonant-app
sonar.organization=your-org
sonar.projectName=Resonant App

# Analysis scope
sonar.sources=src
sonar.tests=src
sonar.test.inclusions=**/*.test.ts,**/*.test.tsx

# Coverage reports
sonar.typescript.lcov.reportPaths=coverage/lcov.info
sonar.coverage.exclusions=**/*.test.ts,**/*.test.tsx,**/*.stories.tsx

# Quality thresholds
sonar.qualitygate.wait=true
```

#### Metrics Tracked
- **Maintainability Rating**: A-E scale based on technical debt
- **Reliability Rating**: Bug density and error-prone patterns
- **Security Rating**: Security vulnerability assessment
- **Coverage**: Test coverage percentage and trends
- **Duplications**: Code duplication detection and remediation

### Performance Budget Enforcement

#### Bundle Size Monitoring
```json
// bundlesize.config.json
{
  "files": [
    {
      "path": ".next/static/chunks/pages/_app-*.js",
      "maxSize": "250kb"
    },
    {
      "path": ".next/static/chunks/pages/index-*.js",
      "maxSize": "50kb"
    },
    {
      "path": ".next/static/chunks/commons-*.js",
      "maxSize": "150kb"
    }
  ]
}
```

#### Lighthouse CI Configuration
```javascript
// .lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
      },
    },
  },
}
```

## Branch Protection Rules

### Main Branch Protection
- **Require pull request reviews**: 1+ approvals required
- **Dismiss stale reviews**: When new commits are pushed
- **Require status checks**: All CI checks must pass
- **Require branches to be up to date**: Force rebase before merge
- **Restrict pushes**: Only allow through pull requests
- **Require signed commits**: GPG signature verification

### Development Branch Protection
- **Require status checks**: Core CI checks must pass
- **Allow force pushes**: For feature branch management
- **Allow deletions**: Temporary branches can be deleted

## Automated Code Quality Reports

### Daily Quality Reports
Automated reports sent to team channels:
- Code coverage trends and hotspots
- Security vulnerability status
- Performance regression alerts
- Technical debt accumulation
- Test suite health metrics

### Weekly Quality Reviews
Comprehensive quality assessment:
- Quality metric trends and goals
- Code review effectiveness analysis
- Tool performance and configuration
- Process improvement recommendations
- Team quality training needs

## Quality Gate Configuration

### Pre-merge Requirements
1. **Code Quality**: ESLint score ≥ 95%
2. **Test Coverage**: Overall coverage ≥ 80%
3. **Security**: Zero high/critical vulnerabilities
4. **Performance**: No significant regressions
5. **Accessibility**: WCAG 2.1 AA compliance
6. **Documentation**: Updated for public API changes

### Emergency Override Process
For critical production fixes:
1. **Security Lead Approval**: Required for security bypasses
2. **Technical Lead Approval**: Required for quality bypasses
3. **Documentation**: Override reason and remediation plan
4. **Follow-up**: Quality debt tracked and prioritized

---

**Related Documentation:**
- [QA Philosophy & Strategy](qa-philosophy-and-strategy.md) - Overall QA approach
- [Git Workflows and Hooks](git-workflows-and-hooks.md) - Pre-commit automation
- [Static Analysis and Security](static-analysis-and-security.md) - Advanced analysis tools

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025