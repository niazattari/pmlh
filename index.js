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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));
app.use(cookieParser());
// ✅ Load User from Session into req
app.use(loadUser);

// ✅ Session Middleware (Only ONCE)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // ⛔ Set to false in development
    maxAge: 24 * 60 * 60 * 1000 // Optional: 1 day expiry
  }
}));
// ✅ Set user in res.locals for EJS (MUST be before routes)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ✅ Routes


app.use('/user', userRoute);
app.use('/admin', adminRoutes);
app.use('/course', siteRoute);
app.use('/contact-add', contactRoute);
app.use('/message', messageRoute);
app.use('/', indexRoute);

// ✅ Start Server
app.listen(3000, () => {
  console.log('server is running on port 3000');
});
module.exports = app;