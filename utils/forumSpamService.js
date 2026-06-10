const crypto = require('crypto');
const ForumPost = require('../models/forumPost');
const { stripHtmlToText } = require('./forumSanitize');

const BLOCKED_DOMAINS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'cutt.ly',
  'rb.gy',
];

const SPAM_PHRASES = [
  /earn\s+\$\d+/i,
  /crypto\s+giveaway/i,
  /whatsapp\s*\+?\d/i,
  /telegram\.me/i,
  /click\s+here\s+now/i,
];

/**
 * Score 0–100. action: allow | pending | reject
 */
function scoreContent(content, { isNewAccount = false, pendingScore = 35, rejectScore = 70 } = {}) {
  if (!content || typeof content !== 'string') {
    return { score: 0, action: 'allow', reasons: [] };
  }

  const reasons = [];
  let score = 0;
  const text = stripHtmlToText(content);
  const lower = text.toLowerCase();

  const links = (text.match(/https?:\/\//gi) || []).length;
  if (links > 3) {
    score += 25;
    reasons.push('many_links');
  }
  if (links > 8) score += 40;

  if (/(.)\1{10,}/.test(text)) {
    score += 30;
    reasons.push('repeated_chars');
  }

  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 20) {
    const upperRatio = (letters.match(/[A-Z]/g) || []).length / letters.length;
    if (upperRatio > 0.7) {
      score += 20;
      reasons.push('shouting');
    }
  }

  for (const domain of BLOCKED_DOMAINS) {
    if (lower.includes(domain)) {
      score += 35;
      reasons.push('blocked_domain');
      break;
    }
  }

  for (const re of SPAM_PHRASES) {
    if (re.test(text)) {
      score += 40;
      reasons.push('spam_phrase');
      break;
    }
  }

  if (text.length > 8000) {
    score += 50;
    reasons.push('too_long');
  }

  let action = 'allow';
  if (score >= rejectScore) action = 'reject';
  else if (score >= pendingScore || (isNewAccount && score >= 20)) action = 'pending';

  return { score, action, reasons };
}

function contentHash(content) {
  const norm = String(content).toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(norm).digest('hex');
}

async function checkDuplicatePost(authorId, content, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const hash = contentHash(content);
  const recent = await ForumPost.find({
    authorId,
    createdAt: { $gte: since },
    isDeleted: false,
  })
    .select('content')
    .limit(20)
    .lean();

  const dup = recent.some((p) => contentHash(p.content) === hash);
  return dup;
}

/**
 * Optional OpenAI Moderation API layer (when OPENAI_API_KEY is set).
 * Returns { flagged, categories } or null on skip/failure.
 */
async function checkOpenAIModeration(content) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !content?.trim()) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: content.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return null;
    return { flagged: !!result.flagged, categories: result.categories || {} };
  } catch {
    return null;
  }
}

/**
 * Full production spam gate for thread/post body.
 */
async function evaluateForumContent(content, { user, isNewAccount, spamPendingScore, spamRejectScore } = {}) {
  const basic = require('./forumHelpers').checkSpamContent(content);
  if (!basic.ok) {
    return { ok: false, action: 'reject', message: basic.message, score: 100 };
  }

  const openai = await checkOpenAIModeration(content);
  if (openai?.flagged) {
    const severe =
      openai.categories?.['hate/threatening'] ||
      openai.categories?.['harassment/threatening'] ||
      openai.categories?.['self-harm/intent'] ||
      openai.categories?.['sexual/minors'] ||
      openai.categories?.violence;
    if (severe) {
      return {
        ok: false,
        action: 'reject',
        message: 'Your message was blocked because it may violate our community guidelines.',
        score: 100,
        reasons: ['openai_moderation'],
      };
    }
    return {
      ok: true,
      action: 'pending',
      message: 'Your post is awaiting moderation and will appear once approved.',
      score: 80,
      reasons: ['openai_moderation'],
    };
  }

  const scored = scoreContent(content, {
    isNewAccount,
    pendingScore: spamPendingScore ?? 35,
    rejectScore: spamRejectScore ?? 70,
  });
  if (scored.action === 'reject') {
    return {
      ok: false,
      action: 'reject',
      message: 'Your message was blocked by our spam filters. Please revise and try again.',
      score: scored.score,
      reasons: scored.reasons,
    };
  }

  if (user?._id) {
    const dup = await checkDuplicatePost(user._id, content);
    if (dup) {
      return {
        ok: false,
        action: 'reject',
        message: 'Duplicate content detected. Please avoid posting the same message repeatedly.',
        score: 90,
        reasons: ['duplicate'],
      };
    }
  }

  if (scored.action === 'pending') {
    return {
      ok: true,
      action: 'pending',
      message: 'Your post is awaiting moderation and will appear once approved.',
      score: scored.score,
      reasons: scored.reasons,
    };
  }

  return { ok: true, action: 'allow', score: scored.score, reasons: scored.reasons };
}

module.exports = {
  scoreContent,
  evaluateForumContent,
  checkDuplicatePost,
  checkOpenAIModeration,
  contentHash,
};
