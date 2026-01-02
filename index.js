const express = require('express');
require('dotenv').config();
const app = express();
const path = require('path');
const db = require('./config/mongoose-connection');
const cookieParser = require('cookie-parser');
const loadUser = require('./middlewares/loadUser');
const session = require('express-session');
const adminRoutes = require('./routes/adminRoute');
const siteRoute = require('./routes/siteRoute');
const indexRoute = require('./routes/indexRoute');
const contactRoute = require('./routes/contactRoute');
const messageRoute = require('./routes/messageRoute');
const userRoute = require('./routes/userRoute');
const courseRoutes = require('./routes/courseRoutes');
const mailer = require('./config/mailer'); // add diagnostics

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));
app.use(cookieParser());

// ✅ Session Middleware (Only ONCE) - MUST come before loadUser so middleware can read session
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // ⛔ Set to false in development
    maxAge: 24 * 60 * 60 * 1000 // Optional: 1 day expiry
  }
}));

// ✅ Load User from Session into req (now that session middleware is registered)
app.use(loadUser);

// ✅ Set user in res.locals for EJS (MUST be before routes)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  // Limit header links on non-home pages to avoid distractions
  const path = req.path || '';
  res.locals.limitedHeader = !(path === '/' || path === '/main');
  next();
});

// Lightweight flash polyfill using session so existing controllers can call req.flash
app.use((req, res, next) => {
  // Provide req.flash compatible API
  req.flash = function (type, msg) {
    if (!req.session) return;
    req.session._alerts = req.session._alerts || [];
    req.session._alerts.push({ type: type || 'info', msg: msg || '' });
  };

  // Move any session alerts into res.locals for rendering and clear them from session
  res.locals.alerts = req.session._alerts || [];
  delete req.session._alerts;

  next();
});

// ✅ Routes
app.use('/user', userRoute);
app.use('/admin', adminRoutes);
app.use('/course', courseRoutes);
app.use('/site', siteRoute);
app.use('/contact-add', contactRoute);
app.use('/message', messageRoute);
app.get('/login', (req, res) => res.redirect('/user/login'));
app.use('/', indexRoute);

// Mailer diagnostics (delivery vs fallback JSON)
console.log(`Mailer mode: ${mailer.mode()} | delivery=${mailer.isRealTransport() ? 'enabled' : 'disabled (fallback JSON, emails logged only)'}`);

// ✅ Start Server
app.listen(3000, () => {
  console.log('server is running on port 3000');
});
module.exports = app;