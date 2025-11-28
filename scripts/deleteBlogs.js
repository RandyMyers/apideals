const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Blog = require('../models/blog');

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const deleteBlogs = async () => {
  try {
    if (!process.env.MONGO_URL) {
      console.error('Error: MONGO_URL environment variable is not set');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    const count = await Blog.countDocuments();
    console.log(`📊 Found ${count} blogs in database`);

    if (count > 0) {
      await Blog.deleteMany({});
      console.log(`✅ Deleted ${count} blogs`);
    } else {
      console.log('No blogs found to delete.');
    }

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting blogs:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

deleteBlogs();

