/**
 * Server-side forum HTML sanitization (allowlist, no external DOM).
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'span',
]);

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeHref(href) {
  const h = String(href || '').trim();
  if (!h) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return h.slice(0, 500);
  if (h.startsWith('/') && !h.startsWith('//')) return h.slice(0, 500);
  return '';
}

function sanitizeTagAttrs(tag, attrs) {
  if (tag === 'a') {
    const hrefMatch = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const rawHref = hrefMatch ? (hrefMatch[2] || hrefMatch[3] || hrefMatch[4] || '') : '';
    const href = sanitizeHref(rawHref);
    if (!href) return '';
    return ` href="${escapeHtml(href)}" rel="nofollow ugc noopener noreferrer" target="_blank"`;
  }
  return '';
}

function sanitizeForumHtml(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().slice(0, 50000);
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return escapeHtml(trimmed).replace(/\n/g, '<br />');
  }

  let out = trimmed.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const tag = String(tagName).toLowerCase();
    const closing = match.startsWith('</');
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (closing) return `</${tag}>`;
    const safeAttrs = sanitizeTagAttrs(tag, attrs || '');
    if (tag === 'br') return '<br />';
    return `<${tag}${safeAttrs}>`;
  });

  out = out.replace(/\0/g, '').replace(/javascript:/gi, '');
  return out.trim();
}

function stripHtmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeForumContent(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(raw);
  const cleaned = hasHtml ? sanitizeForumHtml(raw) : escapeHtml(raw.trim()).replace(/\n/g, '<br />');
  const textLen = stripHtmlToText(cleaned).length;
  if (textLen < 1) return '';
  return cleaned.slice(0, 50000);
}

module.exports = {
  sanitizeForumHtml,
  sanitizeForumContent,
  stripHtmlToText,
};
