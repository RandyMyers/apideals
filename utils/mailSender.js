/**
 * Shared transactional email helper (SendGrid API or SMTP).
 */
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { logger } = require('./logger');

let transporter = null;

function createTransporter() {
  if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_USE_SMTP) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    return null;
  }
  if (process.env.SENDGRID_SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SENDGRID_SMTP_HOST,
      port: parseInt(process.env.SENDGRID_SMTP_PORT || '587', 10),
      secure: process.env.SENDGRID_SMTP_SECURE === 'true',
      auth: {
        user: process.env.SENDGRID_SMTP_USER,
        pass: process.env.SENDGRID_SMTP_PASS,
      },
    });
  }
  return null;
}

transporter = createTransporter();

async function sendMail(mailOptions) {
  const from = mailOptions.from || process.env.EMAIL_FROM || 'noreply@dealcouponz.com';
  if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_USE_SMTP && !transporter) {
    await sgMail.send({
      from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
      text: mailOptions.text || String(mailOptions.html || '').replace(/<[^>]*>/g, ''),
    });
    return true;
  }
  if (!transporter) {
    logger.warn('[mailSender] Email not configured — skipping send', { to: mailOptions.to, subject: mailOptions.subject });
    return false;
  }
  await transporter.sendMail({ ...mailOptions, from });
  return true;
}

module.exports = { sendMail };
