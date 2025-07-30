const express = require('express');
const router = express.Router();
const { getPosts, getTestimonials, getAssociations } = require('../controllers/postController');
const { mainPage } = require('../controllers/userController');

const isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/user/login');
  }
  next();
};

router.get('/', isLoggedIn, getPosts);
router.get('/testimonials', getTestimonials);
router.get('/associations', getAssociations);

module.exports = router;
