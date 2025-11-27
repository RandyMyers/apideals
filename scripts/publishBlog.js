/**
 * Script to publish a blog post or all unpublished blog posts
 * Usage:
 *   node scripts/publishBlog.js <blogId>  - Publish specific blog
 *   node scripts/publishBlog.js --all    - Publish all unpublished blogs
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/blog');

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL is not set in environment variables');
  process.exit(1);
}

async function publishBlog(blogId) {
  try {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const blog = await Blog.findById(blogId);
    if (!blog) {
      console.error(`Blog with ID ${blogId} not found`);
      process.exit(1);
    }

    blog.isPublished = true;
    await blog.save();
    console.log(`✅ Blog "${blog.title}" (${blogId}) has been published`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error publishing blog:', error);
    process.exit(1);
  }
}

async function publishAllUnpublished() {
  try {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const unpublishedBlogs = await Blog.find({ isPublished: false });
    console.log(`Found ${unpublishedBlogs.length} unpublished blog(s)`);

    if (unpublishedBlogs.length === 0) {
      console.log('No unpublished blogs to publish');
      await mongoose.disconnect();
      process.exit(0);
    }

    for (const blog of unpublishedBlogs) {
      blog.isPublished = true;
      await blog.save();
      console.log(`✅ Published: "${blog.title}" (${blog._id})`);
    }

    console.log(`\n✅ Successfully published ${unpublishedBlogs.length} blog(s)`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error publishing blogs:', error);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node scripts/publishBlog.js <blogId>  - Publish specific blog');
  console.log('  node scripts/publishBlog.js --all     - Publish all unpublished blogs');
  process.exit(1);
}

if (args[0] === '--all') {
  publishAllUnpublished();
} else {
  publishBlog(args[0]);
}

