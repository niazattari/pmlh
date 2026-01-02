const { validationResult } = require("express-validator");
const generateToken = require("../config/jsonwebtoken");
const postModel = require("../models/postModel");
const userModel = require("../models/userModel");
const contactModel = require("../models/contactModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const PasswordReset = require('../models/passwordReset');
const crypto = require('crypto');
const mailer = require('../config/mailer');

// Render Login Page
const UserloginPage = (req, res) => {
  res.render('login', { error: null });
};

// Profile page
const profilePage = async (req, res) => {
  try {
    const userId = req.session.user && req.session.user._id;
    console.log('profilePage: req.session.user =', req.session.user, 'req.user =', req.user);
    // Try canonical userModel first, then fallback to legacy contactModel
    let user = null;
    if (!userId) {
      // Render a friendly prompt instead of redirect so users clicking Profile without a session see helpful UI
      return res.render('profile', { user: null, registrations: [], error: 'Please log in to view your profile.' });
    }
    try {
      user = await userModel.findById(userId).lean();
    } catch (e) {
      console.warn('Error finding user in userModel:', e.message || e);
    }
    if (!user) {
      try {
        const contactModel = require('../models/contactModel');
        user = await contactModel.findById(userId).lean();
        if (user) console.info('Loaded profile from legacy contactModel for id', userId);
      } catch (e) {
        console.warn('Error finding user in contactModel:', e.message || e);
      }
    }

    if (!user) {
      console.warn('profilePage: no user found for id', userId);
      return res.render('profile', { user: null, registrations: [], error: 'Profile not found for the current session. Please log in again.' });
    }

    // find registrations for this user: either by user id or by registrantEmail matching this user's email
    const Registration = require('../models/registrationModel');
    const regs = await Registration.find({
      $or: [
        { user: user._id },
        { registrantEmail: user.email }
      ]
    }).populate('course').lean();

    return res.render('profile', { user, registrations: regs });
  } catch (e) {
    console.error('Profile page error:', e);
    return res.redirect('/');
  }
};

// Handle User Login

const UserLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Prefer legacy contactModel (many existing users are stored there).
    // If not found in contactModel, fallback to userModel.
    let account = await contactModel.findOne({ $or: [{ email }, { name: email }] });
    let source = 'contactModel';
    if (!account) {
      account = await userModel.findOne({ $or: [{ email }, { username: email }] });
      source = 'userModel';
    }

    if (!account) {
      return res.render("login", { message: "Invalid email or password" });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.render("login", { message: "Invalid email or password" });
    }

    // Normalize session user object so other parts of the app can read _id, username, email
    const sessionUser = {
      _id: account._id.toString(),
      username: account.username || account.name || '',
      email: account.email || ''
    };

    req.session.user = sessionUser;
    res.locals.user = sessionUser;

    console.log(`User logged in from ${source}:`, sessionUser.email || sessionUser.username);
    return res.redirect('/');
  } catch (error) {
    console.error("Login error:", error);
    return res.render("login", { message: "Something went wrong!" });
  }
};





// Logout
const Userlogout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log("Logout Error:", err);
      return res.redirect('/main');
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.redirect('login'); // Go to login page
  });
};

// Main Page (after login)
const mainPage = (req, res) => {
  const user = req.session.user;
  console.log(user)
  res.render('main', {user: req.session.user});
};

// Example inside userController.js

const loginPage = (req, res) => {
  return res.render("admin/index");
};

const adminLogin = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;
  try {
    let { email, password } = req.body;
    let posts = [
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$category",
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      {
        $addFields: {
          formattedDate: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: "$date",
            },
          },
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          formattedDate: -1,
          category: 1,
          user: 1,
          status: 1,
        },
      },
    ];
    const options = {
      page: parseInt(page || 1),
      limit: parseInt(limit || 10),
    };
    const result = await postModel.aggregatePaginate(posts, options);
    let user = await userModel.findOne({ email });
    if (!user) {
      return res.send(`
            <script type="text/javascript">
              alert('incorrect username  or password!');
              window.location = 'http://localhost:3000/admin'; 
            </script>
          `);
    }
    // let userResult = await bcrypt.compare("admin@email.com" , user.email)

    if (user.email === "imransarvarkhan@gmail.com") {
      let token = generateToken(user);

      res.cookie("token", token);
      return res.render("admin/post", {
        posts: result.docs,
        currentPage: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
        offset,
      });
    } else {
      return res.send(`
                    <script type="text/javascript">
                      alert('Incorrect username or password!');
                      window.location = 'http://localhost:3000/admin'; 
                    </script>
                  `);
      // console.error('email or password incorrect')
    }
  } catch (error) {
    console.log("adminLogin : " + error.message);
  }
};

const logout = (req, res) => {
  res.clearCookie("token");
  return res.redirect("/admin");
};

const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    let { username, password, email } = req.body;
    if (!errors.isEmpty()) {
      return res.status(400).render("admin/add-user", {
        errors: errors.array(),
      });
    }

    let user = await userModel.findOne({ email });
    if (user)
      return res.render("admin/add-user", {
        errors: [{ msg: "Email is already registered" }],
      });
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, async (err, hash) => {
        if (err) {
          return res.send(err.message);
        } else {
          const profileImage = req.file ? req.file.filename : undefined;
          let user = await userModel.create({
            username,
            email,
            password: hash,
            profileImage,
          });

          // Send admin notification about new user registration
          try {
            const mailer = require('../config/mailer');
            if (process.env.ADMIN_EMAIL) {
              const subject = 'New User Signed Up - PM Learning Hub';
              const html = `
                  <h3>New User Registered</h3>
                  <p>A new user has been registered on PM Learning Hub.</p>
                  <table style="border-collapse: collapse; width: 100%;">
                    <tr><td><strong>Username:</strong></td><td>${username}</td></tr>
                    <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
                    <tr><td><strong>Registered At:</strong></td><td>${new Date().toLocaleString()}</td></tr>
                  </table>
                  <p>Please review in admin panel for further actions.</p>
                `;
              await mailer.notifyAdmin(subject, html);
            }
          } catch (emailErr) {
            console.warn('Failed to send admin notification for new user:', emailErr && emailErr.message ? emailErr.message : emailErr);
          }
          return res.redirect("/admin/users");
        }
      });
    });
  } catch (err) {
    res.send(err.message);
  }
};

const addUser = (req, res) => {
  const errors = validationResult(req);
  return res.render("admin/add-user", { errors: [] });
};

// read all user
const allUser = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;
  try {
    let users = [
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "user",
          as: "posts",
        },
      },
      {
        $addFields: {
          postLength: {
            $size: "$posts",
          },
        },
      },
    ];
    const options = {
      page: parseInt(page || 1),
      limit: parseInt(limit || 10),
    };
    const result = await userModel.aggregatePaginate(users, options);

    return res.render("admin/users", {
      users: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
      offset,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server Error");
  }
};

//single user
const editUser = async (req, res) => {
  let user = await userModel.findById({ _id: req.params.id });
  return res.render("admin/update-user", { user });
};

// update
const updateUser = async (req, res) => {
  let { username, email } = req.body;
  const update = { username, email };
  if (req.file && req.file.filename) {
    update.profileImage = req.file.filename;
  }
  await userModel.findByIdAndUpdate(req.params.id, update, { new: true });
  return res.redirect("/admin/users");
};

// delete
const deleteUser = async (req, res) => {
  let { username, password, email, role } = req.body;
  await userModel.findByIdAndDelete(req.params.id, {
    username,
    password,
    email,
    role,
  });
  return res.redirect("/admin/users");
};

module.exports = {
  mainPage,
  UserloginPage,
  UserLogin,
  profilePage,
  Userlogout,
  createUser,
  adminLogin,
  logout,
  addUser,
  editUser,
  allUser,
  updateUser,
  deleteUser,
  loginPage,
}

// ===== Forgot / Reset Password Flow =====
const forgotPasswordPage = (req, res) => {
  return res.render('forgot-password', { message: null });
};

const sendResetCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.render('forgot-password', { message: 'Please provide your email.' });

    // Check if user exists in either collection
    let account = await contactModel.findOne({ email });
    if (!account) account = await userModel.findOne({ email });
    if (!account) return res.render('forgot-password', { message: 'No account found with this email.' });

    // Create reset token + 6-digit code
    const token = crypto.randomBytes(24).toString('hex');
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const bcrypt = require('bcrypt');
    const codeHash = await bcrypt.hash(code, 10);

    // Expire in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Invalidate existing tokens for this email
    await PasswordReset.deleteMany({ email });

    await PasswordReset.create({ email, token, codeHash, expiresAt, verified: false });

    const resetLink = `${req.protocol}://${req.get('host')}/user/reset-password?token=${token}`;
    const html = `
      <p>We received a request to reset your password.</p>
      <p>Your verification code is: <strong>${code}</strong></p>
      <p>Click the link below to reset your password (valid for 15 minutes):</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `;
    const mailInfo = await mailer.sendMail({
      from: process.env.ADMIN_EMAIL || 'no-reply@pmlh.local',
      to: email,
      subject: 'Reset your password',
      html
    });
    const showDev = !mailer.isRealTransport();
    return res.render('forgot-password', {
      message: showDev ? 'Development mode: use the code and link below.' : 'A reset code and link were sent to your email.',
      devResetLink: showDev ? resetLink : null,
      devCode: showDev ? code : null
    });
  } catch (e) {
    console.error('sendResetCode error:', e);
    return res.render('forgot-password', { message: 'Failed to start reset. Please try again.' });
  }
};

const resetPasswordPage = async (req, res) => {
  const token = req.query.token || '';
  return res.render('reset-password', { token, message: null });
};

const resetPasswordSubmit = async (req, res) => {
  try {
    const { token, code, password } = req.body;
    if (!token || !code || !password) {
      return res.render('reset-password', { token, message: 'Please provide code and new password.' });
    }

    const resetDoc = await PasswordReset.findOne({ token });
    if (!resetDoc) {
      return res.render('reset-password', { token: '', message: 'Invalid or expired reset link.' });
    }
    if (resetDoc.expiresAt < new Date()) {
      await PasswordReset.deleteOne({ _id: resetDoc._id });
      return res.render('reset-password', { token: '', message: 'Reset link expired. Please request again.' });
    }

    // Validate code
    const bcrypt = require('bcrypt');
    const ok = await bcrypt.compare(code, resetDoc.codeHash);
    if (!ok) {
      resetDoc.attempts = (resetDoc.attempts || 0) + 1;
      await resetDoc.save();
      return res.render('reset-password', { token, message: 'Invalid code. Please try again.' });
    }

    // Find account by email in either collection
    const email = resetDoc.email;
    let account = await contactModel.findOne({ email });
    let model = 'contact';
    if (!account) { account = await userModel.findOne({ email }); model = 'user'; }
    if (!account) {
      await PasswordReset.deleteOne({ _id: resetDoc._id });
      return res.render('reset-password', { token: '', message: 'Account not found for this email.' });
    }

    // Hash new password (we will not store plaintext passwords for security)
    const pwdHash = await bcrypt.hash(password, 10);
    account.password = pwdHash;
    await account.save();
    await PasswordReset.deleteOne({ _id: resetDoc._id });

    // Optionally sign the user in or redirect to login
    return res.render('login', { error: null, message: 'Password updated. Please log in.' });
  } catch (e) {
    console.error('resetPasswordSubmit error:', e);
    return res.render('reset-password', { token: req.body.token || '', message: 'Failed to reset password.' });
  }
};

// Export forgot/reset for routing
module.exports.forgotPasswordPage = forgotPasswordPage;
module.exports.sendResetCode = sendResetCode;
module.exports.resetPasswordPage = resetPasswordPage;
module.exports.resetPasswordSubmit = resetPasswordSubmit;
