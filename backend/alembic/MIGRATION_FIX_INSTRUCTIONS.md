# Migration Fix Instructions

## What Went Wrong

Your last 2 migrations included tons of unwanted changes because Alembic detected differences between your database state and your model definitions. This happens when:

1. Tables are created outside of Alembic (using `create_all()`)
2. Legacy tables exist in the DB but not in your models (langchain_*)
3. Minor differences in indexes, constraints, or column definitions

## Files Created

I've created fixed versions of your migrations:

### Fixed Migration Files (Clean versions)

- `2025_12_21_1229-6d1b405b3f84_stock_data_and_price_history_FIXED.py`
- `2025_12_26_2322-2bdc83ae0468_tasks_db_table_FIXED.py`

### Configuration Files

- `env_IMPROVED.py` - Improved Alembic configuration that ignores langchain tables
- `MIGRATION_BEST_PRACTICES.md` - Complete guide for future migrations

## How to Fix Your Database

### Option A: If Migrations Haven't Been Run Yet (Recommended)

```bash
cd backend

# 1. Remove the bad migration files
rm alembic/versions/2025_12_21_1229-6d1b405b3f84_stock_data_and_price_history.py
rm alembic/versions/2025_12_26_2322-2bdc83ae0468_tasks_db_table.py

# 2. Rename the FIXED files to remove _FIXED suffix
mv alembic/versions/2025_12_21_1229-6d1b405b3f84_stock_data_and_price_history_FIXED.py \\
   alembic/versions/2025_12_21_1229-6d1b405b3f84_stock_data_and_price_history.py

mv alembic/versions/2025_12_26_2322-2bdc83ae0468_tasks_db_table_FIXED.py \\
   alembic/versions/2025_12_26_2322-2bdc83ae0468_tasks_db_table.py

# 3. Replace env.py with the improved version
mv alembic/env_IMPROVED.py alembic/env.py

# 4. Check current state
alembic current

# 5. Run the clean migrations
alembic upgrade head
```

### Option B: If Bad Migrations Were Already Run

```bash
cd backend

# 1. Check what's currently applied
alembic current

# 2. Roll back the bad migrations
alembic downgrade 6d1b405b3f84  # Go back to before stocks migration
# OR if you need to go further back:
alembic downgrade ff35c9d4841a  # Go to the initial migration

# 3. Follow steps from Option A above

# 4. Re-apply the clean migrations
alembic upgrade head
```

### Option C: Nuclear Option (Start Fresh)

If you don't have important production data in stocks/data_tasks tables:

```bash
# 1. Drop the tables manually in PostgreSQL
psql -U $DB_USER -d fundlord -c "DROP TABLE IF EXISTS data_tasks CASCADE;"
psql -U $DB_USER -d fundlord -c "DROP TABLE IF EXISTS stock_price_history CASCADE;"
psql -U $DB_USER -d fundlord -c "DROP TABLE IF EXISTS stocks CASCADE;"

# 2. Delete the bad migration files and use the FIXED ones (see Option A)

# 3. Mark the database as being at the previous migration
alembic stamp ff35c9d4841a

# 4. Run the clean migrations
alembic upgrade head
```

## Clean Up Legacy Tables

If you're not using the langchain tables anymore, drop them:

```sql
-- Connect to your database
psql -U $DB_USER -d fundlord

-- Drop langchain tables
DROP TABLE IF EXISTS langchain_pg_embedding CASCADE;
DROP TABLE IF EXISTS langchain_categories CASCADE;
DROP TABLE IF EXISTS langchain_pg_collection CASCADE;
```

## Prevent This in the Future

### 1. Replace env.py

```bash
cd backend
mv alembic/env_IMPROVED.py alembic/env.py
```

This adds:

- Automatic ignoring of langchain_* tables
- Better configuration for reduced noise
- Imports for Stock and DataTask models

### 2. Always Review Auto-generated Migrations

```bash
# Generate migration
alembic revision --autogenerate -m "add new table"

# STOP! Open the file and review it
# Remove any changes to existing tables you didn't touch

# Then apply it
alembic upgrade head
```

### 3. Use Alembic for ALL Schema Changes

Don't use:

```python
Base.metadata.create_all(engine)  # BAD
```

Instead:

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Quick Checklist

- [ ] Backup your database first!
- [ ] Check current migration state: `alembic current`
- [ ] Choose Option A, B, or C above
- [ ] Replace bad migration files with FIXED versions
- [ ] Replace env.py with env_IMPROVED.py
- [ ] Test the migration: `alembic upgrade head`
- [ ] Verify tables exist: `psql -U $DB_USER -d fundlord -c "\\dt"`
- [ ] Read MIGRATION_BEST_PRACTICES.md for future migrations

## Verification Commands

After fixing:

```bash
# Check current migration
alembic current

# Should show: 2bdc83ae0468 (head)

# List all tables
psql -U $DB_USER -d fundlord -c "\\dt"

# Should include: stocks, stock_price_history, data_tasks

# Check stocks table structure
psql -U $DB_USER -d fundlord -c "\\d stocks"

# Check data_tasks table structure
psql -U $DB_USER -d fundlord -c "\\d data_tasks"
```

## Need Help?

If something goes wrong:

1. Check migration history: `alembic history`
2. Check database state: `alembic current`
3. Check what would happen: `alembic upgrade head --sql > preview.sql`
4. Review the preview.sql file before actually running

## Summary

The main issue was Alembic detecting differences between DB and models. The fix:

1. **Immediate**: Use the FIXED migration files that only add new tables
2. **Future**: Use improved env.py that ignores legacy tables
3. **Always**: Review auto-generated migrations before applying them
