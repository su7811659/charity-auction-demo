# Database Seeding Scripts

This directory contains scripts to populate your database with fake data for testing purposes.

## Scripts

### 1. `quick_seed.py` - One-Command Setup (Recommended)

This script does everything in one command - creates products and adds interactions.

**Usage:**
```bash
# Create 50 products with interactions (default)
python quick_seed.py

# Create specific number of products with interactions
python quick_seed.py 100
```

**Note:** Run from the `backend/scripts` directory

### 2. `seed_data.py` - Generate Fake Products

This script creates fake product data with realistic information.

**Usage:**
```bash
# Create 50 products (default)
python seed_data.py

# Create specific number of products
python seed_data.py 100

# Clear all products (with confirmation)
python seed_data.py clear
```

**Note:** Run from the `backend/scripts` directory

**Features:**
- Generates realistic product names, descriptions, and prices
- Uses real image URLs from Unsplash
- Creates varied product conditions (1-4)
- Sets random AI ratings and comments
- Distributes products across different statuses (pending, approved, sold)
- Uses realistic seller names and nicknames
- Sets random donation ratios

### 3. `seed_interactions.py` - Add Fake Likes and Comments

This script adds fake likes and comments to existing products.

**Usage:**
```bash
# Add both likes and comments (default)
python seed_interactions.py

# Add only likes
python seed_interactions.py likes 100

# Add only comments
python seed_interactions.py comments 50

# Show database statistics
python seed_interactions.py stats

# Add both and show stats
python seed_interactions.py all
```

**Note:** Run from the `backend/scripts` directory

**Features:**
- Adds realistic likes from random users
- Creates varied comment content
- Avoids duplicate likes (respects unique constraints)
- Shows database statistics

## Quick Start

### Option 1: One-Command Setup (Recommended)
```bash
cd backend/scripts
python quick_seed.py 50  # Creates 50 products with likes and comments
```

### Option 2: Step-by-Step Setup
1. **First, create products:**
   ```bash
   cd backend/scripts
   python seed_data.py 50
   ```

2. **Then add interactions:**
   ```bash
   python seed_interactions.py all
   ```

3. **Check your data:**
   ```bash
   python seed_interactions.py stats
   ```

## Data Structure

The fake data includes:

### Products
- **Seller Information**: Realistic Chinese names and nicknames
- **Product Details**: Tech gadgets, clothing, accessories, etc.
- **Pricing**: Random prices between $100-$50,000
- **Conditions**: 1-4 scale (全新 to 低於五成新)
- **AI Ratings**: 1-5 scale with comments
- **Status**: Pending approval, approved, or sold
- **Donation Ratios**: 0%, 20%, 40%, 60%, 80%, or 100%

### Interactions
- **Likes**: Random user IDs (1-20) liking random products
- **Comments**: Realistic Chinese comments about products

## Database Statistics

After running the scripts, you can check:
- Total number of products
- Number of approved products
- Number of sold products
- Total likes and comments
- Average interactions per product

## Notes

- The scripts use the same database connection as your main application
- Images are from Unsplash (free stock photos)
- All data is in Chinese to match your application's language
- The scripts are safe to run multiple times (likes won't duplicate)
- Use `seed_data.py clear` carefully - it deletes ALL products!

## Troubleshooting

If you get errors:
1. Make sure your database is running
2. Check that all required packages are installed
3. Ensure the database tables exist (run your main app first)
4. Check the database connection settings in `database.py` 