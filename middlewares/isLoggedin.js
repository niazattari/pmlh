const jwt = require('jsonwebtoken')
const userModel = require("../models/userModel")


const isLoggedIn = async (req, res, next) => {
  try {
    // Accept session-based login (common site login)
    if (req.session && req.session.user) {
      return next();
    }

    const token = req.cookies && req.cookies.token;
    if (!token) {
      // No token and no session -> redirect to admin login
      return res.redirect('/');
    }

    // Verify token safely
    let decode;
    try {
      decode = jwt.verify(token, process.env.JWT_KEY);
    } catch (err) {
      console.warn('isLoggedIn: token verify failed', err && err.message);
      return res.redirect('/');
    }

    if (!decode) return res.redirect('/');
    return next();
  } catch (error) {
    console.error('isLoggedIn error:', error && error.message);
    return res.redirect('/');
  }
}

module.exports = isLoggedIn