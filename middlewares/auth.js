const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect('login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.redirect('login');
  }
};

module.exports = authenticateUser;
