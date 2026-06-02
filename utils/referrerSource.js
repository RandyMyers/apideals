/**
 * Normalize HTTP referrer URLs into readable traffic sources for analytics.
 */

function parseHostname(referrer) {
  if (!referrer || typeof referrer !== 'string') return null;
  const trimmed = referrer.trim();
  if (!trimmed) return null;
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).hostname.replace(/^www\./i, '').toLowerCase();
    }
    return trimmed.replace(/^www\./i, '').split('/')[0].toLowerCase();
  } catch {
    return trimmed.replace(/^www\./i, '').split('/')[0].toLowerCase();
  }
}

const HOST_LABELS = [
  [/google\./i, 'Google'],
  [/bing\.com/i, 'Bing'],
  [/yahoo\./i, 'Yahoo'],
  [/duckduckgo\./i, 'DuckDuckGo'],
  [/facebook\.com|fb\.com|m\.facebook/i, 'Facebook'],
  [/instagram\.com/i, 'Instagram'],
  [/twitter\.com|t\.co|x\.com/i, 'X (Twitter)'],
  [/linkedin\.com/i, 'LinkedIn'],
  [/pinterest\./i, 'Pinterest'],
  [/reddit\.com/i, 'Reddit'],
  [/youtube\.com|youtu\.be/i, 'YouTube'],
  [/tiktok\.com/i, 'TikTok'],
  [/chat\.openai\.com|chatgpt\.com/i, 'ChatGPT'],
  [/perplexity\./i, 'Perplexity'],
  [/claude\.ai|anthropic\./i, 'Claude'],
  [/gemini\.google/i, 'Gemini'],
  [/copilot\.microsoft/i, 'Microsoft Copilot'],
];

/**
 * @param {string|null|undefined} referrer - Raw document.referrer or HTTP Referer header
 * @returns {{ source: string, raw: string|null, isDirect: boolean }}
 */
function normalizeReferrerSource(referrer) {
  const raw = referrer && String(referrer).trim() ? String(referrer).trim() : null;
  if (!raw) {
    return { source: 'Direct', raw: null, isDirect: true };
  }

  const host = parseHostname(raw);
  if (!host) {
    return { source: 'Direct', raw, isDirect: true };
  }

  for (const [pattern, label] of HOST_LABELS) {
    if (pattern.test(host) || pattern.test(raw)) {
      return { source: label, raw, isDirect: false };
    }
  }

  return { source: host, raw, isDirect: false };
}

module.exports = { normalizeReferrerSource, parseHostname };
