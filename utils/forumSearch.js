/**
 * Production forum search — Elasticsearch (optional), MongoDB text indexes, regex fallback.
 */

const { searchForumElasticsearch, isEnabled: esEnabled } = require('./forumElasticsearch');

function escapeRegex(q) {
  return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Prepare string for $text search (strip operators Mongo treats specially). */
function toTextSearchQuery(q) {
  return String(q)
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 8)
    .join(' ');
}

async function searchThreads({ ForumThread, visibleFilter, q, page, limit }) {
  if (esEnabled()) {
    const es = await searchForumElasticsearch(q, { page, limit });
    if (es && es.hits?.length) {
      const slugs = es.hits.map((h) => h.slug).filter(Boolean);
      const threads = await ForumThread.find({ slug: { $in: slugs }, ...visibleFilter })
        .populate('authorId')
        .populate('categoryId', 'name slug')
        .lean();
      const order = new Map(slugs.map((s, i) => [s, i]));
      threads.sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
      return { threads, total: es.total, mode: 'elasticsearch' };
    }
  }

  const textQ = toTextSearchQuery(q);
  if (textQ.length >= 2) {
    try {
      const filter = { ...visibleFilter, $text: { $search: textQ } };
      const [threads, total] = await Promise.all([
        ForumThread.find(filter, { score: { $meta: 'textScore' } })
          .sort({ score: { $meta: 'textScore' }, lastPostAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('authorId')
          .populate('categoryId', 'name slug')
          .lean(),
        ForumThread.countDocuments(filter),
      ]);
      if (threads.length > 0 || total > 0) {
        return { threads, total, mode: 'text' };
      }
    } catch (err) {
      if (err.code !== 17007 && !/text index/i.test(err.message)) {
        console.warn('[forumSearch] text index search failed, using regex:', err.message);
      }
    }
  }

  const regex = new RegExp(escapeRegex(q), 'i');
  const filter = {
    ...visibleFilter,
    $or: [{ title: regex }, { tags: regex }],
  };
  const [threads, total] = await Promise.all([
    ForumThread.find(filter)
      .sort({ lastPostAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('authorId')
      .populate('categoryId', 'name slug')
      .lean(),
    ForumThread.countDocuments(filter),
  ]);
  return { threads, total, mode: 'regex' };
}

async function searchPosts({ ForumPost, q, limit = 10 }) {
  const textQ = toTextSearchQuery(q);
  const base = { isDeleted: false, moderationStatus: 'visible' };

  if (textQ.length >= 2) {
    try {
      const posts = await ForumPost.find(
        { ...base, $text: { $search: textQ } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .limit(limit)
        .populate('threadId', 'title slug categoryId')
        .populate('authorId')
        .lean();
      if (posts.length > 0) return { posts, mode: 'text' };
    } catch (err) {
      console.warn('[forumSearch] post text search fallback:', err.message);
    }
  }

  const regex = new RegExp(escapeRegex(q), 'i');
  const posts = await ForumPost.find({ ...base, content: regex })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('threadId', 'title slug categoryId')
    .populate('authorId')
    .lean();
  return { posts, mode: 'regex' };
}

module.exports = { searchThreads, searchPosts, toTextSearchQuery };
