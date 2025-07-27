# Git Workflows and Pre-commit Hooks

## Overview

This document outlines the Git workflow processes and pre-commit hook configurations that ensure code quality at the source control level. These automated checks prevent low-quality code from entering the repository.

## Pre-commit Hooks and Git Workflows

### Husky and lint-staged Setup

#### Installation and Configuration

```bash
# Install Husky and lint-staged
npm install --save-dev husky lint-staged commitlint @commitlint/config-conventional

# Initialize Husky
npx husky init
```

#### Package.json Configuration

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "**/*.{ts,tsx}": [
      "eslint --max-warnings=0 --fix",
      "prettier --write",
      "bash -c 'npm run typecheck'"
    ],
    "**/*.{js,json,css,md,yml,yaml}": ["prettier --write"],
    "**/*.{ts,tsx,js,jsx}": [
      "jest --bail --findRelatedTests --passWithNoTests --silent"
    ]
  },
  "commitlint": {
    "extends": ["@commitlint/config-conventional"]
  }
}
```

### Git Hooks Configuration

#### Pre-commit Hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh
npx lint-staged
```

#### Commit Message Hook

```bash
# .husky/commit-msg
#!/usr/bin/env sh
npx commitlint --edit $1
```

#### Pre-push Hook

```bash
# .husky/pre-push
#!/usr/bin/env sh
npm run test:ci
npm run build
```

## Commit Message Standards

### Commitlint Configuration

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Formatting
        'refactor', // Code refactoring
        'perf', // Performance improvement
        'test', // Tests
        'chore', // Maintenance
        'ci', // CI/CD changes
        'build', // Build system changes
        'revert', // Revert changes
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
  },
}
```

### Conventional Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Examples of Good Commits

```bash
feat(auth): add OAuth2 integration with Google
fix(journal): resolve entry duplication on save
docs(api): update authentication endpoint documentation
style: format code with prettier
refactor(dashboard): extract health score calculation logic
perf(search): optimize journal entry search algorithm
test(journal): add unit tests for entry validation
chore(deps): update eslint to latest version
ci(actions): add automated security scanning
build(webpack): optimize bundle splitting configuration
```

#### Examples of Bad Commits (Rejected)

```bash
# Too vague
fix: bug fixes

# Missing type
added new feature

# Subject too long
feat: this is a very long commit message that exceeds the maximum character limit defined in our commitlint configuration

# Wrong case
feat: Add New Feature

# Ends with period
fix(auth): resolve login issue.
```

## Lint-staged Workflows

### TypeScript and React Files Processing

For `**/*.{ts,tsx}` files, lint-staged runs:

1. **ESLint with Auto-fix**: Automatically fixes common issues
2. **Prettier Formatting**: Ensures consistent code formatting
3. **TypeScript Compilation**: Validates type safety

### General File Processing

For `**/*.{js,json,css,md,yml,yaml}` files:

- **Prettier Formatting**: Consistent formatting across all file types

### Test Execution

For `**/*.{ts,tsx,js,jsx}` files:

- **Related Tests**: Runs only tests related to changed files
- **Fast Execution**: Uses `--bail` and `--silent` for speed
- **No Test Requirement**: Uses `--passWithNoTests` for new files

## Git Workflow Policies

### Branch Naming Conventions

```bash
# Feature branches
feature/auth-oauth2-integration
feature/dashboard-health-metrics

# Bug fix branches
fix/journal-entry-duplication
fix/login-redirect-loop

# Release branches
release/v1.2.0
release/v1.2.1-hotfix

# Hotfix branches
hotfix/critical-security-patch
hotfix/data-corruption-fix
```

### Merge Strategies

#### Feature Development

1. **Create Feature Branch**: From `develop` branch
2. **Regular Commits**: Following conventional commit format
3. **Rebase Before PR**: Keep history clean
4. **Squash Merge**: Into `develop` branch

#### Release Process

1. **Release Branch**: From `develop` when ready
2. **Bug Fixes**: Only critical fixes in release branch
3. **Merge to Main**: Fast-forward merge for releases
4. **Tag Release**: Semantic versioning tags

#### Hotfix Process

1. **Branch from Main**: For critical production fixes
2. **Merge to Main**: After thorough testing
3. **Cherry-pick to Develop**: Sync with development branch

### Pre-commit Validation Stages

#### Stage 1: Code Formatting and Linting

- **Duration**: ~10-30 seconds
- **Actions**: ESLint auto-fix, Prettier formatting
- **Failure Handling**: Automatically stages fixed files

#### Stage 2: Type Checking

- **Duration**: ~15-45 seconds
- **Actions**: TypeScript compilation validation
- **Failure Handling**: Blocks commit, shows type errors

#### Stage 3: Related Tests

- **Duration**: ~30-120 seconds
- **Actions**: Runs tests for modified files
- **Failure Handling**: Blocks commit, shows test failures

### Pre-push Validation

#### Full Test Suite

- **Duration**: ~2-5 minutes
- **Actions**: Complete test suite execution
- **Coverage**: Validates overall code coverage

#### Build Validation

- **Duration**: ~1-3 minutes
- **Actions**: Production build compilation
- **Validation**: Ensures deployable code

## Bypass Procedures

### Emergency Commit Process

For critical production fixes:

```bash
# Skip pre-commit hooks (use sparingly)
git commit --no-verify -m "hotfix: critical security patch"

# Skip pre-push hooks (emergency only)
git push --no-verify
```

#### Requirements for Bypass

1. **Senior Developer Approval**: Required for hook bypass
2. **Documentation**: Reason for bypass must be documented
3. **Follow-up**: Quality debt must be addressed in next commit
4. **Notification**: Team must be notified of bypass

### Troubleshooting Common Issues

#### Hook Installation Problems

```bash
# Reinstall hooks
rm -rf .husky
npx husky init
npm run prepare
```

#### Lint-staged Hanging

```bash
# Clear lint-staged cache
npx lint-staged --debug
rm -rf .lintstagedrc*
```

#### TypeScript Compilation Errors

```bash
# Incremental type checking
npm run typecheck -- --incremental
npx tsc --showConfig
```

## Monitoring and Metrics

### Git Hook Performance

- **Pre-commit Duration**: Target < 2 minutes
- **Pre-push Duration**: Target < 5 minutes
- **Failure Rate**: Monitor and optimize for < 10%

### Commit Quality Metrics

- **Conventional Commit Compliance**: Target > 95%
- **Commit Message Quality**: Automated scoring
- **Commit Size**: Encourage smaller, focused commits

### Developer Experience

- **Hook Bypass Rate**: Monitor emergency bypasses
- **Developer Feedback**: Regular surveys on hook effectiveness
- **Performance Optimization**: Continuous improvement of hook speed

---

**Related Documentation:**

- [QA Philosophy & Strategy](qa-philosophy-and-strategy.md) - Overall quality approach
- [Automated Code Review](automated-code-review.md) - CI/CD integration
- [Static Analysis and Security](static-analysis-and-security.md) - Advanced code analysis

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025
