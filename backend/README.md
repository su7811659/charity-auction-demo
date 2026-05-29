# Backend

This is the FastAPI backend for the application.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   python main.py
   ```

## Database Scripts

For database seeding and management scripts, see the `scripts/` folder:

```bash
cd scripts
python quick_seed.py 50  # Create 50 fake products with interactions
```

See `scripts/README_SEED_DATA.md` for detailed documentation.

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc 