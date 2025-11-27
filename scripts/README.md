# Database Seed Scripts

This directory contains scripts to seed the database with initial data.

## Seed Categories

To populate the database with default categories, run:

```bash
npm run seed:categories
```

Or directly:

```bash
node scripts/seedCategories.js
```

### What it does:

- Creates 15 default categories including:
  - Electronics
  - Fashion
  - Home & Garden
  - Sports & Outdoors
  - Health & Beauty
  - Food & Beverages
  - Books & Media
  - Toys & Games
  - Automotive
  - Travel
  - Pet Supplies
  - Office Supplies
  - Jewelry
  - Baby & Kids
  - Software & Apps

### Notes:

- The script will skip seeding if categories already exist in the database
- If you want to re-seed, delete existing categories from the database first
- Make sure your MongoDB connection string is set in `.env` file (MONGODB_URI)

### Environment Variables Required:

```env
MONGODB_URI=mongodb://localhost:27017/dealcouponz
```

Or your MongoDB Atlas connection string.

