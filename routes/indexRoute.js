const express = require('express');
const router = express.Router();
const { getPosts } = require('../controllers/postController');
const { verifyForm, verifyCertificate } = require('../controllers/certificateController');
const contactController = require('../controllers/contactController');
const upload = require('../config/multer');
const userModel = require('../models/userModel');
const contactModel = require('../models/contactModel');
const postModel = require('../models/postModel');

router.get('/main', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/user/login');
  }

  res.render('main', { user: req.session.user });
});

router.get('/', getPosts);

// Public registration page
router.get('/register', async (req, res) => {
  try {
    const categories = await postModel.find().lean();
    res.render('register', { Post: categories });
  } catch (err) {
    console.error('GET /register error:', err);
    res.render('register', { Post: [] });
  }
});

// Public registration POST
router.post('/register', upload.single('image'), contactController.registerPublic);

// API: check if email exists in user or contact collections
router.get('/api/check-email', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.json({ exists: false });
  try {
    const u = await userModel.findOne({ email });
    const c = await contactModel.findOne({ email });
    return res.json({ exists: !!(u || c) });
  } catch (e) {
    console.error('api/check-email error:', e && e.message);
    return res.status(500).json({ exists: false, error: 'server error' });
  }
});

// Certificate verification (public)
router.get('/certificate/verify', verifyForm);
router.post('/certificate/verify', verifyCertificate);

const isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/user/login');
  }
  next();
};
module.exports = router;
