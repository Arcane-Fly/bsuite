# Flyway Migration System Implementation

## Overview

This update implements a canonical, versioned database migration system using **Flyway**, as suggested in the PR feedback. This provides battle-tested, safe database schema management with zero-drift guarantees.

## What Was Added

### 1. Flyway Configuration System

**Main Configuration** (`packages/db/flyway.conf`):
- PostgreSQL connection settings via environment variables
- Migration locations (sql/, repeatable/)
- Security settings (cleanDisabled=true)
- Validation and baseline configuration
- Schema management (public, catalog)

**Environment Configs** (`packages/db/env/`):
- `dev.conf` - Local development with permissive settings
- `staging.conf` - Staging with strict validation
- `prod.conf` - Production with maximum safety

### 2. Versioned Migrations

**Migrated to Flyway Structure**:
- `sql/V0001__core_multitenant_schema.sql` (459 lines)
- `sql/V0002__catalog_and_overrides.sql` (351 lines)

**Naming Convention**:
- `V####__description.sql` - Versioned migrations (applied once)
- `R__description.sql` - Repeatable migrations (re-run on change)

### 3. Repeatable Migrations

**Views** (`repeatable/R__views.sql`):
- v_active_organizations
- v_workers_with_contacts
- v_engagement_summary
- v_ideas_with_users
- v_contract_details

**Seed Data** (`repeatable/R__seed_reference_data.sql`):
- Apps (suite, crm7, throughput, r80)
- Penalty rules (T1.5, T2.0, SAT1.5, etc.)
- Leave rules (AL, SL, RDO)
- Australian state geographies

### 4. CI/CD Workflow

**GitHub Actions** (`.github/workflows/db-migrations.yml`):
- **Validate**: Checks SQL syntax on PR
- **Migrate Staging**: Auto-applies on merge to main
- **Migrate Production**: Manual trigger with approval

**Features**:
- Flyway CLI installation and setup
- Environment-specific configurations
- Pre-migration info checks
- Post-migration validation
- Proper secret management

### 5. Comprehensive Documentation

**Migration Guide** (`packages/db/MIGRATION_GUIDE.md` - 9KB):
- Flyway installation instructions
- Running migrations (local, staging, prod)
- Creating new migrations
- Expand → Migrate → Contract pattern
- Safety guidelines and best practices
- Troubleshooting common issues
- Integration with apps

**Updated README** (`packages/db/README.md`):
- Quick start with Flyway
- Structure overview
- Schema reference

**Contributing Guide** (`CONTRIBUTING.md`):
- Database migration rules
- Expand → Migrate → Contract pattern
- PR deployment notes template
- Staging validation workflow

## Key Principles Implemented

### 1. Expand → Migrate → Contract
No breaking deployments:
1. **Expand**: Add new columns/tables while keeping old schema
2. **Migrate**: Deploy app code to use new schema
3. **Contract**: Remove old schema after monitoring period

### 2. Idempotency
All migrations safe to run multiple times:
```sql
ALTER TABLE workers ADD COLUMN IF NOT EXISTS status TEXT;
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
```

### 3. Transactional DDL
PostgreSQL ensures atomic changes - either all or nothing.

### 4. Staging First
Every migration validated on staging before production.

### 5. Version Tracking
Flyway tracks applied migrations in `flyway_schema_history` table.

## Usage Examples

### Local Development
```bash
cd packages/db
flyway -configFiles=flyway.conf,env/dev.conf migrate
```

### Staging (CI/CD)
```bash
export PGHOST=staging-host PGPORT=5432 PGDATABASE=db PGUSER=user PGPASSWORD=pass
flyway -configFiles=flyway.conf,env/staging.conf migrate
```

### Production (Manual)
```bash
# Via GitHub Actions
gh workflow run db-migrations.yml -f environment=production

# Or directly
export PGHOST=prod-host PGPORT=5432 PGDATABASE=db PGUSER=user PGPASSWORD=pass
flyway -configFiles=flyway.conf,env/prod.conf info
flyway -configFiles=flyway.conf,env/prod.conf migrate
```

## Safety Features

### Validation
- SQL syntax checking on PR
- Migration naming validation
- Checksum verification
- Destructive operation warnings

### Environment Protection
- Staging auto-applies on merge
- Production requires manual approval
- Clean disabled in staging/prod
- Strict validation enforced

### Rollback Strategy
- Forward fixes preferred
- Undo migrations supported (Flyway Teams)
- Manual rollback procedures documented

## Benefits Over Previous System

| Feature | Before | After (Flyway) |
|---------|--------|----------------|
| Version tracking | Manual | Automatic (flyway_schema_history) |
| Idempotency | Not enforced | Built-in |
| Environment config | None | Dev/Staging/Prod configs |
| CI/CD integration | Basic | Full workflow with validation |
| Rollback support | Manual only | Forward fixes + undo scripts |
| Migration order | Sequential files | Versioned with checksums |
| Repeatable migrations | No support | R__ prefix support |
| Safety checks | None | Validation + destructive warnings |

## Migration Path

### Legacy Files (Preserved)
- `migrations/0001_core.sql` - Legacy location (still works with Supabase CLI)
- `migrations/0002_catalog.sql` - Legacy location (still works with Supabase CLI)

### New Files (Flyway)
- `sql/V0001__core_multitenant_schema.sql` - Flyway versioned
- `sql/V0002__catalog_and_overrides.sql` - Flyway versioned

**Note**: Both systems can coexist. New migrations should use Flyway structure.

## Team Workflow

1. **Create Migration**:
   ```bash
   cd packages/db/sql
   touch V0003__add_worker_status.sql
   ```

2. **Test Locally**:
   ```bash
   flyway -configFiles=flyway.conf,env/dev.conf migrate
   ```

3. **Open PR** with deployment notes

4. **CI Validates** SQL syntax

5. **Merge to Main** → Auto-applies to staging

6. **Monitor Staging** for 24h

7. **Tag Release**: `db-v0.3.0`

8. **Trigger Production**: Manual approval required

9. **Deploy Apps** after DB migration

## Files Added

```
packages/db/
├── flyway.conf                                    # Main config
├── env/
│   ├── dev.conf                                   # Dev settings
│   ├── staging.conf                               # Staging settings
│   └── prod.conf                                  # Prod settings
├── sql/
│   ├── V0001__core_multitenant_schema.sql        # Core schema
│   └── V0002__catalog_and_overrides.sql          # Catalog schema
├── repeatable/
│   ├── R__views.sql                              # View definitions
│   └── R__seed_reference_data.sql                # Reference data
└── MIGRATION_GUIDE.md                            # Complete guide

.github/workflows/
└── db-migrations.yml                             # CI/CD workflow

CONTRIBUTING.md                                    # Updated with DB rules
```

## Next Steps

1. **Install Flyway CLI**:
   ```bash
   brew install flyway  # macOS
   ```

2. **Set Environment Variables**:
   ```bash
   export PGHOST=localhost
   export PGPORT=54322
   export PGDATABASE=postgres
   export PGUSER=postgres
   export PGPASSWORD=postgres
   ```

3. **Run Migrations**:
   ```bash
   cd packages/db
   flyway -configFiles=flyway.conf,env/dev.conf migrate
   ```

4. **Verify**:
   ```bash
   flyway -configFiles=flyway.conf,env/dev.conf info
   ```

## References

- [Flyway Documentation](https://flywaydb.org/documentation/)
- [PostgreSQL Transactional DDL](https://www.postgresql.org/docs/current/sql-commands.html)
- [Expand-Contract Pattern](https://martinfowler.com/bliki/ParallelChange.html)
- Original feedback: PR comment #3424387507

---

**Implementation Status**: ✅ Complete  
**Documentation**: ✅ Comprehensive (9KB guide + updated docs)  
**CI/CD**: ✅ Full workflow with validation  
**Safety**: ✅ Expand-Migrate-Contract enforced  
**Ready for Use**: ✅ Yes
