const Registration = require('../models/registrationModel');
const Post = require('../models/postModel');
const userModel = require('../models/userModel');
const contactModel = require('../models/contactModel');
const transporter = require('../config/mailer');
const Certificate = require('../models/certificateModel');
const Message = require('../models/messageModel');
const Category = require('../models/categoryModel');

// Show all registrations to admin
exports.allRegistrations = async (req, res) => {
  try {
    // Pagination: support ?page=1
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = 12; // show 12 registrations per page

    const totalCount = await Registration.countDocuments();
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const regs = await Registration.find({})
      .sort({ registrationDate: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate('course')
      .populate('user')
      .lean();

    return res.render('admin/courseRegistered', {
      registrations: regs,
      currentPage: page,
      totalPages,
      offset: (page - 1) * pageSize,
    });
  } catch (err) {
    console.error('admin.allRegistrations error:', err);
    return res.status(500).render('admin/500', { message: 'Failed to load registrations' });
  }
};

// Update registration status (pending, confirmed, completed, deleted)
exports.updateRegistrationStatus = async (req, res) => {
  try {
    const regId = req.params.id;
    const { status } = req.body;
    if (!['pending','confirmed','completed','deleted'].includes(status)) {
      return res.status(400).send('Invalid status');
    }

    const reg = await Registration.findById(regId).populate('course');
    if (!reg) return res.status(404).send('Registration not found');

    // Helper to find uploaded file by fieldname in either multer.fields (object) or multer.any (array)
    function findUploadedFile(fieldName) {
      if (!req.files) return null;
      // multer.fields -> req.files[fieldName] is an array
      if (req.files[fieldName]) {
        return Array.isArray(req.files[fieldName]) ? req.files[fieldName][0] : req.files[fieldName];
      }
      // multer.any -> req.files is an array of file objects
      if (Array.isArray(req.files)) {
        return req.files.find(f => f.fieldname === fieldName) || null;
      }
      return null;
    }

    // If admin marks confirmed, optionally accept course content PDF upload
    if (status === 'confirmed') {
      const file = findUploadedFile('courseContent');
      if (file) {
        // basic validation: accept only PDFs
        if (file.mimetype !== 'application/pdf') {
          return res.status(400).send('Course content must be a PDF file.');
        }
        reg.courseContent = file.filename;
      }

      reg.status = 'confirmed';
      await reg.save();

      // send confirmation email including course content link if available
      if (reg.registrantEmail) {
        try {
          const course = reg.course;
          const contentLink = reg.courseContent ? `${req.protocol}://${req.get('host')}/uploads/${reg.courseContent}` : null;
          const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: reg.registrantEmail,
            subject: `Course Registration Confirmed: ${course ? course.title : ''}`,
            html: `
              <p>Hi ${reg.registrantName || ''},</p>
              <p>Your registration for the course <strong>${course ? course.title : ''}</strong> has been confirmed by the admin.</p>
              <p>Status: <strong>Confirmed</strong></p>
              ${contentLink ? `<p>Course content is available here: <a href="${contentLink}">Download Course Content</a></p>` : ''}
              <p>Regards,<br/>Training Team</p>
            `
          };
          await transporter.sendMail(mailOptions);
          await Registration.findByIdAndUpdate(regId, { emailSent: true });
        } catch (mailErr) {
          console.error('Failed sending confirmation email on admin confirm with content:', mailErr);
        }
      }

      return res.redirect('/admin/registrations');
    }

    // If admin marks completed, require a certificate file upload
    if (status === 'completed') {
      const certFile = findUploadedFile('certificate');
      if (!certFile) {
        // respond with a helpful message so admin can retry with a file
        return res.status(400).send('Certificate file is required when marking registration as completed.');
      }

      // Save certificate filename and status
      reg.certificate = certFile.filename;
      reg.status = 'completed';
      // auto-generate a stable certificateNumber if not already set
      if (!reg.certificateNumber) {
        reg.certificateNumber = `PMLH-${Date.now()}-${Math.random().toString(36).substr(2,4).toUpperCase()}`;
      }
      await reg.save();

      // Create a new Certificate record and link it to this registration
      try {
        const Certificate = require('../models/certificateModel');
        // Only create if no existing Certificate for this registration
        const existing = await Certificate.findOne({ registration: reg._id });
        if (!existing) {
          const certDoc = new Certificate({
            registration: reg._id,
            user: reg.user || null,
            name: reg.registrantName || '',
            email: reg.registrantEmail || '',
            batchNo: reg.batchNo || '',
            dateOfCompletion: new Date(),
            certificateNumber: reg.certificateNumber,
            certificateFile: reg.certificate
          });
          await certDoc.save();
        }
      } catch (certErr) {
        console.error('Failed to create Certificate document after registering completion:', certErr);
      }

      // send a notification email with certificate link when possible
      if (reg.registrantEmail) {
        try {
          const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${certFile.filename}`;
          const mailOptions = {
            from: process.env.ADMIN_EMAIL,
            to: reg.registrantEmail,
            subject: `Your Certificate for ${reg.course ? reg.course.title : ''}`,
            html: `
              <p>Hi ${reg.registrantName || ''},</p>
              <p>Congratulations — your registration for <strong>${reg.course ? reg.course.title : ''}</strong> has been marked as completed.</p>
              <p>Your certificate is available for download here: <a href="${fileUrl}">Download Certificate</a></p>
              <p>Regards,<br/>Training Team</p>
            `
          };
          await transporter.sendMail(mailOptions);
          reg.emailSent = true;
          await reg.save();
        } catch (mailErr) {
          console.error('Failed to send certificate email:', mailErr);
        }
      }

      return res.redirect('/admin/registrations');
    }

    // Update status for other states
    reg.status = status;
    await reg.save();

    return res.redirect('/admin/registrations');
  } catch (err) {
    console.error('admin.updateRegistrationStatus error:', err);
    return res.status(500).send('Error updating status');
  }
};

// Admin Summary Dashboard
exports.summaryDashboard = async (req, res) => {
  try {
    // Totals
    const [
      totalPosts,
      totalCertificates,
      totalContacts,
      totalUsers,
      totalMessages,
      totalRegistrations
    ] = await Promise.all([
      Post.countDocuments({}),
      Certificate.countDocuments({}),
      contactModel.countDocuments({}),
      userModel.countDocuments({}),
      Message.countDocuments({}),
      Registration.countDocuments({})
    ]);

    // Posts by key categories
    const categoriesToTrack = [
      { key: 'courses', regex: /^Courses$/i },
      { key: 'webinars', regex: /^Webinars?$/i },
      { key: 'associations', regex: /^Associations$/i },
      { key: 'testimonials', regex: /^Testimonials$/i }
    ];

    const categoryDocs = await Promise.all(
      categoriesToTrack.map(c => Category.findOne({ name: { $regex: c.regex } }).lean())
    );

    const postsByCategory = {};
    await Promise.all(categoryDocs.map(async (catDoc, i) => {
      const key = categoriesToTrack[i].key;
      if (catDoc && catDoc._id) {
        postsByCategory[key] = await Post.countDocuments({ category: catDoc._id });
      } else {
        postsByCategory[key] = 0;
      }
    }));

    // Registrations by status breakdown
    const statuses = ['pending','confirmed','completed','deleted','cancelled'];
    const registrationStatusCounts = {};
    await Promise.all(statuses.map(async s => {
      registrationStatusCounts[s] = await Registration.countDocuments({ status: s });
    }));

    // Prepare data for charts
    const postsCategoryChart = {
      labels: ['Courses','Webinars','Associations','Testimonials'],
      data: [
        postsByCategory.courses || 0,
        postsByCategory.webinars || 0,
        postsByCategory.associations || 0,
        postsByCategory.testimonials || 0
      ]
    };

    const registrationsStatusChart = {
      labels: statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      data: statuses.map(s => registrationStatusCounts[s] || 0)
    };

    return res.render('admin/summary', {
      totals: {
        posts: totalPosts,
        certificates: totalCertificates,
        contacts: totalContacts,
        users: totalUsers,
        messages: totalMessages,
        registrations: totalRegistrations
      },
      postsByCategory,
      registrationStatusCounts,
      charts: {
        postsCategoryChart,
        registrationsStatusChart
      }
    });
  } catch (err) {
    console.error('admin.summaryDashboard error:', err);
    return res.status(500).render('admin/500', { message: 'Failed to load dashboard' });
  }
};
