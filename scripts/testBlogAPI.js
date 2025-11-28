/**
 * Test script to check blog API endpoint
 * Usage: node scripts/testBlogAPI.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/blog');

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('MONGO_URL is not set in environment variables');
  process.exit(1);
}

async function testBlogAPI() {
  try {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB\n');

    // Check all blogs
    const allBlogs = await Blog.find({});
    console.log(`📊 Total blogs in database: ${allBlogs.length}`);
    
    if (allBlogs.length === 0) {
      console.log('⚠️  No blogs found in database!');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('\n📝 All blogs:');
    allBlogs.forEach((blog, index) => {
      console.log(`\n  Blog ${index + 1}:`);
      console.log(`    ID: ${blog._id}`);
      console.log(`    Title: ${blog.title || 'N/A'}`);
      console.log(`    Slug: ${blog.slug || 'N/A'}`);
      console.log(`    isPublished: ${blog.isPublished}`);
      console.log(`    Created: ${blog.createdAt}`);
    });

    // Check published blogs
    const publishedBlogs = await Blog.find({ isPublished: true });
    console.log(`\n✅ Published blogs: ${publishedBlogs.length}`);
    
    if (publishedBlogs.length === 0) {
      console.log('⚠️  No published blogs found!');
      console.log('\n💡 To publish a blog, run:');
      console.log('   node scripts/publishBlog.js <blogId>');
      console.log('   or');
      console.log('   node scripts/publishBlog.js --all');
    } else {
      console.log('\n📝 Published blogs:');
      publishedBlogs.forEach((blog, index) => {
        console.log(`  ${index + 1}. ${blog.title} (${blog._id})`);
      });
    }

    // Check unpublished blogs
    const unpublishedBlogs = await Blog.find({ isPublished: false });
    console.log(`\n❌ Unpublished blogs: ${unpublishedBlogs.length}`);
    
    if (unpublishedBlogs.length > 0) {
      console.log('\n📝 Unpublished blogs:');
      unpublishedBlogs.forEach((blog, index) => {
        console.log(`  ${index + 1}. ${blog.title} (${blog._id})`);
        console.log(`     To publish: node scripts/publishBlog.js ${blog._id}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Test complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testBlogAPI();

