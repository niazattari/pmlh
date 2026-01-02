const nodemailer = require("nodemailer");
require("dotenv").config();

// Create a transporter variable that may be replaced with a fallback
let transporter;
let usingRealSmtp = false;
let transportMode = 'fallback';
let lastSend = null; // stores details of the last attempted send

const createJsonFallback = () => {
  console.warn('Using JSON transport fallback for emails (no external SMTP). Emails will be logged, not delivered).');
  return nodemailer.createTransport({ jsonTransport: true });
};

// Prefer explicit SMTP settings if provided; otherwise, try Gmail using ADMIN_EMAIL/PASSWORD
const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
const hasGmail = !!process.env.ADMIN_EMAIL && !!process.env.ADMIN_PASSWORD;

async function buildTransport() {
  try {
    if (hasSmtp) {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      await transporter.verify();
      usingRealSmtp = true;
      transportMode = `smtp://${host}:${port}`;
      console.log(`Mailer: SMTP connected (${host}:${port}, secure=${secure})`);
      return;
    }

    if (hasGmail) {
      transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.ADMIN_EMAIL,
          pass: process.env.ADMIN_PASSWORD, // Use a Gmail App Password when 2FA is enabled
        },
      });
      await transporter.verify();
      usingRealSmtp = true;
      transportMode = 'gmail';
      console.log('Mailer: Gmail transport connected');
      return;
    }

    // Fallback when no creds provided
    console.warn('No SMTP credentials found (set SMTP_* or ADMIN_EMAIL/ADMIN_PASSWORD). Falling back to JSON transport.');
    transporter = createJsonFallback();
    usingRealSmtp = false;
    transportMode = 'fallback-json';
  } catch (error) {
    console.error('Mailer configuration error:', error && error.message ? error.message : error);
    if (hasGmail) {
      console.error('Tip: For Gmail, enable 2FA and use an App Password as ADMIN_PASSWORD.');
    } else if (hasSmtp) {
      console.error('Tip: Check SMTP_HOST/PORT/SECURE/USER/PASS values and server accessibility.');
    }
    // Switch to a harmless JSON transport so app can continue to run and email calls succeed locally
    transporter = createJsonFallback();
    usingRealSmtp = false;
    transportMode = 'fallback-json';
  }
}

// Initialize immediately
// Note: fire-and-forget; verify runs once on startup
buildTransport();

// Determine if an error is transient and worth retrying
function isTransientError(err) {
  const code = (err && err.code) || '';
  const rc = (err && err.responseCode) || 0;
  // Network/socket timeouts and DNS hiccups
  const transientCodes = ['ETIMEDOUT','ECONNRESET','ESOCKET','ECONNREFUSED','EAI_AGAIN'];
  if (transientCodes.includes(code)) return true;
  // 4xx SMTP codes are typically transient (try later)
  if (typeof rc === 'number' && rc >= 400 && rc < 500) return true;
  return false;
}

// Safe send wrapper with retry/backoff and structured result
async function sendMailSafe(mailOptions, { attempts = 3, initialDelayMs = 500 } = {}) {
  let lastError = null;
  let delay = initialDelayMs;
  for (let i = 1; i <= attempts; i++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      lastSend = {
        ok: true,
        attempt: i,
        mode: transportMode,
        messageId: info && info.messageId,
        response: info && info.response,
        envelope: info && info.envelope,
        accepted: info && info.accepted,
        rejected: info && info.rejected,
        to: mailOptions && mailOptions.to,
        subject: mailOptions && mailOptions.subject,
        at: new Date().toISOString()
      };
      // Log concise confirmation
      console.log(`Email sent (mode=${transportMode}, attempt=${i}):`, info && (info.response || info.messageId || 'ok'));
      return info;
    } catch (err) {
      lastError = err;
      const transient = isTransientError(err);
      console.warn(`Email send failed (attempt ${i}/${attempts}, transient=${transient}):`, err && (err.message || err));
      if (!transient || i === attempts) break;
      // Backoff before retry
      await new Promise(res => setTimeout(res, delay));
      delay = Math.min(delay * 2, 5000);
    }
  }
  lastSend = {
    ok: false,
    attempt: attempts,
    mode: transportMode,
    error: lastError && (lastError.message || String(lastError)),
    code: lastError && lastError.code,
    responseCode: lastError && lastError.responseCode,
    to: mailOptions && mailOptions.to,
    subject: mailOptions && mailOptions.subject,
    at: new Date().toISOString()
  };
  // Surface a succinct error
  console.error('Email send ultimately failed:', lastSend.error || lastSend);
  throw lastError || new Error('Email send failed');
}

// Default admin email fallback
const DEFAULT_ADMIN_EMAIL = 'imransarvarkhan@gmail.com';

// Export a simple wrapper that other modules can call like transporter.sendMail(...)
const moduleExports = {
  sendMail: (options, extra) => sendMailSafe(options, extra),
  // expose a helper for diagnostics
  isRealTransport: () => usingRealSmtp,
  mode: () => transportMode,
  lastSend: () => lastSend,
  // expose the underlying nodemailer transporter if needed
  _getTransporter: () => transporter,
  // Convenience helper to notify admin
  notifyAdmin: async (subject, html, extras = {}) => {
    const fromEmail = process.env.SMTP_FROM || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_TO || DEFAULT_ADMIN_EMAIL;
    if (!adminEmail) {
      console.warn('notifyAdmin: ADMIN_EMAIL/SMTP_TO not set; skipping admin notification.');
      return null;
    }
    const mailOptions = Object.assign({
      from: fromEmail ? `"PM Learning Hub" <${fromEmail}>` : undefined,
      to: adminEmail,
      subject,
      html
    }, extras);
    try {
      const info = await sendMailSafe(mailOptions);
      console.log('Admin notification sent:', info && (info.response || info.messageId) ? (info.response || info.messageId) : 'sent');
      return info;
    } catch (err) {
      console.error('Failed to send admin notification:', err && err.message ? err.message : err);
      return null;
    }
  },

  // Send user authentication email (login or registration)
  sendUserAuthEmail: async ({ to, type = 'login', name = 'User' }) => {
    const fromEmail = process.env.SMTP_FROM || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    const subject =
      type === 'register'
        ? 'Welcome to PM Learning Hub'
        : 'Login Notification - PM Learning Hub';

    const html =
      type === 'register'
        ? `
          <div style="font-family: Arial, sans-serif; line-height:1.6">
            <h2>Welcome, ${name}!</h2>
            <p>Thanks for creating an account at PM Learning Hub. We're excited to have you on board.</p>
            <p>You can now browse courses, register for webinars, and track your learning.</p>
            <p style="margin-top:16px;">Regards,<br/>PM Learning Hub Team</p>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; line-height:1.6">
            <h2>Hello, ${name}</h2>
            <p>This is to let you know that a login to your account just occurred.</p>
            <p>If this wasn't you, please reset your password immediately.</p>
            <p style="margin-top:16px;">Regards,<br/>PM Learning Hub Security</p>
          </div>
        `;

    return moduleExports.sendMail(
      {
        from: fromEmail ? `"PM Learning Hub" <${fromEmail}>` : undefined,
        to,
        subject,
        html,
      },
      { attempts: 3 }
    );
  },

  // Send user email after course registration
  sendCourseRegistrationUserEmail: async ({ to, name = 'User', course }) => {
    const fromEmail = process.env.SMTP_FROM || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    const title = course?.title || 'Your selected course';
    const startDate = course?.courseDetails?.startDate
      ? new Date(course.courseDetails.startDate).toLocaleDateString()
      : 'TBA';
    const duration = course?.courseDetails?.duration || 'TBA';
    const level = course?.courseDetails?.level || 'TBA';
    const mode = course?.courseDetails?.mode || 'TBA';

    const subject = `Registration Confirmed: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2>Hi ${name},</h2>
        <p>Your registration for the course "<strong>${title}</strong>" has been confirmed.</p>
        <ul>
          <li><strong>Start Date:</strong> ${startDate}</li>
          <li><strong>Duration:</strong> ${duration}</li>
          <li><strong>Level:</strong> ${level}</li>
          <li><strong>Mode:</strong> ${mode}</li>
        </ul>
        <p>We look forward to seeing you in class.</p>
        <p style="margin-top:16px;">Regards,<br/>PM Learning Hub</p>
      </div>
    `;

    return moduleExports.sendMail(
      {
        from: fromEmail ? `"PM Learning Hub" <${fromEmail}>` : undefined,
        to,
        subject,
        html,
      },
      { attempts: 3 }
    );
  },

  // Notify admin about a new course registration
  notifyAdminCourseRegistration: async ({ user, course }) => {
    const adminTo = process.env.ADMIN_EMAIL || process.env.SMTP_TO || DEFAULT_ADMIN_EMAIL;
    const fromEmail = process.env.SMTP_FROM || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;

    const subject = `New Course Registration: ${course?.title || 'Course'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2>New Course Registration</h2>
        <p><strong>User:</strong> ${user?.username || user?.name || user?.email || 'N/A'} (${user?.email || 'no-email'})</p>
        <p><strong>Course:</strong> ${course?.title || 'N/A'}</p>
        <ul>
          <li><strong>Start Date:</strong> ${course?.courseDetails?.startDate ? new Date(course.courseDetails.startDate).toLocaleDateString() : 'TBA'}</li>
          <li><strong>Duration:</strong> ${course?.courseDetails?.duration || 'TBA'}</li>
          <li><strong>Level:</strong> ${course?.courseDetails?.level || 'TBA'}</li>
          <li><strong>Mode:</strong> ${course?.courseDetails?.mode || 'TBA'}</li>
        </ul>
        <p>Sent automatically by PM Learning Hub.</p>
      </div>
    `;

    return moduleExports.sendMail(
      {
        from: fromEmail ? `"PM Learning Hub" <${fromEmail}>` : undefined,
        to: adminTo,
        subject,
        html,
      },
      { attempts: 3 }
    );
  },

  // Convenience: send both user confirmation and admin notification
  sendAllOnCourseRegistration: async ({ user, course }) => {
    await moduleExports.sendCourseRegistrationUserEmail({
      to: user?.email,
      name: user?.username || user?.name || 'User',
      course,
    });
    await moduleExports.notifyAdminCourseRegistration({ user, course });
    return true;
  },

  // Acknowledge a general message submission to the user
  sendUserMessageReceipt: async ({ to, name = 'User', message, status }) => {
    const fromEmail = process.env.SMTP_FROM || process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
    const subject = 'We received your message - PM Learning Hub';
    const safeMessage = (message || '').toString().slice(0, 2000);
    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6">
        <h2>Hi ${name},</h2>
        <p>Thanks for contacting PM Learning Hub. We've received your message and our team will get back to you shortly.</p>
        <p><strong>Your Message:</strong></p>
        <blockquote style="border-left:3px solid #ccc; padding-left:10px; color:#555;">${safeMessage.replace(/\n/g, '<br/>')}</blockquote>
        ${status ? `<p><strong>Status:</strong> ${status}</p>` : ''}
        <p style="margin-top:16px;">Regards,<br/>PM Learning Hub</p>
      </div>
    `;
    return moduleExports.sendMail(
      {
        from: fromEmail ? `"PM Learning Hub" <${fromEmail}>` : undefined,
        to,
        subject,
        html,
      },
      { attempts: 3 }
    );
  },

  // Welcome email on registration via public form
  sendUserRegistrationWelcome: async ({ to, name = 'User' }) => {
    return moduleExports.sendUserAuthEmail({ to, name, type: 'register' });
  },
};

module.exports = moduleExports;
