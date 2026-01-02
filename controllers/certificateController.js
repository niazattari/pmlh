const Certificate = require('../models/certificateModel');
const { validationResult } = require('express-validator');
const QRCode = require('qrcode');

// Admin: list certificates and show add form
exports.getCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 }).lean();
    return res.render('admin/certificates', { certificates });
  } catch (err) {
    console.error(err);
    return res.render('admin/certificates', { certificates: [], error: 'Failed to load certificates' });
  }
};

// Admin: show single certificate data for update
exports.getCertificatesDataForUpdate = async (req, res) => {
  try {
    const id = req.params.id;
    const cert = await Certificate.findById(id).lean();
    if (!cert) return res.redirect('/admin/certificates');
    return res.render('admin/certificates-edit', { cert });
  } catch (err) {
    console.error(err);
    return res.redirect('/admin/certificates');
  }
};

// Admin: create or update certificate (id === 'new' -> create)
exports.postCertificatesforUpdate = async (req, res) => {
  try {
    const id = req.params.id;
    // simple validation
    const { name, email, batchNo, dateOfCompletion, certificateNumber, adminNotes } = req.body;

    if (!name || !email || !certificateNumber) {
      req.flash && req.flash('error', 'Name, email and certificate number are required');
      return res.redirect('/admin/certificates');
    }

    const file = req.file; // adminUpload.single('certificateFile') should set this

    if (id === 'new') {
      // create
      const exists = await Certificate.findOne({ certificateNumber }).lean();
      if (exists) {
        req.flash && req.flash('error', 'Certificate number already exists');
        return res.redirect('/admin/certificates');
      }
      const cert = new Certificate({
        name,
        email,
        batchNo,
        dateOfCompletion: dateOfCompletion ? new Date(dateOfCompletion) : undefined,
        certificateNumber,
        adminNotes
      });
      if (file) cert.certificateFile = file.filename || file.path;
      await cert.save();
      req.flash && req.flash('success', 'Certificate created');
      return res.redirect('/admin/certificates');
    } else {
      // update
      const cert = await Certificate.findById(id);
      if (!cert) return res.redirect('/admin/certificates');
      cert.name = name;
      cert.email = email;
      cert.batchNo = batchNo;
      cert.dateOfCompletion = dateOfCompletion ? new Date(dateOfCompletion) : cert.dateOfCompletion;
      cert.certificateNumber = certificateNumber;
      cert.adminNotes = adminNotes;
      if (file) cert.certificateFile = file.filename || file.path;
      await cert.save();
      req.flash && req.flash('success', 'Certificate updated');
      return res.redirect('/admin/certificates');
    }
  } catch (err) {
    console.error(err);
    req.flash && req.flash('error', 'Failed to save certificate');
    return res.redirect('/admin/certificates');
  }
};

// Admin: delete certificate
exports.deleteCertificatesbyId = async (req, res) => {
  try {
    const id = req.params.id;
    await Certificate.findByIdAndDelete(id);
    req.flash && req.flash('success', 'Certificate deleted');
    return res.redirect('/admin/certificates');
  } catch (err) {
    console.error(err);
    req.flash && req.flash('error', 'Failed to delete certificate');
    return res.redirect('/admin/certificates');
  }
};

// Public: render verification form (unified to views/verify.ejs)
exports.verifyForm = (req, res) => {
  return res.render('verify', { certificate: null, notFound: false, qrCodeDataURL: null });
};

// Public: handle verification lookup (supports name+email or certificateNumber)
exports.verifyCertificate = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const certificateNumber = (req.body.certificateNumber || '').trim();

    let cert = null;
    if (name && email) {
      cert = await Certificate.findOne({ name, email }).populate('user').lean();
    } else if (certificateNumber) {
      cert = await Certificate.findOne({ certificateNumber }).populate('user').lean();
    }

    if (!cert) {
      return res.render('verify', { certificate: null, notFound: true, qrCodeDataURL: null });
    }

    const verifyLink = `${req.protocol}://${req.get('host')}/user/verify-certificate`;
    const qrCodeDataURL = await QRCode.toDataURL(verifyLink);
    return res.render('verify', { certificate: cert, notFound: false, qrCodeDataURL });
  } catch (err) {
    console.error('verifyCertificate error:', err && err.message ? err.message : err);
    return res.render('verify', { certificate: null, notFound: true, qrCodeDataURL: null });
  }
};
