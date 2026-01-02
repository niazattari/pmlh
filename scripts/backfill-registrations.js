// scripts/backfill-registrations.js
// Usage:
//   node scripts/backfill-registrations.js          # dry-run (no emails sent)
//   node scripts/backfill-registrations.js --send   # actually send confirmation emails

require('dotenv').config();
const db = require('../config/mongoose-connection');
const Registration = require('../models/registrationModel');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const transporter = require('../config/mailer');

(async function(){
  try {
    const args = process.argv.slice(2);
    const doSend = args.includes('--send');

    const regs = await Registration.find({
      user: { $exists: true, $ne: null },
      $or: [ { registrantEmail: null }, { registrantName: null }, { emailSent: false } ]
    }).lean();

    console.log(`Found ${regs.length} registrations to inspect`);
    if (!regs.length) process.exit(0);

    for (const r of regs) {
      try {
        const user = await User.findById(r.user).lean();
        if (!user) {
          console.warn(`User not found for registration ${r._id} (user: ${r.user})`);
          continue;
        }

        const updates = {};
        if (!r.registrantName && user.username) updates.registrantName = user.username;
        if (!r.registrantEmail && user.email) updates.registrantEmail = user.email;

        if (Object.keys(updates).length) {
          console.log(`Will update registration ${r._id} with:`, updates);
          if (doSend) {
            await Registration.updateOne({ _id: r._id }, { $set: updates });
          }
        } else {
          console.log(`No name/email updates needed for ${r._id}`);
        }

        // Now handle sending email if not sent and we have an email
        const needSend = (!r.emailSent) && (updates.registrantEmail || r.registrantEmail);
        if (needSend) {
          const email = updates.registrantEmail || r.registrantEmail;
          const name = updates.registrantName || r.registrantName || user.username || '';
          const course = await Post.findById(r.course).lean();

          console.log(`Email will be sent to ${email} for registration ${r._id} (course: ${course && course.title})`);
          if (doSend) {
            const mailOptions = {
              from: process.env.ADMIN_EMAIL,
              to: email,
              subject: `Course Registration Confirmed: ${course ? course.title : ''}`,
              html: `
                <p>Hi ${name},</p>
                <p>Your registration for the course <strong>${course ? course.title : ''}</strong> has been received and confirmed.</p>
                ${r.paymentProof ? `<p>Payment proof: <a href="http://localhost:3000/uploads/${r.paymentProof}">View uploaded file</a></p>` : ''}
                <p>Regards,<br/>Training Team</p>
              `
            };

            try {
              const info = await transporter.sendMail(mailOptions);
              console.log('Email sent:', info.response || info);
              await Registration.updateOne({ _id: r._id }, { $set: { emailSent: true, registrantName: name, registrantEmail: email } });
            } catch (e) {
              console.error('Failed sending email for', r._id, e && e.message ? e.message : e);
            }
          }
        }

      } catch (inner) {
        console.error('Error processing registration', r._id, inner);
      }
    }

    console.log('Backfill script finished. Use --send to actually apply updates and send emails.');
    process.exit(0);
  } catch (err) {
    console.error('Backfill error:', err);
    process.exit(1);
  }
})();
