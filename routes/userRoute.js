const Certificate = require("../models/certificateModel");
const QRCode = require("qrcode");
const express = require('express');
const router = express.Router();
const {
  UserloginPage,
  UserLogin,
  Userlogout,
  profilePage,
  forgotPasswordPage,
  sendResetCode,
  resetPasswordPage,
  resetPasswordSubmit,
} = require('../controllers/userController');

// Simple logger for all /user routes to aid debugging
router.use((req, res, next) => {
  try {
    console.log('[userRoute] ', req.method, req.originalUrl, 'sessionUser=', req.session && req.session.user ? req.session.user._id : null);
  } catch (e) {
    console.log('[userRoute] logger error', e && e.message);
  }
  next();
});

// Session-based login
router.get('/login', UserloginPage);
router.post('/login', UserLogin);
router.get('/logout', Userlogout);
// Let the controller handle auth/redirect logic for the profile page
// Quick debug endpoint to verify routing and session/cookie presence.
router.get('/profile-debug', (req, res) => {
  console.log('PROFILE-DEBUG hit: session=', req.session, 'cookies=', req.cookies);
  return res.send('PROFILE-DEB  UG OK');
});

router.get('/profile', profilePage);

// Forgot/Reset Password
router.get('/forgot-password', forgotPasswordPage);
router.post('/forgot-password', sendResetCode);
router.get('/reset-password', resetPasswordPage);
router.post('/reset-password', resetPasswordSubmit);

// SHOW THE VERIFY PAGE
router.get("/verify-certificate", (req, res) => {
  res.render("verify", { certificate: null, notFound: false, qrCodeDataURL: null });
});

// Handle form POST to verify certificate
router.post("/verify", async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const certificateNumber = (req.body.certificateNumber || '').trim();

    // Certificate number is mandatory
    if (!certificateNumber) {
      return res.render("verify", { certificate: null, notFound: true, qrCodeDataURL: null });
    }

    // Find by certificate number (primary key)
    const certificate = await Certificate.findOne({ certificateNumber }).populate('user').lean();

    if (!certificate) {
      return res.render("verify", { certificate: null, notFound: true, qrCodeDataURL: null });
    }

    // Generate QR code linking to verification page
    const verifyLink = `${req.protocol}://${req.get("host")}/user/verify-certificate`;
    const qrCodeDataURL = await QRCode.toDataURL(verifyLink);

    res.render("verify", {
      certificate,
      notFound: false,
      qrCodeDataURL
    });
  } catch (err) {
    console.error(err);
    res.render("verify", { certificate: null, notFound: true, qrCodeDataURL: null });
  }
});
module.exports = router;
