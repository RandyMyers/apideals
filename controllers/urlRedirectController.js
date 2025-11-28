const UrlRedirect = require('../models/urlRedirect');
const Blog = require('../models/blog');

/**
 * Find and execute a redirect
 */
exports.findRedirect = async (req, res) => {
  try {
    const oldPath = req.path.toLowerCase().replace(/^\/+|\/+$/g, '');
    const normalizedPath = oldPath.startsWith('/') ? oldPath : '/' + oldPath;
    
    // Find active redirect
    const redirect = await UrlRedirect.findOne({
      oldPath: normalizedPath,
      isActive: true
    });
    
    if (redirect) {
      // Record the hit
      await redirect.recordHit();
      
      // Perform redirect
      return res.redirect(redirect.redirectType, redirect.newPath);
    }
    
    // No redirect found - let the request continue (React Router will handle it)
    return res.status(404).json({ message: 'Not found' });
  } catch (error) {
    console.error('Error finding redirect:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Create a new redirect
 */
exports.createRedirect = async (req, res) => {
  try {
    const { oldPath, newPath, redirectType = 301, referenceType, referenceId, notes } = req.body;
    
    if (!oldPath || !newPath) {
      return res.status(400).json({ message: 'oldPath and newPath are required' });
    }
    
    const redirect = new UrlRedirect({
      oldPath,
      newPath,
      redirectType,
      referenceType,
      referenceId,
      notes
    });
    
    await redirect.save();
    
    res.status(201).json(redirect);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A redirect for this oldPath already exists' });
    }
    console.error('Error creating redirect:', error);
    res.status(500).json({ message: 'Failed to create redirect', error: error.message });
  }
};

/**
 * Get all redirects
 */
exports.getAllRedirects = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const query = {};
    if (search) {
      query.$or = [
        { oldPath: { $regex: search, $options: 'i' } },
        { newPath: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const redirects = await UrlRedirect.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await UrlRedirect.countDocuments(query);
    
    res.json({
      redirects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching redirects:', error);
    res.status(500).json({ message: 'Failed to fetch redirects', error: error.message });
  }
};

/**
 * Update a redirect
 */
exports.updateRedirect = async (req, res) => {
  try {
    const { oldPath, newPath, redirectType, isActive, notes } = req.body;
    
    const redirect = await UrlRedirect.findById(req.params.id);
    if (!redirect) {
      return res.status(404).json({ message: 'Redirect not found' });
    }
    
    if (oldPath) redirect.oldPath = oldPath;
    if (newPath) redirect.newPath = newPath;
    if (redirectType) redirect.redirectType = redirectType;
    if (isActive !== undefined) redirect.isActive = isActive;
    if (notes !== undefined) redirect.notes = notes;
    
    await redirect.save();
    
    res.json(redirect);
  } catch (error) {
    console.error('Error updating redirect:', error);
    res.status(500).json({ message: 'Failed to update redirect', error: error.message });
  }
};

/**
 * Delete a redirect
 */
exports.deleteRedirect = async (req, res) => {
  try {
    const redirect = await UrlRedirect.findById(req.params.id);
    if (!redirect) {
      return res.status(404).json({ message: 'Redirect not found' });
    }
    
    await redirect.deleteOne();
    
    res.json({ message: 'Redirect deleted successfully' });
  } catch (error) {
    console.error('Error deleting redirect:', error);
    res.status(500).json({ message: 'Failed to delete redirect', error: error.message });
  }
};

/**
 * Bulk import redirects from WordPress
 * Expected format: [{ oldPath, newPath, redirectType? }, ...]
 */
exports.bulkImportRedirects = async (req, res) => {
  try {
    const { redirects } = req.body;
    
    if (!Array.isArray(redirects) || redirects.length === 0) {
      return res.status(400).json({ message: 'redirects array is required' });
    }
    
    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };
    
    for (const redirectData of redirects) {
      try {
        const { oldPath, newPath, redirectType = 301, referenceType, referenceId, notes } = redirectData;
        
        if (!oldPath || !newPath) {
          results.errors.push({ redirect: redirectData, error: 'Missing oldPath or newPath' });
          continue;
        }
        
        // Check if redirect already exists
        const existing = await UrlRedirect.findOne({ oldPath });
        if (existing) {
          results.skipped++;
          continue;
        }
        
        const redirect = new UrlRedirect({
          oldPath,
          newPath,
          redirectType,
          referenceType,
          referenceId,
          notes
        });
        
        await redirect.save();
        results.created++;
      } catch (error) {
        results.errors.push({ redirect: redirectData, error: error.message });
      }
    }
    
    res.json({
      message: 'Bulk import completed',
      results
    });
  } catch (error) {
    console.error('Error bulk importing redirects:', error);
    res.status(500).json({ message: 'Failed to bulk import redirects', error: error.message });
  }
};

/**
 * Auto-generate redirects from blog posts
 * Maps WordPress blog URLs to React blog URLs
 */
exports.autoGenerateBlogRedirects = async (req, res) => {
  try {
    const blogs = await Blog.find({});
    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };
    
    for (const blog of blogs) {
      try {
        // Common WordPress blog URL patterns
        const wordpressPatterns = [
          `/blog/${blog.slug}`,
          `/post/${blog.slug}`,
          `/article/${blog.slug}`,
          `/news/${blog.slug}`,
          `/${blog.slug}` // Sometimes WordPress uses root-level slugs
        ];
        
        const newPath = `/blog/${blog.slug}`;
        
        for (const oldPath of wordpressPatterns) {
          // Check if redirect already exists
          const existing = await UrlRedirect.findOne({ oldPath });
          if (existing) {
            results.skipped++;
            continue;
          }
          
          const redirect = new UrlRedirect({
            oldPath,
            newPath,
            redirectType: 301,
            referenceType: 'blog',
            referenceId: blog._id,
            notes: `Auto-generated from blog: ${blog.title}`
          });
          
          await redirect.save();
          results.created++;
        }
      } catch (error) {
        results.errors.push({ blog: blog._id, error: error.message });
      }
    }
    
    res.json({
      message: 'Auto-generation completed',
      results
    });
  } catch (error) {
    console.error('Error auto-generating blog redirects:', error);
    res.status(500).json({ message: 'Failed to auto-generate redirects', error: error.message });
  }
};

