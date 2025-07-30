const express = require('express');
const router = express.Router();
const {
  UserloginPage,
  UserLogin,
  Userlogout,
} = require('../controllers/userController');

// Session-based login
router.get('/login', UserloginPage);
router.post('/login', UserLogin);
router.get('/logout', Userlogout);

module.exports = router;
