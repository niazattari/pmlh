const jwt = require('jsonwebtoken');

exports.isAuth = (req, res, next) => {
  const token = req.cookies.token;
  // Redirect to the mounted user login route
  if (!token) return res.redirect('/user/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.redirect('/user/login');
  }
};
