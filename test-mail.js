// test-mail.js
const transporter = require('./config/mailer');

transporter.sendMail({
  from: process.env.ADMIN_EMAIL,
  to: process.env.ADMIN_EMAIL,
  subject: 'Test Email',
  text: 'This is a test email from Node.js using Gmail App Password.',
}, (error, info) => {
  if (error) {
    return console.log('Error:', error);
  }
  console.log('Email sent:', info.response);
});
