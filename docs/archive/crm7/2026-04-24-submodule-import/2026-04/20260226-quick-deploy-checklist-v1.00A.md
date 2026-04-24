# CRM7 Quick Deployment Checklist

## ✅ Pre-Deployment (5 minutes)

### 1. Set Vercel Environment Variables
Go to: https://vercel.com/dashboard → [Your Project] → Settings → Environment Variables

Add these to **Production** environment:
```
VITE_SUPABASE_URL = https://tuybltdrdefjblnplpqo.supabase.co
VITE_SUPABASE_ANON_KEY = [your-key-from-supabase-dashboard]
```

### 2. Verify Vercel Build Settings
- **Framework**: Vite (auto-detected)
- **Node Version**: 22.x
- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install --frozen-lockfile`
- **Output Directory**: `dist`

## ✅ Database Migration (10-15 minutes)

### Step 1: Backup Existing Database
```bash
# In Supabase Dashboard → Database → Backups
# Or via CLI:
pg_dump -h db.tuybltdrdefjblnplpqo.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migrations in Order
Open Supabase SQL Editor: https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo/sql

**Execute these files in order** (copy/paste contents into SQL editor):

1. **Core Foundation** (2-3 min)
   - File: `supabase/migrations/20250614_business_suite_unified_core.sql`
   - Creates: tenants, subscription_plans, user_tenants, permissions, roles_permissions
   - Run and verify: `SELECT COUNT(*) FROM tenants;`

2. **Shared Entities** (2-3 min)
   - File: `supabase/migrations/20250614_business_suite_shared_entities.sql`
   - Creates: contacts, clients, projects, project_members, financial_records
   - Run and verify: `SELECT COUNT(*) FROM contacts;`

3. **CRM7 Apprenticeships** (2-3 min)
   - File: `supabase/migrations/20250614_crm7_apprenticeship_tables.sql`
   - Creates: apprentices, host_employers, training_companies, award_rates, placements, mentors, field_officers
   - Run and verify: `SELECT COUNT(*) FROM apprentices;`

### Step 3: Verify Migration Success
```sql
-- Check tables created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'apprentices', 'contacts', 'clients');

-- Check RLS enabled (should return 15+ rows)
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

-- Check policies exist (should return 30+ rows)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
```

### Step 4: Seed Initial Tenant (Replace with your details)
```sql
-- Create your GTO tenant
INSERT INTO tenants (name, slug, industry, status)
VALUES ('Your GTO Name', 'your-gto-slug', 'Training', 'active')
RETURNING id;

-- Get your user ID from auth.users
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Assign yourself as owner with Enterprise plan
INSERT INTO user_tenants (user_id, tenant_id, role, subscription_plan_id)
VALUES (
  '<your-user-id-from-above>',
  (SELECT id FROM tenants WHERE slug = 'your-gto-slug'),
  'owner',
  (SELECT id FROM subscription_plans WHERE slug = 'enterprise')
);
```

## ✅ Deploy to Vercel (2 minutes)

### Option 1: Auto-Deploy (Recommended)
```bash
git add .
git commit -m "Production ready: Fixed rendering issues and added unified database schema"
git push origin main
```
Vercel will automatically detect the push and deploy.

### Option 2: Manual Deploy
```bash
vercel --prod
```

## ✅ Post-Deployment Verification (5 minutes)

### Visual Checks
1. Visit your production URL
2. **No warning banner** should appear (was: "Configuration Warning")
3. **Only one** "Skip to main content" link at top
4. **Cyan/green branding** visible (CRM7 theme)
5. **Logo displays** correctly in header
6. **Theme toggle works** (light/dark switch)

### Functional Checks
1. **Login works**: Click login, enter credentials
2. **Dashboard loads**: No errors in browser console (F12)
3. **Navigation works**: Click through menu items
4. **No permission errors**: Database queries execute successfully

### Browser Console Check (F12 → Console Tab)
Should see:
- ✅ No red errors related to CSS variables
- ✅ No "undefined Supabase" errors
- ✅ Supabase client initialized successfully

Should NOT see:
- ❌ CSS variable warnings (e.g., "var(--bg-body) is undefined")
- ❌ Failed to load resources (404s)
- ❌ RLS policy violations

## 🚨 Common Issues & Quick Fixes

### Issue: Configuration warning still visible
**Fix**: Environment variables not set or not in Production environment
1. Go to Vercel → Settings → Environment Variables
2. Ensure vars are in **Production** (not just Development)
3. Redeploy: Vercel → Deployments → [...] → Redeploy

### Issue: CSS looks broken
**Fix**: Browser cache or build cache issue
1. Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear Vercel cache: Settings → General → Clear Cache → Deploy

### Issue: Database queries fail with permission error
**Fix**: User not added to tenant or RLS blocking
```sql
-- Check user tenant membership
SELECT * FROM user_tenants WHERE user_id = '<your-user-id>';

-- If empty, add yourself:
INSERT INTO user_tenants (user_id, tenant_id, role, subscription_plan_id)
VALUES (
  '<your-user-id>',
  (SELECT id FROM tenants LIMIT 1),
  'owner',
  (SELECT id FROM subscription_plans WHERE slug = 'enterprise')
);
```

### Issue: Throughput app broken
**Fix**: Ensure shared tables still accessible
```sql
-- Verify existing Throughput tables intact
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'idea%';

-- Check RLS policies allow access
SELECT * FROM pg_policies WHERE tablename = 'ideas';
```

## 📞 Support Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/tuybltdrdefjblnplpqo
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Implementation Doc**: See `IMPLEMENTATION_COMPLETE_2025-01-14.md`
- **Database Guide**: See `supabase/migrations/README_UNIFIED_SCHEMA.md`
- **Architecture**: See `docs/architecture/DATA_INTERCONNECTIVITY_PROGRESS.md`

## ⏱️ Total Time Estimate

| Task | Time |
|------|------|
| Set environment variables | 2 min |
| Backup database | 2 min |
| Run migrations | 10 min |
| Seed initial tenant | 3 min |
| Deploy to Vercel | 2 min |
| Verify deployment | 5 min |
| **Total** | **~24 minutes** |

## ✅ Success Criteria

- [ ] No warning banner on production site
- [ ] One skip navigation link (not two)
- [ ] CRM7 cyan/green theme displays correctly
- [ ] Logo visible and professional
- [ ] User can login successfully
- [ ] Dashboard loads without errors
- [ ] Database queries execute (no RLS errors)
- [ ] Throughput app still works (if deployed)

---

**You're ready to deploy!** 🚀

Follow the checklist top to bottom, and you'll have CRM7 production-ready in under 30 minutes.
