/**
 * Central transactional email — nodemailer SMTP + optional SendGrid API.
 * Config: MongoDB EmailSettings → env vars → disabled.
 */
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const EmailSettings = require('../models/emailSettings');
const EmailLog = require('../models/emailLog');
const { getCachedEmailSettings, invalidateEmailSettingsCache } = require('../utils/emailSettingsCache');
const { logger } = require('../utils/logger');
const { buildLocalizedClientUrl } = require('../utils/emailLinkLocale');

let smtpTransporter = null;
let smtpConfigKey = '';

function logEmailToDb({ to, subject, type, status, reason, config }) {
  EmailLog.create({
    to,
    subject,
    type: type || 'other',
    status,
    reason: reason || '',
    provider: config?.provider || '',
    smtpHost: config?.smtpHost || '',
  }).catch((e) => {
    console.error('[emailService] Could not write email log:', e.message);
  });
}

function envStr(...keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function envBool(...keys) {
  const v = envStr(...keys);
  if (!v) return undefined;
  return v === 'true' || v === '1';
}

function envInt(fallback, ...keys) {
  const v = envStr(...keys);
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function loadDbSettings() {
  try {
    return await getCachedEmailSettings(EmailSettings);
  } catch (e) {
    logger.warn('[emailService] Could not load EmailSettings', { error: e.message });
    return {};
  }
}

async function resolveConfig() {
  const db = await loadDbSettings();
  const withSecrets = await EmailSettings.findOne().select('+smtpPassword +sendgridApiKey').lean();

  const smtpHost = db.smtpHost || envStr('SMTP_HOST', 'HOST');
  const smtpPort = db.smtpPort || envInt(587, 'SMTP_PORT', 'HPORT');
  const smtpSecure = db.smtpSecure ?? envBool('SMTP_SECURE', 'SECURE') ?? false;
  const smtpUser = db.smtpUser || envStr('SMTP_USER', 'USER');
  const smtpPassword = withSecrets?.smtpPassword || envStr('SMTP_PASSWORD', 'SMTP_PASS', 'PASSWORD');
  const sendgridApiKey = withSecrets?.sendgridApiKey || envStr('SENDGRID_API_KEY');
  const provider = db.provider || (sendgridApiKey && !smtpHost ? 'sendgrid_api' : 'smtp');

  // SMTP servers (Hostinger etc.) reject From addresses the authenticated
  // mailbox doesn't own — default From to the SMTP user, not a made-up address.
  const smtpUserAsFrom = smtpUser.includes('@') ? smtpUser : '';

  return {
    enabled: db.enabled !== false && process.env.DISABLE_EMAIL !== 'true',
    sendInDevelopment: db.sendInDevelopment === true || process.env.EMAIL_SEND_IN_DEV === 'true',
    provider,
    smtpHost,
    smtpPort,
    smtpSecure: smtpSecure || smtpPort === 465,
    smtpUser,
    smtpPassword,
    sendgridApiKey,
    fromEmail: db.fromEmail || envStr('EMAIL_FROM') || smtpUserAsFrom || 'noreply@dealcouponz.com',
    fromName: db.fromName || envStr('EMAIL_FROM_NAME') || 'DealCouponz',
    replyTo: db.replyTo || envStr('EMAIL_REPLY_TO') || '',
    clientUrl: (db.clientUrl || envStr('CLIENT_URL') || 'http://localhost:3000').replace(/\/$/, ''),
    adminUrl: (db.adminUrl || envStr('ADMIN_URL') || envStr('CLIENT_URL') || 'http://localhost:3001').replace(/\/$/, ''),
    verificationExpiryHours: db.verificationExpiryHours || 24,
    resetExpiryHours: db.resetExpiryHours || 1,
  };
}

function formatFrom(config) {
  if (config.fromName && config.fromEmail) {
    return `${config.fromName} <${config.fromEmail}>`;
  }
  return config.fromEmail;
}

function getSmtpTransporter(config) {
  // Hash the password into the cache key so updating credentials in admin
  // immediately rebuilds the transporter (no server restart needed).
  const passHash = crypto.createHash('sha1').update(config.smtpPassword || '').digest('hex').slice(0, 8);
  const key = `${config.smtpHost}:${config.smtpPort}:${config.smtpUser}:${config.smtpSecure}:${passHash}`;
  if (smtpTransporter && smtpConfigKey === key) return smtpTransporter;
  if (!config.smtpHost) return null;
  console.log(`[emailService] Creating SMTP transporter → ${config.smtpHost}:${config.smtpPort} (secure=${config.smtpSecure}, user=${config.smtpUser || 'none'})`);
  smtpTransporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: config.smtpUser && config.smtpPassword
      ? { user: config.smtpUser, pass: config.smtpPassword }
      : undefined,
  });
  smtpConfigKey = key;
  return smtpTransporter;
}

async function isEmailConfigured() {
  const config = await resolveConfig();
  if (config.provider === 'sendgrid_api' && config.sendgridApiKey) return true;
  return Boolean(config.smtpHost);
}

async function shouldSendEmail() {
  const config = await resolveConfig();
  if (!config.enabled) return false;
  if (process.env.NODE_ENV !== 'production' && !config.sendInDevelopment) return false;
  return isEmailConfigured();
}

/**
 * Send an email.
 * @param {object} opts
 * @param {boolean} [opts.force] - bypass the development skip (used by admin "Send test")
 * @param {string} [opts.type] - log category: verification | password_reset | test | digest | other
 */
async function sendMail({ to, subject, html, text, replyTo, force = false, type = 'other' }) {
  const config = await resolveConfig();
  const from = formatFrom(config);

  console.log(`[emailService] Preparing email → to=${to} subject="${subject}" provider=${config.provider} host=${config.smtpHost || 'none'}:${config.smtpPort} from=${from}`);

  if (!config.enabled || process.env.DISABLE_EMAIL === 'true') {
    console.warn(`[emailService] SKIPPED (email disabled) → to=${to} subject="${subject}". Enable "Enable outbound email" in Admin → Email & SMTP, and make sure DISABLE_EMAIL is not "true".`);
    logger.warn('[emailService] Email disabled — skipping', { to, subject });
    logEmailToDb({ to, subject, type, status: 'skipped', reason: 'disabled', config });
    return { sent: false, reason: 'disabled' };
  }

  if (!force && process.env.NODE_ENV !== 'production' && !config.sendInDevelopment) {
    console.warn(`[emailService] SKIPPED (development mode) → to=${to} subject="${subject}". NODE_ENV="${process.env.NODE_ENV}". Check "Send in development" in Admin → Email & SMTP or set EMAIL_SEND_IN_DEV=true to send locally.`);
    logger.warn('[emailService] Dev send skipped (enable sendInDevelopment in admin or EMAIL_SEND_IN_DEV=true)', { to, subject });
    logEmailToDb({ to, subject, type, status: 'skipped', reason: 'dev_skipped', config });
    return { sent: false, reason: 'dev_skipped' };
  }

  const mail = {
    from,
    to,
    subject,
    html,
    text: text || String(html || '').replace(/<[^>]*>/g, ''),
    replyTo: replyTo || config.replyTo || undefined,
  };

  try {
    if (config.provider === 'sendgrid_api' && config.sendgridApiKey) {
      console.log(`[emailService] Sending via SendGrid API → to=${to}`);
      sgMail.setApiKey(config.sendgridApiKey);
      await sgMail.send({
        from: config.fromEmail,
        to,
        subject,
        html: mail.html,
        text: mail.text,
      });
      console.log(`[emailService] ✅ SENT via SendGrid → to=${to} subject="${subject}"`);
      logEmailToDb({ to, subject, type, status: 'sent', config });
      return { sent: true };
    }

    const transport = getSmtpTransporter(config);
    if (!transport) {
      console.warn(`[emailService] SKIPPED (SMTP not configured) → to=${to} subject="${subject}". Save SMTP host/port/user/password in Admin → Email & SMTP.`);
      logger.warn('[emailService] SMTP not configured — skipping', { to, subject });
      logEmailToDb({ to, subject, type, status: 'skipped', reason: 'not_configured', config });
      return { sent: false, reason: 'not_configured' };
    }

    if (config.smtpUser.includes('@') && config.fromEmail.toLowerCase() !== config.smtpUser.toLowerCase()) {
      console.warn(`[emailService] ⚠ From address (${config.fromEmail}) differs from SMTP user (${config.smtpUser}). Providers like Hostinger reject this with "553 Sender address rejected" unless the mailbox owns the alias.`);
    }
    console.log(`[emailService] Sending via SMTP ${config.smtpHost}:${config.smtpPort} → to=${to}...`);
    const info = await transport.sendMail(mail);
    console.log(`[emailService] ✅ SENT via SMTP → to=${to} subject="${subject}" messageId=${info.messageId || 'n/a'} response=${info.response || 'n/a'}`);
    logEmailToDb({ to, subject, type, status: 'sent', config });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[emailService] ❌ SEND FAILED → to=${to} subject="${subject}"`);
    console.error(`[emailService] Error: ${error.message}`);
    if (error.code) console.error(`[emailService] Code: ${error.code}${error.responseCode ? `, SMTP response code: ${error.responseCode}` : ''}`);
    if (error.response) console.error(`[emailService] Server response: ${error.response}`);
    logger.error('[emailService] Send failed', { error: error.message, code: error.code, to, subject });
    logEmailToDb({ to, subject, type, status: 'failed', reason: error.message, config });
    throw error;
  }
}

function verificationEmailHtml({ username, url }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Verify your DealCouponz account</h2>
      <p>Hi ${username || 'there'},</p>
      <p>Please confirm your email address to unlock forum posting, public profile links, and other member features.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify email address
        </a>
      </div>
      <p>If the button does not work, copy this link:</p>
      <p style="word-break: break-all; color: #666;">${url}</p>
      <p>This link expires in 24 hours. If you did not create an account, ignore this email.</p>
    </div>
  `;
}

function resetEmailHtml({ username, url }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Reset your password</h2>
      <p>Hi ${username || 'there'},</p>
      <p>We received a request to reset your DealCouponz password.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset password
        </a>
      </div>
      <p>If the button does not work, copy this link:</p>
      <p style="word-break: break-all; color: #666;">${url}</p>
      <p>This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
    </div>
  `;
}

async function sendVerificationEmail({ email, username, token, locale }) {
  const config = await resolveConfig();
  const url = buildLocalizedClientUrl(
    config.clientUrl,
    `/verify-email?token=${encodeURIComponent(token)}`,
    locale
  );
  return sendMail({
    to: email,
    subject: 'Verify your DealCouponz account',
    html: verificationEmailHtml({ username, url }),
    type: 'verification',
  });
}

async function sendPasswordResetEmail({ email, username, token, app = 'client', locale }) {
  const config = await resolveConfig();
  const base = app === 'admin' ? config.adminUrl : config.clientUrl;
  const path = `/reset-password?token=${encodeURIComponent(token)}`;
  const url = app === 'admin'
    ? `${(base || '').replace(/\/$/, '')}${path}`
    : buildLocalizedClientUrl(base, path, locale);
  return sendMail({
    to: email,
    subject: 'Reset your DealCouponz password',
    html: resetEmailHtml({ username, url }),
    type: 'password_reset',
  });
}

async function sendTestEmail(to) {
  // force: true — an explicit admin test should always attempt a real send,
  // even in development with "Send in development" unchecked.
  return sendMail({
    to,
    subject: 'DealCouponz — SMTP test email',
    html: `<p>If you received this message, your SMTP settings are working.</p><p>Sent at ${new Date().toISOString()}</p>`,
    force: true,
    type: 'test',
  });
}

function maskSettings(doc) {
  const o = doc?.toObject ? doc.toObject() : { ...doc };
  delete o.smtpPassword;
  delete o.sendgridApiKey;
  o.hasSmtpPassword = Boolean(doc?.smtpPassword || envStr('SMTP_PASSWORD', 'PASSWORD'));
  o.hasSendgridApiKey = Boolean(doc?.sendgridApiKey || envStr('SENDGRID_API_KEY'));
  return o;
}

module.exports = {
  resolveConfig,
  isEmailConfigured,
  shouldSendEmail,
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTestEmail,
  maskSettings,
  invalidateEmailSettingsCache,
};
