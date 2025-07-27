# Documentation Quality Assurance

## Overview

This document establishes the quality assurance processes for documentation, ensuring that all project documentation maintains high standards of accuracy, clarity, and usefulness while staying current with the codebase.

## Documentation Quality Assurance

### Automated Documentation Validation

#### Link Checking and Content Validation
```yaml
# .github/workflows/docs-validation.yml
name: Documentation Validation

on:
  pull_request:
    paths:
      - 'docs/**'
      - 'README.md'
      - '**/*.md'

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Check markdown links
        uses: gaurav-nelson/github-action-markdown-link-check@v1
        with:
          use-quiet-mode: 'yes'
          use-verbose-mode: 'yes'
          config-file: '.markdown-link-check.json'
      
      - name: Spell check
        uses: streetsidesoftware/cspell-action@v2
        with:
          files: '**/*.md'
          config: '.cspell.json'
      
      - name: Vale prose linting
        uses: errata-ai/vale-action@reviewdog
        with:
          files: docs
          vale_flags: '--config=.vale.ini'
      
      - name: Check documentation structure
        run: |
          # Verify all guides are linked in main index
          python scripts/validate-docs-structure.py
```

### Documentation Standards and Guidelines

#### Markdown Link Checking Configuration
```json
// .markdown-link-check.json
{
  "ignorePatterns": [
    {
      "pattern": "^http://localhost"
    },
    {
      "pattern": "^https://example.com"
    },
    {
      "pattern": "^mailto:"
    }
  ],
  "replacementPatterns": [
    {
      "pattern": "^/",
      "replacement": "https://resonant-docs.vercel.app/"
    }
  ],
  "httpHeaders": [
    {
      "urls": ["https://github.com/"],
      "headers": {
        "Accept": "text/html",
        "User-Agent": "Mozilla/5.0"
      }
    }
  ],
  "timeout": "20s",
  "retryOn429": true,
  "retryCount": 3,
  "fallbackProtocols": [
    "https",
    "http"
  ]
}
```

#### Spell Checking Configuration
```json
// .cspell.json
{
  "version": "0.2",
  "language": "en",
  "words": [
    "Resonant",
    "Convex",
    "Clerk",
    "Next.js",
    "TypeScript",
    "Tailwind",
    "Playwright",
    "ESLint",
    "Prettier",
    "Storybook",
    "journaling",
    "mindfulness",
    "OAuth2",
    "WebSocket",
    "API",
    "JSON",
    "YAML",
    "README",
    "CLI",
    "UI",
    "UX",
    "CI",
    "CD",
    "DevOps",
    "NPM",
    "GitHub",
    "Vercel",
    "SonarCloud",
    "Dependabot",
    "Lighthouse",
    "WebVitals",
    "PostgreSQL",
    "Redis",
    "Docker"
  ],
  "ignorePaths": [
    "node_modules/**",
    ".next/**",
    "coverage/**",
    "*.json",
    "*.lock",
    ".git/**"
  ],
  "overrides": [
    {
      "filename": "**/*.md",
      "caseSensitive": false,
      "words": [
        "changelog",
        "roadmap",
        "backlog",
        "frontend",
        "backend",
        "fullstack",
        "middleware",
        "serverless",
        "microservices"
      ]
    },
    {
      "filename": "**/code-blocks.md",
      "ignoreRegExpList": [
        "/```[\\s\\S]*?```/g",
        "/`[^`]*`/g"
      ]
    }
  ]
}
```

#### Prose Linting with Vale
```ini
# .vale.ini
StylesPath = .vale/styles
MinAlertLevel = suggestion

[*.md]
BasedOnStyles = Microsoft, write-good
Microsoft.Contractions = NO
Microsoft.FirstPerson = NO
write-good.ThereIs = NO
write-good.TooWordy = NO

[docs/api/*.md]
BasedOnStyles = Microsoft
Microsoft.Wordiness = NO

[README.md]
BasedOnStyles = Microsoft, write-good
Microsoft.Contractions = YES
```

### Documentation Structure Validation

#### Automated Structure Verification
```python
# scripts/validate-docs-structure.py
import os
import re
import sys
from pathlib import Path

class DocumentationValidator:
    def __init__(self, docs_dir="docs"):
        self.docs_dir = Path(docs_dir)
        self.errors = []
        self.warnings = []
    
    def validate_structure(self):
        """Validate overall documentation structure"""
        # Check for required files
        required_files = [
            "README.md",
            "testing/testing-strategy-framework.md",
            "architecture/system-architecture.md",
            "business/PRD.md"
        ]
        
        for file_path in required_files:
            full_path = self.docs_dir / file_path
            if not full_path.exists():
                self.errors.append(f"Required file missing: {file_path}")
    
    def validate_links(self):
        """Validate internal links between documents"""
        all_md_files = list(self.docs_dir.rglob("*.md"))
        file_map = {f.name.lower(): f for f in all_md_files}
        
        for md_file in all_md_files:
            content = md_file.read_text(encoding='utf-8')
            
            # Find internal links
            internal_links = re.findall(r'\[([^\]]+)\]\(([^)]+\.md[^)]*)\)', content)
            
            for link_text, link_path in internal_links:
                # Resolve relative paths
                target_path = (md_file.parent / link_path).resolve()
                
                if not target_path.exists():
                    self.errors.append(
                        f"Broken link in {md_file.relative_to(self.docs_dir)}: "
                        f"'{link_text}' -> '{link_path}'"
                    )
    
    def validate_headings(self):
        """Validate heading structure and hierarchy"""
        for md_file in self.docs_dir.rglob("*.md"):
            content = md_file.read_text(encoding='utf-8')
            lines = content.split('\n')
            
            heading_levels = []
            for i, line in enumerate(lines, 1):
                if line.startswith('#'):
                    level = len(line) - len(line.lstrip('#'))
                    heading_levels.append((level, i, line.strip()))
            
            # Check for heading hierarchy violations
            for i in range(1, len(heading_levels)):
                current_level = heading_levels[i][0]
                prev_level = heading_levels[i-1][0]
                
                if current_level > prev_level + 1:
                    self.warnings.append(
                        f"Heading hierarchy skip in {md_file.relative_to(self.docs_dir)}:"
                        f" line {heading_levels[i][1]} (h{current_level} after h{prev_level})"
                    )
    
    def validate_frontmatter(self):
        """Validate frontmatter consistency"""
        required_frontmatter = ['title', 'description', 'last_updated']
        
        for md_file in self.docs_dir.rglob("*.md"):
            if md_file.name == "README.md":
                continue  # Skip README files
                
            content = md_file.read_text(encoding='utf-8')
            
            if content.startswith('---'):
                frontmatter_end = content.find('---', 3)
                if frontmatter_end > 0:
                    frontmatter = content[3:frontmatter_end].strip()
                    
                    for field in required_frontmatter:
                        if f"{field}:" not in frontmatter:
                            self.warnings.append(
                                f"Missing frontmatter field '{field}' in "
                                f"{md_file.relative_to(self.docs_dir)}"
                            )
                else:
                    self.errors.append(
                        f"Malformed frontmatter in {md_file.relative_to(self.docs_dir)}"
                    )
    
    def validate_code_blocks(self):
        """Validate code block syntax and languages"""
        valid_languages = {
            'javascript', 'typescript', 'jsx', 'tsx', 'python', 'bash', 'shell',
            'yaml', 'yml', 'json', 'markdown', 'md', 'html', 'css', 'sql',
            'dockerfile', 'nginx', 'toml', 'ini', 'xml', 'graphql'
        }
        
        for md_file in self.docs_dir.rglob("*.md"):
            content = md_file.read_text(encoding='utf-8')
            
            # Find code blocks
            code_blocks = re.findall(r'```(\w+)?\n(.*?)```', content, re.DOTALL)
            
            for lang, code in code_blocks:
                if lang and lang.lower() not in valid_languages:
                    self.warnings.append(
                        f"Unknown code language '{lang}' in "
                        f"{md_file.relative_to(self.docs_dir)}"
                    )
                
                # Check for common syntax issues
                if not code.strip():
                    self.warnings.append(
                        f"Empty code block in {md_file.relative_to(self.docs_dir)}"
                    )
    
    def generate_report(self):
        """Generate validation report"""
        report = ["# Documentation Validation Report", ""]
        
        if self.errors:
            report.extend(["## Errors (Must Fix)", ""])
            for error in self.errors:
                report.append(f"- ❌ {error}")
            report.append("")
        
        if self.warnings:
            report.extend(["## Warnings (Should Fix)", ""])
            for warning in self.warnings:
                report.append(f"- ⚠️ {warning}")
            report.append("")
        
        if not self.errors and not self.warnings:
            report.extend(["✅ All documentation validation checks passed!"])
        
        return "\n".join(report)
    
    def run_validation(self):
        """Run all validation checks"""
        self.validate_structure()
        self.validate_links()
        self.validate_headings()
        self.validate_frontmatter()
        self.validate_code_blocks()
        
        report = self.generate_report()
        print(report)
        
        # Exit with error code if there are errors
        return len(self.errors) == 0

if __name__ == "__main__":
    validator = DocumentationValidator()
    success = validator.run_validation()
    sys.exit(0 if success else 1)
```

### Documentation Maintenance Workflows

#### Content Freshness Monitoring
```javascript
// scripts/docs-freshness-check.js
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class DocsFreshnessChecker {
  constructor(docsDir = 'docs') {
    this.docsDir = docsDir
    this.staleThresholdDays = 90
    this.warnings = []
  }

  checkDocumentFreshness() {
    const mdFiles = this.getAllMarkdownFiles()
    
    mdFiles.forEach(file => {
      const stats = fs.statSync(file)
      const daysSinceModified = this.getDaysSinceModified(stats.mtime)
      
      if (daysSinceModified > this.staleThresholdDays) {
        this.warnings.push({
          file: path.relative(this.docsDir, file),
          daysSinceModified,
          lastModified: stats.mtime.toISOString().split('T')[0]
        })
      }
    })
  }

  checkCodeExampleFreshness() {
    // Check if code examples in docs match current codebase
    const docsWithCode = this.getDocsWithCodeExamples()
    
    docsWithCode.forEach(({ file, codeBlocks }) => {
      codeBlocks.forEach(block => {
        if (this.isOutdatedCodeExample(block)) {
          this.warnings.push({
            file: path.relative(this.docsDir, file),
            issue: 'Potentially outdated code example',
            code: block.substring(0, 100) + '...'
          })
        }
      })
    })
  }

  checkCrossReferences() {
    // Verify that documentation cross-references are still valid
    const allDocs = this.getAllMarkdownFiles()
    
    allDocs.forEach(file => {
      const content = fs.readFileSync(file, 'utf8')
      const references = this.extractCrossReferences(content)
      
      references.forEach(ref => {
        if (!this.isValidReference(ref)) {
          this.warnings.push({
            file: path.relative(this.docsDir, file),
            issue: 'Invalid cross-reference',
            reference: ref
          })
        }
      })
    })
  }

  generateFreshnessReport() {
    const report = {
      timestamp: new Date().toISOString(),
      staleDocuments: this.warnings.filter(w => w.daysSinceModified),
      outdatedCode: this.warnings.filter(w => w.issue === 'Potentially outdated code example'),
      brokenReferences: this.warnings.filter(w => w.issue === 'Invalid cross-reference'),
      summary: {
        totalWarnings: this.warnings.length,
        staleCount: this.warnings.filter(w => w.daysSinceModified).length,
        codeIssues: this.warnings.filter(w => w.issue === 'Potentially outdated code example').length
      }
    }

    return report
  }

  getAllMarkdownFiles() {
    const files = []
    
    function walkDir(dir) {
      const items = fs.readdirSync(dir)
      
      items.forEach(item => {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          walkDir(fullPath)
        } else if (item.endsWith('.md')) {
          files.push(fullPath)
        }
      })
    }
    
    walkDir(this.docsDir)
    return files
  }

  getDaysSinceModified(modifiedDate) {
    const now = new Date()
    const diffTime = Math.abs(now - modifiedDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  getDocsWithCodeExamples() {
    const mdFiles = this.getAllMarkdownFiles()
    const result = []
    
    mdFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8')
      const codeBlocks = content.match(/```[\s\S]*?```/g) || []
      
      if (codeBlocks.length > 0) {
        result.push({ file, codeBlocks })
      }
    })
    
    return result
  }

  isOutdatedCodeExample(codeBlock) {
    // Simple heuristics to detect potentially outdated code
    const outdatedPatterns = [
      /class\s+\w+\s+extends\s+React\.Component/, // Old class components
      /var\s+\w+\s*=/, // Old var declarations
      /function\s+\w+\(\)/, // Old function syntax when arrow functions are preferred
      /@types\/node@\d+/, // Specific old version references
    ]
    
    return outdatedPatterns.some(pattern => pattern.test(codeBlock))
  }

  extractCrossReferences(content) {
    // Extract links to other documentation files
    const linkPattern = /\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g
    const references = []
    let match
    
    while ((match = linkPattern.exec(content)) !== null) {
      references.push({
        text: match[1],
        path: match[2]
      })
    }
    
    return references
  }

  isValidReference(reference) {
    // Check if the referenced file exists
    const fullPath = path.resolve(this.docsDir, reference.path)
    return fs.existsSync(fullPath)
  }
}

// Usage
if (require.main === module) {
  const checker = new DocsFreshnessChecker()
  checker.checkDocumentFreshness()
  checker.checkCodeExampleFreshness()
  checker.checkCrossReferences()
  
  const report = checker.generateFreshnessReport()
  console.log(JSON.stringify(report, null, 2))
}

module.exports = DocsFreshnessChecker
```

## Implementation Checklist

### Immediate Actions (Week 1)

- [ ] Set up Husky and lint-staged
- [ ] Configure enhanced ESLint rules
- [ ] Implement pre-commit hooks
- [ ] Set up SonarCloud integration
- [ ] Configure Dependabot

### Short-term Goals (Month 1)

- [ ] Implement comprehensive security scanning
- [ ] Set up performance monitoring
- [ ] Configure automated quality reports
- [ ] Implement health checks
- [ ] Set up documentation validation

### Long-term Objectives (Quarter 1)

- [ ] Establish quality metrics dashboard
- [ ] Implement advanced security monitoring
- [ ] Set up automated compliance checking
- [ ] Create quality gate automation
- [ ] Establish team training programs

### Documentation Quality Checklist

#### Content Quality Standards
- [ ] **Accuracy**: All information is current and correct
- [ ] **Completeness**: All necessary information is included
- [ ] **Clarity**: Content is easy to understand and follow
- [ ] **Consistency**: Terminology and formatting are consistent
- [ ] **Accessibility**: Content is accessible to target audience

#### Technical Standards
- [ ] **Link Validation**: All links work and point to correct resources
- [ ] **Code Examples**: All code examples are tested and current
- [ ] **Cross-references**: All internal references are valid
- [ ] **Structure**: Document structure follows established patterns
- [ ] **Metadata**: Proper frontmatter and metadata included

#### Maintenance Standards
- [ ] **Review Schedule**: Regular review dates established
- [ ] **Update Triggers**: Process for updating when code changes
- [ ] **Feedback Integration**: User feedback incorporated regularly
- [ ] **Version Control**: Changes tracked and documented
- [ ] **Deprecation**: Outdated content properly marked or removed

---

**Related Documentation:**
- [Quality Metrics and Reporting](quality-metrics-and-reporting.md) - Documentation metrics
- [QA Philosophy & Strategy](qa-philosophy-and-strategy.md) - Quality standards
- [Git Workflows and Hooks](git-workflows-and-hooks.md) - Documentation in development workflow

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025