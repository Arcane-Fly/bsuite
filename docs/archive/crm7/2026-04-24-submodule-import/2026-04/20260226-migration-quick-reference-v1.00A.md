# 🚀 CRM7 Migration Quick Reference

## Run All Migrations in 3 Steps

### Step 1: Open Supabase SQL Editor
Go to: https://app.supabase.com → Your Project → **SQL Editor** → **New Query**

### Step 2: Copy & Run Migration
Copy the entire contents of:
```
supabase/migrations/run_all_migrations.sql
```
Paste in SQL Editor and click **Run** (or `Ctrl+Enter`)

### Step 3: Verify Migration
Create another new query, copy:
```
supabase/migrations/verify_migrations.sql
```
Run it and check results:
- ✅ Expected: **14 tables, 8 functions, 2 triggers, 14 RLS tables, 3 indexes**

---

## What You Get

| Component | Count | What It Includes |
|-----------|-------|------------------|
| **Tables** | 14 | Organizations, profiles, awards, inspections, workflows, reports |
| **Functions** | 8 | Role checking, org membership, auto-triggers, calendar |
| **Triggers** | 2 | Auto-profile creation, timestamp updates |
| **RLS Policies** | 14 | Complete row-level security on all tables |
| **Indexes** | 3 | Performance optimization for profiles |

---

## User Roles (Auto-Assigned by Email)

| Email Domain | Role | Access Level |
|--------------|------|--------------|
| `@bradengroup.com.au` | **admin** | Full system access |
| `@crm7.app` | **developer** | Development & admin access |
| Other | **apprentice** | Basic access (default) |

**All roles:** admin, developer, organization_admin, field_officer, host_employer, apprentice, rto_admin

---

## Environment Variables

After migration, configure your app:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in: **Supabase Dashboard → Settings → API**

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "relation already exists" | ✅ Normal - migrations are idempotent, safe to re-run |
| "permission denied" | ❌ Must use Supabase SQL Editor, not local client |
| Missing tables | 🔄 Re-run migration, check for errors in output |
| Can't find migration file | 📁 Files are in `supabase/migrations/` directory |

---

## Need More Help?

- 📖 **Full Guide:** [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- 🔐 **Authentication:** [docs/reference/AUTHENTICATION.md](docs/reference/AUTHENTICATION.md)  
- 🚀 **Deployment:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

---

## Test Your Migration

After running migrations, test with:

```sql
-- Should return your new profile after signup
SELECT * FROM public.profiles;

-- Check RLS is working
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

---

## 🎉 You're Done!

Your CRM7 database is ready. Next steps:

1. ✅ Migrations complete
2. 📝 Set environment variables
3. 🚀 Deploy application
4. 🧪 Test authentication
5. 👥 Create organizations and invite users

**Happy building! 🛠️**
