const HelpArticle = require('../models/helpArticle');

// Get all help articles (public)
exports.getAllHelpArticles = async (req, res) => {
  try {
    const articles = await HelpArticle.find({ isPublished: true })
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return res.status(200).json({ articles });
  } catch (error) {
    console.error('Error fetching help articles:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all help articles (admin - includes drafts)
exports.getAllHelpArticlesAdmin = async (req, res) => {
  try {
    const articles = await HelpArticle.find()
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return res.status(200).json({ articles });
  } catch (error) {
    console.error('Error fetching help articles (admin):', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get articles by category (public)
exports.getArticlesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const articles = await HelpArticle.find({ isPublished: true, category })
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return res.status(200).json({ articles });
  } catch (error) {
    console.error('Error fetching articles by category:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single article by ID or slug (public)
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let article = await HelpArticle.findById(id);
    if (!article) {
      article = await HelpArticle.findOne({ slug: id });
    }

    if (!article) {
      return res.status(404).json({ message: 'Help article not found' });
    }

    // Increment views
    article.views += 1;
    await article.save();

    return res.status(200).json({ article });
  } catch (error) {
    console.error('Error fetching help article:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new help article (admin)
exports.createHelpArticle = async (req, res) => {
  try {
    const { title, titleTranslations, slug, content, contentTranslations, excerpt, excerptTranslations, category, tags, order, isPublished } = req.body;

    // Parse translation objects if they come as strings
    let parsedTitleTranslations = titleTranslations;
    if (typeof titleTranslations === 'string') {
      try {
        parsedTitleTranslations = JSON.parse(titleTranslations);
      } catch (e) {
        parsedTitleTranslations = {};
      }
    }

    let parsedContentTranslations = contentTranslations;
    if (typeof contentTranslations === 'string') {
      try {
        parsedContentTranslations = JSON.parse(contentTranslations);
      } catch (e) {
        parsedContentTranslations = {};
      }
    }

    let parsedExcerptTranslations = excerptTranslations;
    if (typeof excerptTranslations === 'string') {
      try {
        parsedExcerptTranslations = JSON.parse(excerptTranslations);
      } catch (e) {
        parsedExcerptTranslations = {};
      }
    }

    // Generate slug from title if not provided
    const articleSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const article = new HelpArticle({
      title,
      titleTranslations: parsedTitleTranslations || {},
      slug: articleSlug,
      content,
      contentTranslations: parsedContentTranslations || {},
      excerpt,
      excerptTranslations: parsedExcerptTranslations || {},
      category,
      tags: tags || [],
      order: order || 0,
      isPublished: isPublished !== undefined ? isPublished : true,
    });

    await article.save();
    return res.status(201).json({ message: 'Help article created successfully', article });
  } catch (error) {
    console.error('Error creating help article:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Slug already exists', error: error.message });
    }
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a help article by ID (admin)
exports.updateHelpArticle = async (req, res) => {
  try {
    const { title, titleTranslations, slug, content, contentTranslations, excerpt, excerptTranslations, category, tags, order, isPublished } = req.body;

    // Parse translation objects if they come as strings
    let parsedTitleTranslations = titleTranslations;
    if (typeof titleTranslations === 'string') {
      try {
        parsedTitleTranslations = JSON.parse(titleTranslations);
      } catch (e) {
        parsedTitleTranslations = {};
      }
    }

    let parsedContentTranslations = contentTranslations;
    if (typeof contentTranslations === 'string') {
      try {
        parsedContentTranslations = JSON.parse(contentTranslations);
      } catch (e) {
        parsedContentTranslations = {};
      }
    }

    let parsedExcerptTranslations = excerptTranslations;
    if (typeof excerptTranslations === 'string') {
      try {
        parsedExcerptTranslations = JSON.parse(excerptTranslations);
      } catch (e) {
        parsedExcerptTranslations = {};
      }
    }

    // Get existing article to merge translations
    const existingArticle = await HelpArticle.findById(req.params.id);
    if (!existingArticle) {
      return res.status(404).json({ message: 'Help article not found' });
    }

    const updateData = {
      title: title !== undefined ? title : existingArticle.title,
      titleTranslations: parsedTitleTranslations
        ? { ...existingArticle.titleTranslations, ...parsedTitleTranslations }
        : existingArticle.titleTranslations,
      content: content !== undefined ? content : existingArticle.content,
      contentTranslations: parsedContentTranslations
        ? { ...existingArticle.contentTranslations, ...parsedContentTranslations }
        : existingArticle.contentTranslations,
      excerpt: excerpt !== undefined ? excerpt : existingArticle.excerpt,
      excerptTranslations: parsedExcerptTranslations
        ? { ...existingArticle.excerptTranslations, ...parsedExcerptTranslations }
        : existingArticle.excerptTranslations,
      category: category !== undefined ? category : existingArticle.category,
      tags: tags !== undefined ? tags : existingArticle.tags,
      order: order !== undefined ? order : existingArticle.order,
      isPublished: isPublished !== undefined ? isPublished : existingArticle.isPublished,
      updatedAt: Date.now(),
    };

    if (slug) {
      updateData.slug = slug;
    }

    const article = await HelpArticle.findByIdAndUpdate(req.params.id, updateData, { new: true });

    return res.status(200).json({ message: 'Help article updated successfully', article });
  } catch (error) {
    console.error('Error updating help article:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Slug already exists', error: error.message });
    }
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a help article by ID (admin)
exports.deleteHelpArticle = async (req, res) => {
  try {
    const article = await HelpArticle.findByIdAndDelete(req.params.id);

    if (!article) {
      return res.status(404).json({ message: 'Help article not found' });
    }

    return res.status(200).json({ message: 'Help article deleted successfully', article });
  } catch (error) {
    console.error('Error deleting help article:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

