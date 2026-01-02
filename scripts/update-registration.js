// Usage: node scripts/update-registration.js <registrationId> <userId>
// Example: node scripts/update-registration.js 6928aa414aa9b8075306bb69 5f... 

require('dotenv').config();
const db = require('../config/mongoose-connection');
const Registration = require('../models/registrationModel');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const transporter = require('../config/mailer');

(async function(){
  try {
    const [,, regId, userId] = process.argv;
    if (!regId || !userId) {
      console.error('Usage: node scripts/update-registration.js <registrationId> <userId>');
      process.exit(1);
    }

    const registration = await Registration.findById(regId);
    if (!registration) {
      console.error('Registration not found:', regId);
      process.exit(1);
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      console.error('User not found:', userId);
      process.exit(1);
    }

    registration.user = user._id;
    registration.registrantName = user.username || '';
    registration.registrantEmail = user.email || '';

    await registration.save();
    console.log('Registration updated with user info.');

    // send confirmation email if not sent and email exists
    if (!registration.emailSent && registration.registrantEmail) {
      const course = await Post.findById(registration.course).lean();
      const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: registration.registrantEmail,
        subject: `Course Registration Confirmed: ${course.title}`,
        html: `
          <p>Hi ${registration.registrantName},</p>
          <p>Your registration for the course <strong>${course.title}</strong> has been received and confirmed.</p>
          ${registration.paymentProof ? `<p>Payment proof: <a href="http://localhost:3000/uploads/${registration.paymentProof}">View uploaded file</a></p>` : ''}
          <p>Regards,<br/>Training Team</p>
        `
      };

      try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent:', info.response || info);
        registration.emailSent = true;
        await registration.save();
      } catch (e) {
        console.error('Error sending confirmation email:', e);
      }
    } else {
      console.log('No email sent: either already sent or registrantEmail missing.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
})();
