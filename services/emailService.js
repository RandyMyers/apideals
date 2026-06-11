/**
 * Central transactional email — nodemailer SMTP + optional SendGrid API.
 * Config: MongoDB EmailSettings → env vars → disabled.
 */
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const EmailSettings = require('../models/emailSettings');
const { getCachedEmailSettings, invalidateEmailSettingsCache } = require('../utils/emailSettingsCache');
const { logger } = require('../utils/logger');
const { buildLocalizedClientUrl } = require('../utils/emailLinkLocale');

let smtpTransporter = null;
let smtpConfigKey = '';

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
    fromEmail: db.fromEmail || envStr('EMAIL_FROM') || 'noreply@dealcouponz.com',
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
  const key = `${config.smtpHost}:${config.smtpPort}:${config.smtpUser}:${config.smtpSecure}`;
  if (smtpTransporter && smtpConfigKey === key) return smtpTransporter;
  if (!config.smtpHost) return null;
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

async function sendMail({ to, subject, html, text, replyTo }) {
  const config = await resolveConfig();
  const from = formatFrom(config);

  if (!config.enabled || process.env.DISABLE_EMAIL === 'true') {
    logger.warn('[emailService] Email disabled — skipping', { to, subject });
    return { sent: false, reason: 'disabled' };
  }

  if (process.env.NODE_ENV !== 'production' && !config.sendInDevelopment) {
    logger.warn('[emailService] Dev send skipped (enable sendInDevelopment in admin or EMAIL_SEND_IN_DEV=true)', { to, subject });
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
      sgMail.setApiKey(config.sendgridApiKey);
      await sgMail.send({
        from: config.fromEmail,
        to,
        subject,
        html: mail.html,
        text: mail.text,
      });
      return { sent: true };
    }

    const transport = getSmtpTransporter(config);
    if (!transport) {
      logger.warn('[emailService] SMTP not configured — skipping', { to, subject });
      return { sent: false, reason: 'not_configured' };
    }

    await transport.sendMail(mail);
    return { sent: true };
  } catch (error) {
    logger.error('[emailService] Send failed', { error: error.message, to, subject });
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
  });
}

async function sendTestEmail(to) {
  return sendMail({
    to,
    subject: 'DealCouponz — SMTP test email',
    html: `<p>If you received this message, your SMTP settings are working.</p><p>Sent at ${new Date().toISOString()}</p>`,
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
