# CRM7 QA Quick Reference Guide
**Quick access to QA tools, commands, and resources**

---

## 🚀 Quick Start

### Run Automated QA Suite
```bash
node scripts/qa-automated-suite.mjs
```

### Check Specific Areas
```bash
# TypeScript errors
npm run typecheck

# Build production
npm run build

# Linting
npm run lint

# Security audit
npm audit --production

# Console statements
grep -r "console\." src --include="*.tsx" --include="*.ts" | wc -l
```

---

## 📋 Current Status Dashboard

### Automated Test Results
**Last Run:** October 14, 2025
**Overall Score:** 71.4% (20/28 passed)
**Deployment Status:** ⚠️ NEEDS WORK

| Category | Score | Status |
|----------|-------|--------|
| Build & Compilation | 4/5 | 🟡 Good |
| Code Quality | 1/4 | 🔴 Poor |
| Dependencies | 0/3 | 🔴 Critical |
| Configuration | 4/4 | 🟢 Excellent |
| File Structure | 8/8 | 🟢 Excellent |
| Accessibility | 4/4 | 🟢 Excellent |

---

## 🔴 Critical Issues (Must Fix Before Deployment)

### 1. Database Schema Mismatch
**File:** COMPREHENSIVE_QA_REPORT.md (Section 1)
**Action:** Resolve which schema is correct, apply migrations
**Blocker:** YES

### 2. TypeScript Errors: 743
**File:** COMPREHENSIVE_QA_REPORT.md (Section 2)
**Action:** Fix top 50 critical errors
**Blocker:** Partial

### 3. Console Statements: 95
**File:** COMPREHENSIVE_QA_REPORT.md (Section 6)
**Action:** Audit and replace with logger
**Blocker:** NO (but security risk)

---

## 📚 Documentation Map

### Primary Documents
| Document | Purpose | Priority | Size |
|----------|---------|----------|------|
| **COMPREHENSIVE_QA_REPORT.md** | Complete gap analysis | 🔴 Critical | 11,500 words |
| **TESTING_STRATEGY.md** | Test implementation guide | 🟠 High | 5,500 words |
| **QA_IMPLEMENTATION_SUMMARY.md** | Executive summary | 🟠 High | 3,000 words |
| **QA_QUICK_REFERENCE.md** | This file | 🟡 Medium | Quick ref |

### Supporting Documents
- `SMOKE_TEST_PLAN.md` - Manual test checklist
- `QUALITY_CHECKLIST.md` - Quality standards
- `QA_AUDIT_COMPLETE.md` - Previous audit results
- `DATABASE_SCHEMA.md` - Database documentation

---

## 🛠️ Tools and Scripts

### Available Scripts
```bash
# Run full QA suite
node scripts/qa-automated-suite.mjs

# Run tests (when implemented)
npm run test                    # Unit tests
npm run test:coverage          # With coverage report
npm run test:watch             # Watch mode
npm run test:ui                # Interactive UI

# E2E tests (when implemented)
npx playwright test            # Run E2E tests
npx playwright test --ui       # Interactive mode
npx playwright test --headed   # See browser

# Quality checks
npm run lint                   # ESLint
npm run lint:fix              # Auto-fix linting
npm run typecheck             # TypeScript check
npm run build                 # Production build
```

### Manual Checks
```bash
# Find console statements
grep -r "console\." src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "logger"

# Count TypeScript errors
npm run typecheck 2>&1 | grep "error TS" | wc -l

# Find TODO comments
grep -r "TODO\|FIXME\|HACK\|XXX" src --include="*.tsx" --include="*.ts"

# Check hardcoded URLs
grep -r "https://\|http://" src --include="*.tsx" --include="*.ts" | grep -v "node_modules"

# Security audit
npm audit --production

# Check outdated packages
npm outdated
```

---

## ⏱️ Implementation Timeline

### Week 1: Critical Path (MUST DO)
**Goal:** Resolve blockers, enable deployment

- [ ] Day 1-2: Database schema resolution
- [ ] Day 3-4: Authentication testing
- [ ] Day 5: TypeScript error triage
- [ ] Day 6: Security audit
- [ ] Day 7: Re-run QA suite

**Target:** Deployment readiness: READY (90%+ pass rate)

### Week 2: High Priority (SHOULD DO)
**Goal:** Implement testing, API endpoints

- [ ] Day 1-3: API implementation
- [ ] Day 4-5: Basic test suite (30% coverage)
- [ ] Day 6: Accessibility testing
- [ ] Day 7: Mobile testing plan

**Target:** Test coverage: 30%, All APIs implemented or documented

### Week 3: Medium Priority (NICE TO HAVE)
**Goal:** Mobile testing, performance, docs

- [ ] Day 1-2: Mobile device testing
- [ ] Day 3-4: Performance optimization
- [ ] Day 5: Documentation completion
- [ ] Day 6-7: Buffer for issues

**Target:** Production hardened, ready for users

---

## 📊 Metrics Tracking

### Current Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| QA Pass Rate | 71.4% | >90% | 🔴 |
| TypeScript Errors | 743 | <50 | 🔴 |
| Test Coverage | 0% | >80% | 🔴 |
| Console Statements | 95 | <10 | 🔴 |
| Build Success | 100% | 100% | 🟢 |
| Bundle Size | 1.6M | <2M | 🟢 |
| Security Vulns | Unknown | 0 | 🔴 |
| Accessibility | Good | >90 | 🟡 |

### Track Progress
```bash
# Re-run QA suite
node scripts/qa-automated-suite.mjs

# Check coverage (when tests exist)
npm run test:coverage

# Build size
npm run build && du -sh dist/
```

---

## 🎯 Success Criteria Quick Check

### Minimum Viable Deployment
- [ ] Database schema resolved
- [ ] Build succeeds consistently
- [ ] Authentication works end-to-end
- [ ] Critical TypeScript errors fixed (<50)
- [ ] Security audit clean (no critical vulnerabilities)
- [ ] Console statements audited (<10)
- [ ] QA pass rate >90%

### Production Ready
- All Minimum Viable ✅
- [ ] Test coverage >60%
- [ ] Accessibility score >85
- [ ] Mobile tested on real devices
- [ ] Error tracking configured
- [ ] API endpoints implemented

### Production Hardened
- All Production Ready ✅
- [ ] Test coverage >80%
- [ ] Accessibility score >95
- [ ] E2E tests covering critical paths
- [ ] Performance monitoring active
- [ ] Documentation complete

---

## 🚨 Emergency Checklist

### Before Deployment
```bash
# 1. Run QA suite
node scripts/qa-automated-suite.mjs

# 2. Must pass these:
npm run lint          # No errors
npm run typecheck     # <50 errors acceptable
npm run build         # Must succeed
npm audit --production  # No critical/high vulns

# 3. Manual checks:
# - Database schema correct
# - Environment variables set
# - Authentication tested
# - At least smoke tests pass
```

### After Deployment Issues
```bash
# Check deployment logs
vercel logs --follow

# Check build output
npm run build

# Verify environment variables
# Go to Vercel Dashboard → Settings → Environment Variables

# Check database
# Go to Supabase Dashboard → SQL Editor

# Roll back if needed
# Previous deployment in Vercel Dashboard → Deployments
```

---

## 📞 Getting Help

### Common Issues

**Q: QA suite shows 743 TypeScript errors**
A: This is expected. Focus on critical errors first. See COMPREHENSIVE_QA_REPORT.md Section 2.

**Q: Database tables don't exist**
A: Schema mismatch. See COMPREHENSIVE_QA_REPORT.md Section 1. Apply migrations from `supabase/migrations/`.

**Q: Build succeeds but app shows white page**
A: Check console for errors. See WHITE_PAGE_FIX_COMPLETE.md.

**Q: How do I run tests?**
A: Tests not yet implemented. See TESTING_STRATEGY.md for setup guide.

**Q: Deployment readiness shows "NEEDS WORK"**
A: Follow Week 1 timeline in COMPREHENSIVE_QA_REPORT.md to resolve blockers.

### Resources
- **Full Gap Analysis:** COMPREHENSIVE_QA_REPORT.md
- **Testing Guide:** TESTING_STRATEGY.md
- **Implementation Summary:** QA_IMPLEMENTATION_SUMMARY.md
- **Deployment Guide:** DEPLOYMENT_CHECKLIST.md
- **Database Info:** DATABASE_SCHEMA.md

---

## 🎉 Quick Wins

### Things You Can Fix Right Now

1. **Add test script to package.json:**
```json
{
  "scripts": {
    "qa:check": "node scripts/qa-automated-suite.mjs",
    "qa:security": "npm audit --production",
    "qa:console": "grep -r 'console\\.' src --include='*.tsx' --include='*.ts' | grep -v node_modules | grep -v logger"
  }
}
```

2. **Fix ESLint issues:**
```bash
npm run lint:fix
```

3. **Update outdated packages:**
```bash
npm outdated
npm update  # For minor updates
```

4. **Run security fixes:**
```bash
npm audit fix
```

5. **Add QA check to CI/CD:**
Add to `.github/workflows/ci.yml`:
```yaml
- name: Run QA Suite
  run: node scripts/qa-automated-suite.mjs
```

---

## 🔄 Regular Maintenance

### Daily (During Development)
- Run `npm run typecheck` before commit
- Check `npm run build` succeeds
- Review new console statements

### Weekly
- Run full QA suite: `node scripts/qa-automated-suite.mjs`
- Review test coverage (when tests exist)
- Check for dependency updates
- Run security audit

### Monthly
- Full accessibility audit
- Performance testing
- Mobile device testing
- Documentation review
- Security penetration testing

---

**Last Updated:** October 14, 2025
**Next Update:** After Phase 1 completion
**Maintained By:** Development Team

---

## 🎯 One-Liner Commands

```bash
# Quick health check
node scripts/qa-automated-suite.mjs && echo "✅ Ready!" || echo "❌ Not ready"

# Pre-commit check
npm run lint && npm run typecheck && npm run build

# Pre-deployment check
node scripts/qa-automated-suite.mjs && npm audit --production && echo "🚀 Deploy!" || echo "🛑 Fix issues first"

# Count remaining issues
echo "TypeScript: $(npm run typecheck 2>&1 | grep 'error TS' | wc -l) errors" && echo "Console: $(grep -r 'console\.' src --include='*.tsx' --include='*.ts' | grep -v node_modules | grep -v logger | wc -l) statements"
```

---

**🚀 Remember:** Quality is not a one-time task. Use these tools regularly to maintain production readiness!
