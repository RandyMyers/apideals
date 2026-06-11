/**
 * Legacy wrapper — prefer emailService.js for new code.
 */
const { sendMail } = require('../services/emailService');

async function sendMailLegacy(mailOptions) {
  const result = await sendMail(mailOptions);
  return result.sent === true;
}

module.exports = { sendMail: sendMailLegacy };
