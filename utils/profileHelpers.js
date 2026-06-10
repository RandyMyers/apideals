const RESERVED_SLUGS = new Set([
  'admin', 'api', 'login', 'register', 'profile', 'dashboard', 'forum', 'u', 'users',
  'stores', 'store', 'coupons', 'coupon', 'deals', 'deal', 'categories', 'category',
  'blog', 'search', 'about', 'contact', 'help', 'faq', 'privacy', 'terms', 'cookies',
  'pricing', 'benefits', 'partners', 'submit-coupon', 'my-submissions', 'settings',
  'auth', 'billing', 'woocommerce', 'sitemap', 'feed', 'wp-admin', 'wp-content',
]);

const SOCIAL_PLATFORMS = new Set([
  'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'facebook', 'github', 'website', 'other',
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

function normalizeSlug(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function isValidSlug(slug) {
  if (!slug || slug.length < 3 || slug.length > 30) return false;
  if (!SLUG_RE.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}

function isValidHttpsUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeSocialLinks(links = []) {
  if (!Array.isArray(links)) return [];
  const out = [];
  for (let i = 0; i < links.length && out.length < 5; i++) {
    const item = links[i];
    if (!item || typeof item !== 'object') continue;
    const platform = SOCIAL_PLATFORMS.has(item.platform) ? item.platform : 'other';
    const url = String(item.url || '').trim();
    if (!isValidHttpsUrl(url)) continue;
    out.push({
      platform,
      url,
      label: String(item.label || '').trim().slice(0, 40),
      order: typeof item.order === 'number' ? item.order : i,
    });
  }
  return out.sort((a, b) => (a.order || 0) - (b.order || 0));
}

function displayNameFor(user) {
  const pp = user.publicProfile || {};
  if (pp.displayName?.trim()) return pp.displayName.trim();
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return user.username;
}

function isProfilePubliclyVisible(user) {
  if (!user || !user.isActive || user.isSuspended) return false;
  const pp = user.publicProfile || {};
  if (pp.isEnabled === false) return false;
  if (pp.visibility === 'private') return false;
  return true;
}

function isProfileIndexable(user) {
  if (!isProfilePubliclyVisible(user)) return false;
  const pp = user.publicProfile || {};
  return pp.visibility === 'public';
}

function computeProfileCompletion(user) {
  const pp = user.publicProfile || {};
  const checks = [
    { key: 'avatar', done: !!user.profilePicture, label: 'Add a profile photo' },
    { key: 'bio', done: !!(user.bio && user.bio.trim()), label: 'Write a short bio' },
    { key: 'headline', done: !!(pp.headline && pp.headline.trim()), label: 'Add a headline' },
    { key: 'website', done: !!(pp.websiteUrl && isValidHttpsUrl(pp.websiteUrl)), label: 'Add your website' },
    { key: 'social', done: Array.isArray(pp.socialLinks) && pp.socialLinks.some((l) => l.url), label: 'Add a social link' },
    { key: 'verified', done: !!user.isEmailVerified, label: 'Verify your email' },
  ];
  const done = checks.filter((c) => c.done).length;
  const percent = Math.round((done / checks.length) * 100);
  return { percent, checks, isComplete: percent >= 100 };
}

function computeBadges(user, stats = {}) {
  const pp = user.publicProfile || {};
  const badges = [];
  if (pp.completedAt) badges.push({ id: 'profile_complete', label: 'Profile complete' });
  if (pp.trustedContributor) badges.push({ id: 'trusted', label: 'Trusted contributor' });
  if ((stats.approvedSubmissions || 0) >= 5) badges.push({ id: 'top_sharer', label: 'Deal sharer' });
  if ((stats.forumPosts || 0) >= 10) badges.push({ id: 'forum_regular', label: 'Forum regular' });
  else if ((stats.forumPosts || 0) >= 1) badges.push({ id: 'community_member', label: 'Community member' });
  return badges;
}

function buildSafePublicProfile(user, stats = {}) {
  const pp = user.publicProfile || {};
  const slug = user.profileSlug || user.username;
  return {
    id: user._id,
    username: user.username,
    profileSlug: slug,
    displayName: displayNameFor(user),
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    bio: user.bio || '',
    profilePicture: user.profilePicture || null,
    headline: pp.headline || '',
    websiteUrl: user.isEmailVerified && pp.websiteUrl ? pp.websiteUrl : null,
    socialLinks:
      user.isEmailVerified && Array.isArray(pp.socialLinks)
        ? pp.socialLinks.map(({ platform, url, label, order }) => ({
            platform,
            url,
            label: label || '',
            order: order || 0,
          }))
        : [],
    location: pp.location || '',
    visibility: pp.visibility || 'public',
    isEnabled: pp.isEnabled !== false,
    trustedContributor: !!pp.trustedContributor,
    showStats: pp.showStats !== false,
    showActivity: pp.showActivity !== false,
    memberSince: user.createdAt,
    isEmailVerified: !!user.isEmailVerified,
    stats: pp.showStats !== false ? stats : null,
    badges: computeBadges(user, stats),
  };
}

module.exports = {
  RESERVED_SLUGS,
  SOCIAL_PLATFORMS,
  normalizeSlug,
  isValidSlug,
  isValidHttpsUrl,
  sanitizeSocialLinks,
  displayNameFor,
  isProfilePubliclyVisible,
  isProfileIndexable,
  computeProfileCompletion,
  computeBadges,
  buildSafePublicProfile,
};
