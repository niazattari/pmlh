const Contact = require('../models/contactModel');

const loadUser = async (req, res, next) => {
  const userId = req.cookies.user_id;
  if (!userId) {
    res.locals.user = null;
    return next();
  }

  try {
    const user = await Contact.findById(userId);
    res.locals.user = user;
  } catch (err) {
    console.error(err);
    res.locals.user = null;
  }

  next();
};

module.exports = loadUser;
module.exports = (req, res, next) => {
  if (req.session && req.session.user) {
    req.user = req.session.user;
  } else {
    req.user = null;
  }
  next();
};