/**
 * SEO Utility Functions
 * Provides helper functions for SEO-related calculations and transformations
 */

/**
 * Calculate reading time based on content
 * Average reading speed: 200 words per minute
 * @param {string} content - HTML content string
 * @returns {number} Reading time in minutes (minimum 1)
 */
const calculateReadingTime = (content) => {
  if (!content || typeof content !== 'string') {
    return 1;
  }

  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, '');
  
  // Count words (split by whitespace and filter out empty strings)
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // Calculate minutes (average reading speed: 200 words per minute)
  const minutes = Math.ceil(words / 200);
  
  // Return minimum 1 minute
  return minutes || 1;
};

/**
 * Generate slug from title
 * @param {string} title - Blog title
 * @returns {string} URL-friendly slug
 */
const generateSlug = (title) => {
  if (!title || typeof title !== 'string') {
    return '';
  }

  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Auto-generate meta title from title if not provided
 * @param {string} title - Blog title
 * @param {string} metaTitle - Existing meta title (optional)
 * @returns {string} Meta title
 */
const generateMetaTitle = (title, metaTitle = '') => {
  if (metaTitle && metaTitle.trim()) {
    return metaTitle.trim();
  }
  if (title && title.trim()) {
    // Use title as meta title, but limit to 60 characters
    return title.trim().substring(0, 60);
  }
  return '';
};

/**
 * Auto-generate meta description from excerpt if not provided
 * @param {string} excerpt - Blog excerpt
 * @param {string} metaDescription - Existing meta description (optional)
 * @returns {string} Meta description
 */
const generateMetaDescription = (excerpt, metaDescription = '') => {
  if (metaDescription && metaDescription.trim()) {
    return metaDescription.trim();
  }
  if (excerpt && excerpt.trim()) {
    // Use excerpt as meta description, but limit to 160 characters
    return excerpt.trim().substring(0, 160);
  }
  return '';
};

/**
 * Auto-generate OG URL if not provided
 * @param {string} slug - Blog slug
 * @param {string} baseUrl - Base URL of the site
 * @param {string} ogUrl - Existing OG URL (optional)
 * @returns {string} OG URL
 */
const generateOgUrl = (slug, baseUrl = '', ogUrl = '') => {
  if (ogUrl && ogUrl.trim()) {
    return ogUrl.trim();
  }
  if (slug && baseUrl) {
    return `${baseUrl}/blog/${slug}`;
  }
  return '';
};

/**
 * Extract keywords from comma-separated string and convert to array
 * @param {string|Array} keywords - Keywords as string or array
 * @returns {Array} Array of keywords
 */
const parseKeywords = (keywords) => {
  if (Array.isArray(keywords)) {
    return keywords.filter(k => k && k.trim());
  }
  if (typeof keywords === 'string' && keywords.trim()) {
    return keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }
  return [];
};

/**
 * Validate and format meta title
 * @param {string} metaTitle - Meta title
 * @returns {object} Validation result with isValid, message, and formatted value
 */
const validateMetaTitle = (metaTitle) => {
  if (!metaTitle || !metaTitle.trim()) {
    return {
      isValid: false,
      message: 'Meta title is required',
      formatted: '',
    };
  }

  const trimmed = metaTitle.trim();
  const length = trimmed.length;

  if (length < 30) {
    return {
      isValid: false,
      message: 'Meta title is too short (minimum 30 characters)',
      formatted: trimmed,
    };
  }

  if (length > 60) {
    return {
      isValid: true,
      message: `Meta title is ${length} characters (recommended: 50-60)`,
      formatted: trimmed.substring(0, 60),
    };
  }

  return {
    isValid: true,
    message: `Meta title is ${length} characters (optimal)`,
    formatted: trimmed,
  };
};

/**
 * Validate and format meta description
 * @param {string} metaDescription - Meta description
 * @returns {object} Validation result with isValid, message, and formatted value
 */
const validateMetaDescription = (metaDescription) => {
  if (!metaDescription || !metaDescription.trim()) {
    return {
      isValid: false,
      message: 'Meta description is required',
      formatted: '',
    };
  }

  const trimmed = metaDescription.trim();
  const length = trimmed.length;

  if (length < 120) {
    return {
      isValid: false,
      message: 'Meta description is too short (minimum 120 characters)',
      formatted: trimmed,
    };
  }

  if (length > 160) {
    return {
      isValid: true,
      message: `Meta description is ${length} characters (recommended: 150-160)`,
      formatted: trimmed.substring(0, 160),
    };
  }

  return {
    isValid: true,
    message: `Meta description is ${length} characters (optimal)`,
    formatted: trimmed,
  };
};

module.exports = {
  calculateReadingTime,
  generateSlug,
  generateMetaTitle,
  generateMetaDescription,
  generateOgUrl,
  parseKeywords,
  validateMetaTitle,
  validateMetaDescription,
};

