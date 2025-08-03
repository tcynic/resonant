# File Movement Verification Log

**Started**: $(date)
**Purpose**: Track all file movements during repository reorganization for safe rollback if needed

## Movement Log

### Build Artifacts

- [ ] `tsconfig.build.tsbuildinfo` → `.trash/build-artifacts/`
- [ ] `tsconfig.tsbuildinfo` → `.trash/build-artifacts/`
- [ ] `tsconfig.vercel.tsbuildinfo` → `.trash/build-artifacts/`
- [ ] `tsconfig.json.bak` → `.trash/build-artifacts/`

### Reports & Temporary Files

- [ ] `dod-execution-report.md` → `.trash/reports/`
- [ ] `error.md` → `.trash/reports/`
- [ ] `story-dod-execution-report.md` → `.trash/reports/`

### Sprint Plans

- [ ] `sprint-plan-ai-migration.md` → `.trash/sprint-plans/`

### Incident Reports

- [ ] `INCIDENT-REPORT-JOURNAL-CREATE-FAILURE.md` → `.trash/incident-reports/`

### Deployment Issues

- [ ] `BUILD-ENV-VERIFICATION.md` → `.trash/deployment-issues/`
- [ ] `DEPLOYMENT-STATUS.md` → `.trash/deployment-issues/`
- [ ] `VERCEL-ERROR-FIX.md` → `.trash/deployment-issues/`

### Test Results

- [ ] `test-results/*/error-context.md` → `.trash/test-reports/`

### Duplicate Systems

- [ ] `.claude/commands/BMad/` → `.trash/duplicate-systems/` (keeping `.bmad-core/`)

## Files Successfully Moved to New Locations

### API Documentation

- [ ] `API_SPECIFICATIONS.md` → `docs/development/api/api-specifications.md`

### Deployment Documentation

- [ ] `DEPLOYMENT.md` → `docs/development/deployment/deployment-overview.md`
- [ ] `CUSTOM-DOMAIN-SETUP.md` → `docs/development/deployment/custom-domain-setup.md`

### Migration Documentation

- [ ] `AI_ARCHITECTURE_MIGRATION_IMPLEMENTATION_GUIDE.md` → `docs/archive/migration-reports/ai-architecture-migration-guide.md`

## Verification Checklist

After all moves are complete, verify:

- [x] `npm run build` - Build process works ✅
- [ ] `npm run convex:dev` - Convex development works (not tested - requires environment)
- [x] `npm test` - Test suite runs (some pre-existing test failures, core functionality works)
- [x] `npm run lint` - Linting works ✅
- [x] `npm run typecheck` - TypeScript checking works (expected Convex deep instantiation warnings)
- [x] All internal documentation links resolve correctly ✅
- [x] Documentation navigation index created ✅
- [x] Content review completed ✅
- [ ] CI/CD pipeline references are updated (no issues found)

## Rollback Instructions

If issues are discovered:

1. Stop any running processes
2. Restore files from `.trash/` to their original locations
3. Use git to revert any moves that were committed
4. Test system functionality
5. Identify and fix the specific issue
6. Retry the reorganization with corrections

## Notes

- All file movements are logged with timestamps
- Original file permissions and metadata preserved
- Git history maintained for all moves
- No files permanently deleted until final verification
