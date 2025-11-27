const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/category');

// Load environment variables (same as app.js)
dotenv.config();

// Common categories to seed
const defaultCategories = [
  { name: 'Electronics', description: 'Electronic devices and gadgets' },
  { name: 'Fashion', description: 'Clothing, accessories, and fashion items' },
  { name: 'Home & Garden', description: 'Home improvement and garden supplies' },
  { name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear' },
  { name: 'Health & Beauty', description: 'Health and beauty products' },
  { name: 'Food & Beverages', description: 'Food, drinks, and beverages' },
  { name: 'Books & Media', description: 'Books, movies, and media' },
  { name: 'Toys & Games', description: 'Toys and games for all ages' },
  { name: 'Automotive', description: 'Car parts and automotive accessories' },
  { name: 'Travel', description: 'Travel services and packages' },
  { name: 'Pet Supplies', description: 'Pet food and accessories' },
  { name: 'Office Supplies', description: 'Office equipment and supplies' },
  { name: 'Jewelry', description: 'Jewelry and watches' },
  { name: 'Baby & Kids', description: 'Baby and kids products' },
  { name: 'Software & Apps', description: 'Software and mobile applications' },
];

const seedCategories = async () => {
  try {
    // Connect to MongoDB using the same pattern as app.js
    if (!process.env.MONGO_URL) {
      console.error('Error: MONGO_URL environment variable is not set');
      console.error('Please make sure your .env file has MONGO_URL defined');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });

    console.log('Connected to MongoDB');

    // Check if categories already exist
    const existingCategories = await Category.find();
    if (existingCategories.length > 0) {
      console.log(`Found ${existingCategories.length} existing categories. Skipping seed...`);
      console.log('If you want to seed anyway, delete existing categories first.');
      await mongoose.connection.close();
      return;
    }

    // Insert categories
    const createdCategories = await Category.insertMany(defaultCategories);
    console.log(`Successfully seeded ${createdCategories.length} categories:`);
    createdCategories.forEach(cat => {
      console.log(`  - ${cat.name}`);
    });

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed function
seedCategories();

