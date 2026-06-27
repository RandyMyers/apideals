const Blog = require('../models/blog'); // Import the Blog model
const View = require('../models/view');
const cloudinary = require('cloudinary').v2;
const {
  calculateReadingTime,
  generateSlug,
  generateMetaTitle,
  generateMetaDescription,
  generateOgUrl,
  parseKeywords,
} = require('../utils/seoUtils');
const { applyCorsHeaders } = require('../middleware/security');

function parseTranslationObject(translation, fieldName) {
  if (!translation) return null;
  if (typeof translation === 'object' && !Array.isArray(translation)) return translation;
  if (typeof translation === 'string') {
    try {
      return JSON.parse(translation);
    } catch (e) {
      console.warn(`Could not parse ${fieldName}:`, e.message);
      return null;
    }
  }
  return null;
}

function mapTranslationsToObject(val) {
  if (!val) return {};
  if (val instanceof Map) return Object.fromEntries(val);
  if (typeof val === 'object') return val;
  return {};
}

function mergeTranslationField(updates, existingBlog, bodyField, updateKey) {
  const parsed = parseTranslationObject(bodyField, updateKey);
  if (!parsed || typeof parsed !== 'object') return;
  updates[updateKey] = {
    ...mapTranslationsToObject(existingBlog?.[updateKey]),
    ...parsed,
  };
}

// @desc    Create a new blog post with image upload
// @route   POST /api/blogs
// @access  Private
exports.createBlog = async (req, res) => {
  try {
    // Get userId from authenticated user (from authMiddleware) or from request body (fallback)
    const userId = req.user?.id || req.body.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID is required. Please ensure you are authenticated.' });
    }

    // Destructure required fields from request body
    const {
      title,
      titleTranslations,
      slug,
      content,
      contentTranslations,
      excerpt,
      excerptTranslations,
      metaTitle,
      metaTitleTranslations,
      metaDescription,
      metaDescriptionTranslations,
      keywords,
      keywordsTranslations,
      focusKeyword,
      focusKeywordTranslations,
      tags,
      featuredImageAlt,
      canonicalURL,
      ogTitle,
      ogTitleTranslations,
      ogDescription,
      ogDescriptionTranslations,
      ogImage,
      ogUrl,
      twitterCard,
      twitterTitle,
      twitterTitleTranslations,
      twitterDescription,
      twitterDescriptionTranslations,
      twitterImage,
      articleSchema,
      isPublished,
    } = req.body;

    // Parse articleSchema if it's a string (from FormData)
    let parsedArticleSchema = articleSchema;
    if (typeof articleSchema === 'string') {
      try {
        parsedArticleSchema = JSON.parse(articleSchema);
      } catch (e) {
        console.warn('Could not parse articleSchema, using default');
        parsedArticleSchema = { publisher: 'DealCouponz' };
      }
    }

    // Parse translation objects if they're strings (from FormData)
    const parseTranslationObject = (translation, fieldName) => {
      if (!translation) return {};
      if (typeof translation === 'object') return translation;
      if (typeof translation === 'string') {
        try {
          return JSON.parse(translation);
        } catch (e) {
          console.warn(`Could not parse ${fieldName}`);
          return {};
        }
      }
      return {};
    };

    const parseTranslationArray = (translation, fieldName) => {
      if (!translation) return {};
      if (typeof translation === 'object') return translation;
      if (typeof translation === 'string') {
        try {
          return JSON.parse(translation);
        } catch (e) {
          console.warn(`Could not parse ${fieldName}`);
          return {};
        }
      }
      return {};
    };

    let parsedTitleTranslations = parseTranslationObject(titleTranslations, 'titleTranslations');
    let parsedContentTranslations = parseTranslationObject(contentTranslations, 'contentTranslations');
    let parsedExcerptTranslations = parseTranslationObject(excerptTranslations, 'excerptTranslations');
    let parsedMetaTitleTranslations = parseTranslationObject(metaTitleTranslations, 'metaTitleTranslations');
    let parsedMetaDescriptionTranslations = parseTranslationObject(metaDescriptionTranslations, 'metaDescriptionTranslations');
    let parsedKeywordsTranslations = parseTranslationArray(keywordsTranslations, 'keywordsTranslations');
    let parsedFocusKeywordTranslations = parseTranslationObject(focusKeywordTranslations, 'focusKeywordTranslations');
    let parsedOgTitleTranslations = parseTranslationObject(ogTitleTranslations, 'ogTitleTranslations');
    let parsedOgDescriptionTranslations = parseTranslationObject(ogDescriptionTranslations, 'ogDescriptionTranslations');
    let parsedTwitterTitleTranslations = parseTranslationObject(twitterTitleTranslations, 'twitterTitleTranslations');
    let parsedTwitterDescriptionTranslations = parseTranslationObject(twitterDescriptionTranslations, 'twitterDescriptionTranslations');

    console.log('Blog creation request:', { title, slug, userId });

    let featuredImageUrl = '';

    // Check if a file is uploaded
    if (req.files && req.files.featuredImage) {
      const image = req.files.featuredImage;

      // Upload image to Cloudinary
      const uploadedImage = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: 'blogs', // Optional: Folder in Cloudinary to store images
        resource_type: 'image',
        use_filename: true,
        unique_filename: false,
      });

      // Store the secure URL
      featuredImageUrl = uploadedImage.secure_url;
    }

    // Calculate reading time
    const readingTime = calculateReadingTime(content);

    // Generate slug if not provided
    const blogSlug = slug || generateSlug(title);

    // Auto-generate meta fields if not provided
    const finalMetaTitle = generateMetaTitle(title, metaTitle);
    const finalMetaDescription = generateMetaDescription(excerpt, metaDescription);

    // Parse keywords (handle both string and array)
    const parsedKeywords = parseKeywords(keywords);

    // Parse tags (handle both string and array)
    const parsedTags = parseKeywords(tags);

    // Get base URL from environment or request
    const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    const finalOgUrl = generateOgUrl(blogSlug, baseUrl, ogUrl);

    // Auto-populate OG fields if not provided
    const finalOgTitle = ogTitle || finalMetaTitle || title;
    const finalOgDescription = ogDescription || finalMetaDescription || excerpt;
    const finalOgImage = ogImage || featuredImageUrl;

    // Auto-populate Twitter fields if not provided
    const finalTwitterTitle = twitterTitle || finalOgTitle || finalMetaTitle || title;
    const finalTwitterDescription = twitterDescription || finalOgDescription || finalMetaDescription || excerpt;
    const finalTwitterImage = twitterImage || finalOgImage || featuredImageUrl;

    // Create the new blog instance
    const blog = new Blog({
      title,
      titleTranslations: parsedTitleTranslations,
      slug: blogSlug,
      content,
      contentTranslations: parsedContentTranslations,
      excerpt,
      excerptTranslations: parsedExcerptTranslations,
      metaTitle: finalMetaTitle,
      metaTitleTranslations: parsedMetaTitleTranslations,
      metaDescription: finalMetaDescription,
      metaDescriptionTranslations: parsedMetaDescriptionTranslations,
      keywords: parsedKeywords,
      keywordsTranslations: parsedKeywordsTranslations,
      focusKeyword,
      focusKeywordTranslations: parsedFocusKeywordTranslations,
      tags: parsedTags,
      featuredImage: featuredImageUrl,
      featuredImageAlt,
      canonicalURL,
      ogTitle: finalOgTitle,
      ogTitleTranslations: parsedOgTitleTranslations,
      ogDescription: finalOgDescription,
      ogDescriptionTranslations: parsedOgDescriptionTranslations,
      ogImage: finalOgImage,
      ogUrl: finalOgUrl,
      twitterCard: twitterCard || 'summary_large_image',
      twitterTitle: finalTwitterTitle,
      twitterTitleTranslations: parsedTwitterTitleTranslations,
      twitterDescription: finalTwitterDescription,
      twitterDescriptionTranslations: parsedTwitterDescriptionTranslations,
      twitterImage: finalTwitterImage,
      articleSchema: parsedArticleSchema || { publisher: 'DealCouponz' },
      readingTime,
      isPublished,
      author: userId,
    });

    // Save to database
    const newBlog = await blog.save();

    if (newBlog.isPublished) {
      try {
        const { pingIndexNow } = require('../utils/indexNow');
        pingIndexNow(`/blog/${newBlog.seoSlug || newBlog.slug || newBlog._id}`);
      } catch (e) { /* non-blocking */ }
    }

    res.status(201).json(newBlog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: 'Failed to create blog post', error: error.message });
  }
};


// @desc    Get all blog posts
// @route   GET /api/blogs
// @access  Public
exports.getAllBlogs = async (req, res) => {
  try {
    // Build query - by default only show published blogs
    // Allow ?includeUnpublished=true for admin/testing purposes
    const includeUnpublished = req.query.includeUnpublished === 'true';
    const query = includeUnpublished ? {} : { isPublished: true };
    
    const blogs = await Blog.find(query)
      .populate('author', 'username email')
      .sort({ createdAt: -1 }); // Sort by newest first
    
    // Convert Map fields to objects for all blogs
    const blogsWithObjects = blogs.map(blog => convertMapFieldsToObjects(blog));
    
    const blogType = includeUnpublished ? 'blogs (including unpublished)' : 'published blogs';
    console.log(`Found ${blogs.length} ${blogType}`);
    res.status(200).json(blogsWithObjects);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Failed to fetch blogs', error: error.message });
  }
};

// @desc    Get a single blog post by ID
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'name email');
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    const blogObj = convertMapFieldsToObjects(blog);
    res.status(200).json(blogObj);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch blog', error: error.message });
  }
};

// Helper function to convert Map fields to objects for JSON serialization
const convertMapFieldsToObjects = (blog) => {
  const blogObj = blog.toObject ? blog.toObject() : blog;
  
  // Convert keywordsTranslations Map to object
  if (blogObj.keywordsTranslations instanceof Map) {
    blogObj.keywordsTranslations = Object.fromEntries(blogObj.keywordsTranslations);
  }
  
  // Convert tagsTranslations Map to object
  if (blogObj.tagsTranslations instanceof Map) {
    blogObj.tagsTranslations = Object.fromEntries(blogObj.tagsTranslations);
  }
  
  return blogObj;
};

// @desc    Get a single blog post by slug
// @route   GET /api/blog/slug/:slug
// @access  Public
exports.getBlogBySlug = async (req, res) => {
  try {
    const slugParam = decodeURIComponent(String(req.params.slug || '')).trim();
    const { buildEntityLookupFilter } = require('../utils/slugResolver');
    const filter = buildEntityLookupFilter(slugParam, null, ['slug']);
    const blog = await Blog.findOne({ ...filter, isPublished: true }).populate('author', 'username email');
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    const blogObj = convertMapFieldsToObjects(blog);
    res.status(200).json(blogObj);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch blog', error: error.message });
  }
};

// @desc    Update a blog post by ID
// @route   PUT /api/blogs/:id
// @access  Private
exports.updateBlog = async (req, res) => {
  try {
    const existingBlog = await Blog.findById(req.params.id);
    if (!existingBlog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const updates = { ...req.body };

    if (updates.isPublished !== undefined) {
      updates.isPublished = updates.isPublished === true || updates.isPublished === 'true';
    }

    if (typeof updates.articleSchema === 'string') {
      try {
        updates.articleSchema = JSON.parse(updates.articleSchema);
      } catch (e) {
        console.warn('Could not parse articleSchema on update');
        delete updates.articleSchema;
      }
    }

    if (req.files && req.files.featuredImage && req.files.featuredImage.tempFilePath) {
      const image = req.files.featuredImage;
      const uploadedImage = await cloudinary.uploader.upload(image.tempFilePath, {
        folder: 'blogs',
        resource_type: 'image',
        use_filename: true,
        unique_filename: false,
      });
      updates.featuredImage = uploadedImage.secure_url;
    }

    mergeTranslationField(updates, existingBlog, req.body.titleTranslations, 'titleTranslations');
    mergeTranslationField(updates, existingBlog, req.body.contentTranslations, 'contentTranslations');
    mergeTranslationField(updates, existingBlog, req.body.excerptTranslations, 'excerptTranslations');
    mergeTranslationField(updates, existingBlog, req.body.metaTitleTranslations, 'metaTitleTranslations');
    mergeTranslationField(updates, existingBlog, req.body.metaDescriptionTranslations, 'metaDescriptionTranslations');
    mergeTranslationField(updates, existingBlog, req.body.focusKeywordTranslations, 'focusKeywordTranslations');
    mergeTranslationField(updates, existingBlog, req.body.ogTitleTranslations, 'ogTitleTranslations');
    mergeTranslationField(updates, existingBlog, req.body.ogDescriptionTranslations, 'ogDescriptionTranslations');
    mergeTranslationField(updates, existingBlog, req.body.twitterTitleTranslations, 'twitterTitleTranslations');
    mergeTranslationField(updates, existingBlog, req.body.twitterDescriptionTranslations, 'twitterDescriptionTranslations');

    const parsedKeywordsTranslations = parseTranslationObject(
      req.body.keywordsTranslations,
      'keywordsTranslations'
    );
    if (parsedKeywordsTranslations) {
      updates.keywordsTranslations = {
        ...mapTranslationsToObject(existingBlog.keywordsTranslations),
        ...parsedKeywordsTranslations,
      };
    }

    if (updates.content) {
      updates.readingTime = calculateReadingTime(updates.content);
    }

    if (updates.title && !updates.slug) {
      updates.slug = generateSlug(updates.title);
    }

    if (updates.keywords !== undefined) {
      updates.keywords = parseKeywords(updates.keywords);
    }

    if (updates.tags !== undefined) {
      updates.tags = parseKeywords(updates.tags);
    }

    if (updates.title && !updates.metaTitle) {
      updates.metaTitle = generateMetaTitle(updates.title, existingBlog.metaTitle);
    }

    if (updates.excerpt && !updates.metaDescription) {
      updates.metaDescription = generateMetaDescription(updates.excerpt, existingBlog.metaDescription);
    }

    const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    const blogSlug = updates.slug || existingBlog.slug;

    if (!updates.ogUrl && blogSlug) {
      updates.ogUrl = generateOgUrl(blogSlug, baseUrl, updates.ogUrl);
    }

    if (!updates.ogTitle) {
      updates.ogTitle = updates.metaTitle || updates.title;
    }

    if (!updates.ogDescription) {
      updates.ogDescription = updates.metaDescription || updates.excerpt;
    }

    if (!updates.ogImage && updates.featuredImage) {
      updates.ogImage = updates.featuredImage;
    }

    if (!updates.twitterTitle) {
      updates.twitterTitle = updates.ogTitle || updates.metaTitle || updates.title;
    }

    if (!updates.twitterDescription) {
      updates.twitterDescription = updates.ogDescription || updates.metaDescription || updates.excerpt;
    }

    if (!updates.twitterImage) {
      updates.twitterImage = updates.ogImage || updates.featuredImage;
    }

    updates.updatedAt = Date.now();

    const blog = await Blog.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    if (blog.isPublished) {
      try {
        const { pingIndexNow } = require('../utils/indexNow');
        pingIndexNow(`/blog/${blog.seoSlug || blog.slug || blog._id}`);
      } catch (e) { /* non-blocking */ }
    }

    res.status(200).json(blog);
  } catch (error) {
    console.error('Failed to update blog:', error);
    applyCorsHeaders(req, res);
    res.status(500).json({ message: 'Failed to update blog', error: error.message });
  }
};

// @desc    Delete a blog post by ID
// @route   DELETE /api/blogs/:id
// @access  Private
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if blog exists before cleanup
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    // Clean up related data (non-blocking)
    try {
      // Delete views related to this blog (if any)
      await View.deleteMany({ 
        entityType: 'page',
        pagePath: { $regex: `/blog/${blog.slug}`, $options: 'i' }
      });
    } catch (cleanupError) {
      console.error('Error cleaning up blog-related data:', cleanupError);
      // Continue with deletion even if cleanup fails
    }
    
    // Delete the blog (translations are automatically deleted as they're embedded)
    await Blog.findByIdAndDelete(id);
    
    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete blog', error: error.message });
  }
};

// @desc    Add a comment to a blog post
// @route   POST /api/blogs/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    const newComment = {
      user: req.user.id, // Assuming authenticated user's ID
      text,
      createdAt: new Date(),
    };

    blog.comments.push(newComment);
    await blog.save();

    res.status(201).json(blog.comments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

// @desc    Like a blog post
// @route   POST /api/blogs/:id/like
// @access  Private
exports.likeBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    blog.likes += 1; // Increment the likes counter
    await blog.save();

    res.status(200).json({ likes: blog.likes });
  } catch (error) {
    res.status(500).json({ message: 'Failed to like blog', error: error.message });
  }
};

// @desc    Publish a blog post by ID
// @route   PATCH /api/v1/blog/publish/:id
// @access  Private (Admin)
exports.publishBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    blog.isPublished = true;
    await blog.save();

    try {
      const { pingIndexNow } = require('../utils/indexNow');
      pingIndexNow(`/blog/${blog.seoSlug || blog.slug || blog._id}`);
    } catch (e) { /* non-blocking */ }

    res.status(200).json({ 
      message: 'Blog published successfully',
      blog: blog 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to publish blog', error: error.message });
  }
};
