const Blog = require('../models/blog'); // Import the Blog model
const cloudinary = require('cloudinary').v2;
const {
  calculateReadingTime,
  generateSlug,
  generateMetaTitle,
  generateMetaDescription,
  generateOgUrl,
  parseKeywords,
} = require('../utils/seoUtils');

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
    // Only return published blogs for public endpoint
    const blogs = await Blog.find({ isPublished: true })
      .populate('author', 'username email')
      .sort({ createdAt: -1 }); // Sort by newest first
    
    console.log(`Found ${blogs.length} published blogs`);
    res.status(200).json(blogs);
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
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch blog', error: error.message });
  }
};

// @desc    Update a blog post by ID
// @route   PUT /api/blogs/:id
// @access  Private
exports.updateBlog = async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Handle translation fields - merge with existing translations if provided
    if (req.body.titleTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.titleTranslations = {
        ...(existingBlog?.titleTranslations || {}),
        ...req.body.titleTranslations,
      };
    }
    
    if (req.body.contentTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.contentTranslations = {
        ...(existingBlog?.contentTranslations || {}),
        ...req.body.contentTranslations,
      };
    }
    
    if (req.body.excerptTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.excerptTranslations = {
        ...(existingBlog?.excerptTranslations || {}),
        ...req.body.excerptTranslations,
      };
    }

    // Handle SEO translation fields
    if (req.body.metaTitleTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.metaTitleTranslations = {
        ...(existingBlog?.metaTitleTranslations || {}),
        ...req.body.metaTitleTranslations,
      };
    }

    if (req.body.metaDescriptionTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.metaDescriptionTranslations = {
        ...(existingBlog?.metaDescriptionTranslations || {}),
        ...req.body.metaDescriptionTranslations,
      };
    }

    if (req.body.keywordsTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      // Convert Map to object if needed
      const existingKeywordsTranslations = existingBlog?.keywordsTranslations 
        ? (existingBlog.keywordsTranslations instanceof Map 
            ? Object.fromEntries(existingBlog.keywordsTranslations) 
            : existingBlog.keywordsTranslations)
        : {};
      updates.keywordsTranslations = {
        ...existingKeywordsTranslations,
        ...req.body.keywordsTranslations,
      };
    }

    if (req.body.focusKeywordTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.focusKeywordTranslations = {
        ...(existingBlog?.focusKeywordTranslations || {}),
        ...req.body.focusKeywordTranslations,
      };
    }

    if (req.body.ogTitleTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.ogTitleTranslations = {
        ...(existingBlog?.ogTitleTranslations || {}),
        ...req.body.ogTitleTranslations,
      };
    }

    if (req.body.ogDescriptionTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.ogDescriptionTranslations = {
        ...(existingBlog?.ogDescriptionTranslations || {}),
        ...req.body.ogDescriptionTranslations,
      };
    }

    if (req.body.twitterTitleTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.twitterTitleTranslations = {
        ...(existingBlog?.twitterTitleTranslations || {}),
        ...req.body.twitterTitleTranslations,
      };
    }

    if (req.body.twitterDescriptionTranslations) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.twitterDescriptionTranslations = {
        ...(existingBlog?.twitterDescriptionTranslations || {}),
        ...req.body.twitterDescriptionTranslations,
      };
    }

    // If content is being updated, recalculate reading time
    if (updates.content) {
      updates.readingTime = calculateReadingTime(updates.content);
    }

    // If slug is being updated or generated, regenerate OG URL
    if (updates.title && !updates.slug) {
      updates.slug = generateSlug(updates.title);
    }

    // Parse keywords if provided
    if (updates.keywords !== undefined) {
      updates.keywords = parseKeywords(updates.keywords);
    }

    // Parse tags if provided
    if (updates.tags !== undefined) {
      updates.tags = parseKeywords(updates.tags);
    }

    // Auto-generate meta fields if title/excerpt changed
    if (updates.title && !updates.metaTitle) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.metaTitle = generateMetaTitle(updates.title, existingBlog?.metaTitle);
    }

    if (updates.excerpt && !updates.metaDescription) {
      const existingBlog = await Blog.findById(req.params.id);
      updates.metaDescription = generateMetaDescription(updates.excerpt, existingBlog?.metaDescription);
    }

    // Get base URL from environment or request
    const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    const blogSlug = updates.slug || (await Blog.findById(req.params.id))?.slug;

    // Auto-populate OG fields if not provided
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

    // Auto-populate Twitter fields if not provided
    if (!updates.twitterTitle) {
      updates.twitterTitle = updates.ogTitle || updates.metaTitle || updates.title;
    }

    if (!updates.twitterDescription) {
      updates.twitterDescription = updates.ogDescription || updates.metaDescription || updates.excerpt;
    }

    if (!updates.twitterImage) {
      updates.twitterImage = updates.ogImage || updates.featuredImage;
    }

    updates.updatedAt = Date.now(); // Update the updatedAt timestamp

    const blog = await Blog.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update blog', error: error.message });
  }
};

// @desc    Delete a blog post by ID
// @route   DELETE /api/blogs/:id
// @access  Private
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
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
