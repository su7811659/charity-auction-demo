# Alembic Migrations Guide  

This directory (`migrations/`) is responsible for managing database migrations using Alembic to track and apply schema changes.  

## Directory Structure  
- `env.py`: Core Alembic configuration file that controls how migrations are executed.  
- `alembic.ini`: Main configuration file defining database connection settings.  
- `versions/`: Contains all migration scripts tracking schema changes over time.  

## Usage  

### 1. Initialize Alembic (if not already initialized)  
```bash
alembic init migrations
```

### 2. Generate a New Migration Script
When changes are made to models.py, generate a migration script automatically:
```bash
alembic revision --autogenerate -m "Describe the changes"
```

### 3. Apply Migrations (Upgrade)
Apply all pending migrations to the database:
```bash
alembic upgrade head
```

### 4. Roll Back to the Previous Version
If you need to undo the last migration, run:
```bash
alembic downgrade -1
```

### 5. View Migration History
Check all migration versions:
```bash
alembic history --verbose
```

### 6. Check the Current Database Version
```bash
alembic current
```

## Important Notes
1. SQLite Limitations:
    - SQLite does not support `ALTER COLUMN`. To modify `nullable=False`, a new table must be created with data migration.
    - Dropping columns in SQLite usually requires rebuilding the table instead of using `drop_column`.
2. Version Control:
    - Migration scripts in `migrations/versions/` should be committed to Git, but do not track `__pycache__/`.
3. Check `env.py`:
    - Ensure `target_metadata` correctly points to `Base.metadata` to allow `--autogenerate` to work properly.