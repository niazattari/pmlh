// test-mail.js
const mailer = require('./config/mailer');

(async () => {
  try {
    const info = await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_TO,
      subject: 'Test Email',
      text: 'This is a test email from Node.js. If transport is fallback-json, this will be logged only.',
    });
    console.log('Email sent:', info && (info.response || info.messageId || 'ok'));
    console.log('Mailer mode:', mailer.mode(), '| Real:', mailer.isRealTransport());
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
  }
})();
