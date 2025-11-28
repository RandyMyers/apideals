const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/category');

// Load environment variables (same as app.js)
dotenv.config();

// Comprehensive categories for a deals and coupons website
const defaultCategories = [
  // Electronics & Tech
  { name: 'Electronics', description: 'Electronic devices, smartphones, tablets, and gadgets' },
  { name: 'Computers & Laptops', description: 'Computers, laptops, and computer accessories' },
  { name: 'Gaming', description: 'Video games, gaming consoles, and gaming accessories' },
  { name: 'Software & Apps', description: 'Software, mobile applications, and digital products' },
  { name: 'Audio & Headphones', description: 'Headphones, speakers, and audio equipment' },
  { name: 'Cameras & Photography', description: 'Cameras, lenses, and photography equipment' },
  
  // Fashion & Apparel
  { name: 'Fashion', description: 'Clothing, accessories, and fashion items' },
  { name: 'Men\'s Fashion', description: 'Men\'s clothing, shoes, and accessories' },
  { name: 'Women\'s Fashion', description: 'Women\'s clothing, shoes, and accessories' },
  { name: 'Jewelry & Watches', description: 'Jewelry, watches, and accessories' },
  { name: 'Shoes & Footwear', description: 'Shoes, sneakers, and footwear for all occasions' },
  { name: 'Bags & Luggage', description: 'Handbags, backpacks, suitcases, and travel bags' },
  
  // Home & Living
  { name: 'Home & Garden', description: 'Home improvement, furniture, and garden supplies' },
  { name: 'Furniture', description: 'Home and office furniture' },
  { name: 'Kitchen & Dining', description: 'Kitchen appliances, cookware, and dining essentials' },
  { name: 'Home Decor', description: 'Decorative items, art, and home accessories' },
  { name: 'Bedding & Bath', description: 'Bedding, towels, and bathroom accessories' },
  { name: 'Tools & Hardware', description: 'Tools, hardware, and DIY supplies' },
  
  // Health & Beauty
  { name: 'Health & Beauty', description: 'Health and beauty products' },
  { name: 'Skincare', description: 'Skincare products and treatments' },
  { name: 'Makeup & Cosmetics', description: 'Makeup, cosmetics, and beauty tools' },
  { name: 'Hair Care', description: 'Hair care products and styling tools' },
  { name: 'Fitness & Wellness', description: 'Fitness equipment, supplements, and wellness products' },
  { name: 'Personal Care', description: 'Personal hygiene and care products' },
  
  // Sports & Outdoors
  { name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear' },
  { name: 'Fitness Equipment', description: 'Exercise equipment and fitness gear' },
  { name: 'Outdoor Recreation', description: 'Camping, hiking, and outdoor adventure gear' },
  { name: 'Sports Apparel', description: 'Athletic wear and sports clothing' },
  
  // Food & Beverages
  { name: 'Food & Beverages', description: 'Food, drinks, and beverages' },
  { name: 'Grocery', description: 'Grocery items and food products' },
  { name: 'Restaurants & Dining', description: 'Restaurant deals and dining offers' },
  { name: 'Coffee & Tea', description: 'Coffee, tea, and related products' },
  
  // Travel & Services
  { name: 'Travel', description: 'Travel services, hotels, flights, and vacation packages' },
  { name: 'Hotels & Accommodation', description: 'Hotel bookings and accommodation deals' },
  { name: 'Flights & Airlines', description: 'Flight bookings and airline deals' },
  { name: 'Vacation Packages', description: 'Complete vacation packages and tours' },
  { name: 'Car Rentals', description: 'Car rental services and deals' },
  
  // Automotive
  { name: 'Automotive', description: 'Car parts, accessories, and automotive services' },
  { name: 'Car Parts & Accessories', description: 'Automotive parts and car accessories' },
  { name: 'Car Services', description: 'Car maintenance, repair, and service deals' },
  
  // Entertainment & Media
  { name: 'Books & Media', description: 'Books, movies, music, and media' },
  { name: 'Movies & TV', description: 'Streaming services, movies, and TV shows' },
  { name: 'Music & Audio', description: 'Music streaming, albums, and audio content' },
  { name: 'Books & E-books', description: 'Physical books and digital e-books' },
  
  // Toys & Games
  { name: 'Toys & Games', description: 'Toys and games for all ages' },
  { name: 'Baby & Kids', description: 'Baby products, kids clothing, and children\'s items' },
  { name: 'Board Games', description: 'Board games, puzzles, and tabletop games' },
  
  // Pet Supplies
  { name: 'Pet Supplies', description: 'Pet food, toys, and accessories' },
  { name: 'Pet Food', description: 'Food and treats for pets' },
  { name: 'Pet Accessories', description: 'Pet toys, beds, and accessories' },
  
  // Office & Business
  { name: 'Office Supplies', description: 'Office equipment, stationery, and supplies' },
  { name: 'Business Services', description: 'Business tools, software, and services' },
  
  // Specialty Categories
  { name: 'Gift Cards', description: 'Gift cards and prepaid cards' },
  { name: 'Subscription Services', description: 'Monthly subscriptions and memberships' },
  { name: 'Education & Courses', description: 'Online courses, education, and training' },
  { name: 'Financial Services', description: 'Banking, insurance, and financial products' },
  { name: 'Insurance', description: 'Insurance products and services' },
  { name: 'Telecommunications', description: 'Phone plans, internet, and telecom services' },
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

    // Get existing category names
    const existingCategories = await Category.find().select('name');
    const existingNames = new Set(existingCategories.map(cat => cat.name.toLowerCase()));
    
    console.log(`Found ${existingCategories.length} existing categories.`);

    // Filter out categories that already exist
    const categoriesToAdd = defaultCategories.filter(cat => {
      const exists = existingNames.has(cat.name.toLowerCase());
      if (exists) {
        console.log(`  ⏭️  Skipping "${cat.name}" (already exists)`);
      }
      return !exists;
    });

    if (categoriesToAdd.length === 0) {
      console.log('All categories already exist. Nothing to seed.');
      await mongoose.connection.close();
      return;
    }

    // Insert only new categories
    const createdCategories = await Category.insertMany(categoriesToAdd);
    console.log(`\n✅ Successfully seeded ${createdCategories.length} new categories:`);
    createdCategories.forEach(cat => {
      console.log(`  ✓ ${cat.name}`);
    });
    
    console.log(`\n📊 Total categories in database: ${existingCategories.length + createdCategories.length}`);

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

