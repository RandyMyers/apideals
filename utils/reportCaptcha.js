const crypto = require('crypto');

const store = new Map();
const TTL_MS = 10 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [id, row] of store.entries()) {
    if (row.expiresAt < now) store.delete(id);
  }
}

function createChallenge() {
  prune();
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const id = crypto.randomBytes(16).toString('hex');
  const answer = a + b;
  store.set(id, { answer, expiresAt: Date.now() + TTL_MS });
  return { captchaId: id, question: `${a} + ${b} = ?` };
}

function verifyChallenge(captchaId, captchaAnswer) {
  prune();
  if (!captchaId || captchaAnswer === undefined || captchaAnswer === null) {
    return { ok: false, message: 'Captcha required for anonymous reports.' };
  }
  const row = store.get(String(captchaId));
  if (!row) return { ok: false, message: 'Captcha expired. Please try again.' };
  store.delete(String(captchaId));
  if (parseInt(captchaAnswer, 10) !== row.answer) {
    return { ok: false, message: 'Incorrect captcha answer.' };
  }
  return { ok: true };
}

async function verifyRecaptcha(token) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return { ok: false, skipped: true };
  try {
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (!data.success) return { ok: false, message: 'Captcha verification failed.' };
    return { ok: true };
  } catch {
    return { ok: false, message: 'Captcha verification unavailable.' };
  }
}

module.exports = { createChallenge, verifyChallenge, verifyRecaptcha };
