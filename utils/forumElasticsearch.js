/**
 * Optional Elasticsearch forum search (ELASTICSEARCH_URL).
 */

const INDEX = process.env.ELASTICSEARCH_FORUM_INDEX || 'dealcouponz_forum';

function isEnabled() {
  return !!process.env.ELASTICSEARCH_URL;
}

function baseUrl() {
  return String(process.env.ELASTICSEARCH_URL).replace(/\/$/, '');
}

async function esFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (process.env.ELASTICSEARCH_API_KEY) {
    headers.Authorization = `ApiKey ${process.env.ELASTICSEARCH_API_KEY}`;
  }
  const res = await fetch(`${baseUrl()}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Elasticsearch ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function ensureIndex() {
  if (!isEnabled()) return false;
  try {
    await esFetch(`/${INDEX}`, {
      method: 'PUT',
      body: JSON.stringify({
        mappings: {
          properties: {
            type: { type: 'keyword' },
            title: { type: 'text' },
            content: { type: 'text' },
            tags: { type: 'keyword' },
            slug: { type: 'keyword' },
            categorySlug: { type: 'keyword' },
            threadId: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      }),
    });
    return true;
  } catch (err) {
    if (/resource_already_exists/i.test(err.message)) return true;
    console.warn('[forumElasticsearch] ensureIndex:', err.message);
    return false;
  }
}

async function indexDocument(doc) {
  if (!isEnabled()) return;
  try {
    await esFetch(`/${INDEX}/_doc/${doc.id}`, {
      method: 'PUT',
      body: JSON.stringify(doc),
    });
  } catch (err) {
    console.warn('[forumElasticsearch] indexDocument:', err.message);
  }
}

async function searchForumElasticsearch(q, { page = 1, limit = 20 } = {}) {
  if (!isEnabled()) return null;
  try {
    const from = (page - 1) * limit;
    const data = await esFetch(`/${INDEX}/_search`, {
      method: 'POST',
      body: JSON.stringify({
        from,
        size: limit,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: q,
                  fields: ['title^3', 'content', 'tags'],
                  fuzziness: 'AUTO',
                },
              },
            ],
            filter: [{ term: { type: 'thread' } }],
          },
        },
        sort: [{ _score: 'desc' }, { createdAt: 'desc' }],
      }),
    });
    return {
      hits: (data.hits?.hits || []).map((h) => ({ ...h._source, _score: h._score })),
      total: data.hits?.total?.value ?? 0,
      mode: 'elasticsearch',
    };
  } catch (err) {
    console.warn('[forumElasticsearch] search:', err.message);
    return null;
  }
}

module.exports = {
  isEnabled,
  ensureIndex,
  indexDocument,
  searchForumElasticsearch,
};
