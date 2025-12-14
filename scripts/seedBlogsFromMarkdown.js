/**
 * Seed Blog Articles from Markdown File with Manual Translations
 * 
 * This script parses the blog.md file and seeds blog articles with:
 * - Title, content, excerpt
 * - Meta description and keywords
 * - Manual translations for all supported languages
 * 
 * IMPORTANT: Keywords remain in English for all languages as requested.
 * Titles, meta descriptions, and excerpts are fully translated.
 * Content translations can be added to blogTranslations.js as needed.
 * 
 * Usage: node server/scripts/seedBlogsFromMarkdown.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const Blog = require('../models/blog');
const User = require('../models/user');
const blogTranslations = require('./blogs/blogTranslations');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Supported languages for translations
const SUPPORTED_LANGUAGES = ['ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv'];

/**
 * Generate slug from title
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Calculate reading time in minutes (average 200 words per minute)
 */
function calculateReadingTime(content) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Extract excerpt from content (first 200 characters)
 */
function extractExcerpt(content, maxLength = 200) {
  // Remove HTML tags for excerpt
  const textOnly = content.replace(/<[^>]*>/g, '').trim();
  if (textOnly.length <= maxLength) {
    return textOnly;
  }
  return textOnly.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * Parse the blog markdown file
 */
function parseBlogMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const blogs = [];
  
  // Split by article separators (number followed by closing parenthesis)
  const articleRegex = /^(\d+)\)\s*(.+)$/gm;
  const matches = [...content.matchAll(articleRegex)];
  
  if (matches.length === 0) {
    throw new Error('No blog articles found in markdown file');
  }
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const articleNumber = parseInt(match[1]);
    const title = match[2].trim();
    
    // Find the start position of this article (after title)
    const startPos = match.index + match[0].length;
    
    // Find the end position (either next article or end of file)
    let endPos = content.length;
    if (i < matches.length - 1) {
      endPos = matches[i + 1].index;
    }
    
    // Extract content between this article and next article
    let articleContent = content.substring(startPos, endPos).trim();
    
    // Find SEO section (starts with "///////////////////////////////////////////////////////")
    const seoSeparator = articleContent.indexOf('///////////////////////////////////////////////////////');
    
    let contentText = articleContent;
    let metaDescription = '';
    let keywords = [];
    
    if (seoSeparator !== -1) {
      // Split content and SEO
      contentText = articleContent.substring(0, seoSeparator).trim();
      const seoSection = articleContent.substring(seoSeparator).trim();
      
      // Extract meta description (handle duplicate "Meta Description:" text)
      const metaDescRegex = /Meta Description:\s*(?:Meta Description:\s*)?(.+?)(?=Target Keywords:|$)/is;
      const metaDescMatch = seoSection.match(metaDescRegex);
      if (metaDescMatch) {
        metaDescription = metaDescMatch[1].trim();
      }
      
      // Extract keywords (everything after "Target Keywords:" until next article or end)
      const keywordsStart = seoSection.indexOf('Target Keywords:');
      if (keywordsStart !== -1) {
        const keywordsText = seoSection.substring(keywordsStart + 'Target Keywords:'.length).trim();
        keywords = keywordsText
          .split('\n')
          .map(k => k.trim())
          .filter(k => {
            // Filter out empty lines, next article markers, and SEO section markers
            return k.length > 0 && 
                   !k.match(/^\d+\)/) && 
                   !k.match(/^\/{20,}/) &&
                   !k.match(/^SEO\s*$/i) &&
                   !k.match(/^Meta Description:/i) &&
                   !k.match(/^Target Keywords:/i);
          });
      }
    }
    
    // Convert plain text content to HTML
    const htmlContent = convertToHTML(contentText);
    
    blogs.push({
      title,
      content: htmlContent,
      metaDescription,
      keywords,
    });
  }
  
  return blogs;
}

/**
 * Convert plain text to HTML with proper formatting
 */
function convertToHTML(text) {
  const lines = text.split('\n');
  const htmlLines = [];
  let inList = false;
  let currentParagraph = [];
  let inTable = false;
  let tableRows = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
    
    // Skip empty lines
    if (!line) {
      if (currentParagraph.length > 0) {
        htmlLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      if (inTable && tableRows.length > 0) {
        htmlLines.push('</table>');
        inTable = false;
        tableRows = [];
      }
      htmlLines.push('<br>');
      continue;
    }
    
    // Check for table rows (contains tabs or multiple spaces indicating columns)
    if (line.includes('\t') || (line.match(/\s{3,}/) && nextLine && nextLine.match(/\s{3,}/))) {
      if (!inTable) {
        htmlLines.push('<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">');
        inTable = true;
      }
      const cells = line.split(/\t+/).map(c => c.trim()).filter(c => c);
      if (cells.length > 0) {
        htmlLines.push('<tr>');
        cells.forEach(cell => {
          // Check if it's a header row (first row or contains ":" pattern)
          const isHeader = i === 0 || line.includes(':') || cells[0].match(/^[A-Z]/);
          const tag = isHeader ? 'th' : 'td';
          htmlLines.push(`<${tag} style="padding: 0.5rem; border: 1px solid #ddd;">${cell}</${tag}>`);
        });
        htmlLines.push('</tr>');
      }
      continue;
    }
    
    // Check for headings
    if (line.match(/^Step \d+:/i)) {
      if (currentParagraph.length > 0) {
        htmlLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<h3>${line}</h3>`);
      continue;
    }
    
    // Check for section headings (short lines that look like headings)
    if (line.match(/^(Why|What|Where|How|When|Who|Your|Common|Advanced|Top|Ready|Have|Start|Stay|Couponing|Mistake|Example|Rules|Pro Tip|Key Rules|Types|Conclusion|Introduction|Tips|Ready to|Your First|How Dealcouponz|Digital Coupon|Where to Find|Step-by-Step|Real-Life|Common|Advanced|Your|Have a|Start|Stay tuned)/i) && 
        line.length < 100 && 
        !line.includes('—') &&
        !line.match(/^[✅📄🗞🚫🛒🧴🏪]/)) {
      if (currentParagraph.length > 0) {
        htmlLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<h2>${line}</h2>`);
      continue;
    }
    
    // Check for list items
    if (line.match(/^[-•*]\s/)) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      if (currentParagraph.length > 0) {
        htmlLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      htmlLines.push(`<li>${line.substring(2).trim()}</li>`);
      continue;
    }
    
    // Check for emoji headers (like ✅ Digital Sources:)
    if (line.match(/^[✅📄🗞🚫🛒🧴🏪]\s+[A-Z]/)) {
      if (currentParagraph.length > 0) {
        htmlLines.push(`<p>${currentParagraph.join(' ')}</p>`);
        currentParagraph = [];
      }
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<h3>${line}</h3>`);
      continue;
    }
    
    // Regular paragraph text
    currentParagraph.push(line);
  }
  
  // Close any remaining structures
  if (currentParagraph.length > 0) {
    htmlLines.push(`<p>${currentParagraph.join(' ')}</p>`);
  }
  if (inList) {
    htmlLines.push('</ul>');
  }
  if (inTable) {
    htmlLines.push('</table>');
  }
  
  return htmlLines.join('\n');
}

/**
 * Create translation structure using manual translations
 * Keywords will remain in English for all languages as requested
 * @param {string} slug - Blog slug to look up translations
 * @param {string} englishTitle - English title
 * @param {string} englishContent - English content (HTML)
 * @param {string} englishExcerpt - English excerpt
 * @param {string} englishMetaTitle - English meta title
 * @param {string} englishMetaDescription - English meta description
 * @param {Array<string>} englishKeywords - English keywords (will remain in English)
 * @returns {Object} Translations object
 */
function createTranslations(slug, englishTitle, englishContent, englishExcerpt, englishMetaTitle, englishMetaDescription, englishKeywords) {
  const translations = {
    titleTranslations: {},
    contentTranslations: {},
    excerptTranslations: {},
    metaTitleTranslations: {},
    metaDescriptionTranslations: {},
    keywordsTranslations: {}, // Keywords stay in English for all languages
    focusKeywordTranslations: {},
    ogTitleTranslations: {},
    ogDescriptionTranslations: {},
    twitterTitleTranslations: {},
    twitterDescriptionTranslations: {},
  };
  
  // Get manual translations for this blog
  const blogTrans = blogTranslations[slug] || {};
  
  // For each language, use manual translations or fallback to English
  SUPPORTED_LANGUAGES.forEach(lang => {
    // Use manual translations if available, otherwise use English
    translations.titleTranslations[lang] = blogTrans.title?.[lang] || englishTitle;
    translations.excerptTranslations[lang] = blogTrans.excerpt?.[lang] || englishExcerpt;
    translations.metaTitleTranslations[lang] = blogTrans.title?.[lang] || englishMetaTitle;
    translations.metaDescriptionTranslations[lang] = blogTrans.metaDescription?.[lang] || englishMetaDescription;
    
    // Content: Use manual translation if available, otherwise use English
    translations.contentTranslations[lang] = blogTrans.content?.[lang] || englishContent;
    
    // OG and Twitter fields
    translations.ogTitleTranslations[lang] = translations.titleTranslations[lang];
    translations.ogDescriptionTranslations[lang] = translations.metaDescriptionTranslations[lang];
    translations.twitterTitleTranslations[lang] = translations.titleTranslations[lang];
    translations.twitterDescriptionTranslations[lang] = translations.metaDescriptionTranslations[lang];
    
    // Keywords remain in English for all languages (as requested)
    translations.keywordsTranslations[lang] = englishKeywords;
    translations.focusKeywordTranslations[lang] = englishKeywords[0] || ''; // First keyword as focus
  });
  
  return translations;
}

/**
 * Main seeding function
 */
async function seedBlogsFromMarkdown() {
  try {
    if (!process.env.MONGO_URL) {
      console.error('❌ Error: MONGO_URL environment variable is not set');
      console.error('   Please make sure your .env file has MONGO_URL defined');
      process.exit(1);
    }

    const markdownPath = path.join(__dirname, 'blogs', 'blogs.md');
    
    if (!fs.existsSync(markdownPath)) {
      console.error(`❌ Error: Blog markdown file not found at: ${markdownPath}`);
      process.exit(1);
    }

    console.log('📖 Parsing blog markdown file...');
    const parsedBlogs = parseBlogMarkdown(markdownPath);
    console.log(`✅ Found ${parsedBlogs.length} blog articles`);

    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find or create an admin user to use as author
    let adminUser = await User.findOne({ userType: 'superAdmin' });
    
    if (!adminUser) {
      adminUser = await User.findOne({ userType: { $in: ['admin', 'superAdmin', 'couponManager'] } });
    }

    if (!adminUser) {
      adminUser = await User.findOne();
      
      if (!adminUser) {
        console.error('❌ No users found in database. Please create at least one user first.');
        await mongoose.connection.close();
        process.exit(1);
      }
      
      console.log(`⚠️  No admin user found. Using regular user: ${adminUser.username || adminUser.email}`);
    } else {
      console.log(`📝 Using admin user: ${adminUser.username || adminUser.email}`);
    }

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const blogData of parsedBlogs) {
      try {
        const slug = generateSlug(blogData.title);
        const excerpt = extractExcerpt(blogData.content);
        const readingTime = calculateReadingTime(blogData.content);
        
        // Check if blog with this slug already exists
        const existingBlog = await Blog.findOne({ slug });
        
        // Prepare blog data
        const blogPayload = {
          title: blogData.title,
          slug,
          content: blogData.content,
          excerpt,
          metaTitle: blogData.title, // Use title as meta title if not provided
          metaDescription: blogData.metaDescription || excerpt,
          keywords: blogData.keywords || [],
          focusKeyword: blogData.keywords && blogData.keywords.length > 0 ? blogData.keywords[0] : '',
          readingTime,
          author: adminUser._id,
          isPublished: true, // Set to true to publish blogs
          views: 0,
          likes: 0,
          articleSchema: {
            publisher: 'DealCouponz',
            articleSection: 'Couponing Tips',
          },
          // Generate canonical URL
          canonicalURL: `https://dealcouponz.com/blog/${slug}`,
          ogTitle: blogData.title,
          ogDescription: blogData.metaDescription || excerpt,
          ogUrl: `https://dealcouponz.com/blog/${slug}`,
          twitterCard: 'summary_large_image',
          twitterTitle: blogData.title,
          twitterDescription: blogData.metaDescription || excerpt,
        };
        
        // Create translations using manual translations (keywords remain in English for all languages)
        console.log(`\n📝 Processing translations for: "${blogData.title}"`);
        const translations = createTranslations(
          slug,
          blogData.title,
          blogData.content,
          excerpt,
          blogPayload.metaTitle,
          blogPayload.metaDescription,
          blogData.keywords || []
        );
        
        // Merge translations into blog payload
        Object.assign(blogPayload, translations);
        
        if (existingBlog) {
          // Update existing blog
          Object.assign(existingBlog, blogPayload);
          await existingBlog.save();
          console.log(`🔄 Updated blog: "${blogData.title}"`);
          results.updated++;
        } else {
          // Create new blog
          const newBlog = new Blog(blogPayload);
          await newBlog.save();
          console.log(`✅ Created blog: "${blogData.title}"`);
          results.created++;
        }
      } catch (error) {
        console.error(`❌ Error processing blog "${blogData.title}":`, error.message);
        results.errors.push({ title: blogData.title, error: error.message });
      }
    }

    console.log('\n📊 Seeding Results:');
    console.log(`   ✅ Created: ${results.created}`);
    console.log(`   🔄 Updated: ${results.updated}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    if (results.errors.length > 0) {
      console.log(`   ❌ Errors: ${results.errors.length}`);
      results.errors.forEach((err, i) => {
        console.log(`      ${i + 1}. ${err.title}: ${err.error}`);
      });
    }

    const totalBlogs = await Blog.countDocuments();
    console.log(`\n📚 Total blogs in database: ${totalBlogs}`);
    
    console.log('\n✅ All blogs seeded with translations!');
    console.log('   ✓ Titles, meta descriptions, and excerpts are translated');
    console.log('   ✓ Keywords remain in English for all languages as requested');
    console.log('   ⚠️  Content is in English - full content translations can be added to blogTranslations.js');

    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding blogs:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the seeding function
seedBlogsFromMarkdown();

