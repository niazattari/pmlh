const userModel = require('../models/userModel');
const contactModel = require('../models/contactModel');

// Middleware: load current user from session (recommended) or cookie fallback.
module.exports = async function loadUser(req, res, next) {
  try {
    let sessUser = req.session && req.session.user;

    // If session contains just an id string, normalize it
    if (sessUser && (typeof sessUser === 'string' || sessUser._id || sessUser.id)) {
      const id = sessUser._id || sessUser.id || (typeof sessUser === 'string' ? sessUser : null);
      if (id) {
        // Try canonical user collection first
        let user = await userModel.findById(id).lean();
        if (user) {
          // store canonical minimal user in session and locals
          req.session.user = { _id: user._id.toString(), username: user.username || user.name || '', email: user.email || '' };
          res.locals.user = req.session.user;
          req.user = req.session.user;
          return next();
        }

        // Fallback: legacy contact collection may hold the user
        try {
          const contact = await contactModel.findById(id).lean();
          if (contact) {
            req.session.user = { _id: contact._id.toString(), username: contact.username || contact.name || '', email: contact.email || '' };
            res.locals.user = req.session.user;
            req.user = req.session.user;
            return next();
          }
        } catch (e) {
          // ignore and continue to no-user path
          console.warn('loadUser: legacy contact lookup failed', e.message || e);
        }
      }
    }

    // If session has a full object already, use it
    if (sessUser && sessUser.username) {
      res.locals.user = sessUser;
      req.user = sessUser;
      return next();
    }

    // Cookie fallback: support cookie named user_id (legacy)
    const cookieUserId = req.cookies && req.cookies.user_id;
    if (cookieUserId) {
      try {
        const user = await userModel.findById(cookieUserId).lean();
        if (user) {
          req.session.user = { _id: user._id.toString(), username: user.username, email: user.email };
          res.locals.user = req.session.user;
          req.user = req.session.user;
          return next();
        }
      } catch (e) {
        console.error('Error loading user from cookie:', e);
      }
    }

    // default: no user
    res.locals.user = null;
    req.user = null;
    return next();
  } catch (err) {
    console.error('loadUser error:', err);
    res.locals.user = null;
    req.user = null;
    return next();
  }
};