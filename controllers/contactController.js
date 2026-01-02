const transporter = require("../config/mailer"); // assuming this path is correct
const path = require("path");
const mongoose = require("mongoose");
const express = require("express");
const contactModel = require("../models/contactModel");
const categoryModel = require("../models/categoryModel");
const postModel = require("../models/postModel");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const upload = require("../config/multer");
const bcrypt = require("bcrypt");

const contactValidation = [
  check("name").trim().not().isEmpty().withMessage("Name is required"),
  check("fatherName").trim().not().isEmpty().withMessage("Father name is required"),
  check("contactNo").trim().matches(/^03[0-9]{2}-?[0-9]{7}$/).withMessage("Contact number must be in 03xx-xxxxxxx format"),
  check("email").isEmail().withMessage("Invalid email"),
  check("password").optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  // optional extra fields
  check('country').optional({ checkFalsy: true }).trim(),
  check('address').optional({ checkFalsy: true }).trim(),
];

const mongoosePaginate = require("mongoose-aggregate-paginate-v2");
// const getContacts = async (req, res) => {
//   const contacts = await contactModel.find();
//   res.render("admin/contact-list", { contacts });
// };

const getContacts = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const allcontacts = [
      {
        $lookup: {
          from: "posts",
          localField: "postId",
          foreignField: "_id",
          as: "post",
        },
      },
      {
        $unwind: "$post",
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
      { $sort: { date: -1 } },
    ];
    const options = {
      page: parseInt(page || 1),
      limit: parseInt(limit || 10),
    };
    const result = await contactModel.aggregatePaginate(allcontacts, options);
    const contacts = await contactModel.find();

    return res.render("admin/contact-list", {
      contacts,
      allcontacts: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
      offset,
    });
  } catch (err) {
    console.log(err);
  }
};

const getContactUpdatePage = (req, res) => {
  res.render("admin/contact-update");
};
// This function renders the contact add page
const getContactAddPage = async (req, res) => {
  res.render("contact-add", {});
};

const AddNewContact = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("contact-add", {
        errors: errors.array(),
        message: "Please fix the errors below.",
      });
    }

    const { name, fatherName, contactNo, email, password, country, address } = req.body;
    const profileImage = req.file?.filename;

    // Check for existing account in canonical users or legacy contacts
    const userModel = require('../models/userModel');
    const existingUser = await userModel.findOne({ email });
    const existingContact = await contactModel.findOne({ email });
    if (existingUser || existingContact) {
      return res.render('contact-add', {
        message: 'This email is already registered. Please login to access courses.',
      });
    }

    // ✅ Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // create contact record
    const contact = await contactModel.create({
      name,
      fatherName,
      contactNo,
      email,
      password: hashedPassword, // store hashed password
      profileImage,
      country: country || '',
      address: address || '',
    });

    // ... rest of your email and render logic ...

    // Send email to admin

    const mailOptions = {
      from: `"PM Learning Hub" <${process.env.ADMIN_EMAIL}>`,
      to: process.env.ADMIN_EMAIL, // send to admin's own inbox
      subject: "New User Registration - PM Learning Hub",
      html: `
  <h2 style="color: #2c3e50;">New User Registration Alert</h2>

  <p>Dear Admin,</p>

  <p>A new user has successfully registered on <strong>PM Learning Hub</strong>. Below are the details:</p>

  <table cellspacing="0" cellpadding="8" border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px;">
    <tr style="background-color: #f2f2f2;"><th>Field</th><th>Details</th></tr>
    <tr><td><strong>Name</strong></td><td>${name}</td></tr>
    <tr><td><strong>Father Name</strong></td><td>${fatherName}</td></tr>
    <tr><td><strong>Contact Number</strong></td><td>${contactNo}</td></tr>
    <tr><td><strong>Email</strong></td><td>${email}</td></tr>
    <tr><td><strong>Password</strong></td><td>${password}</td></tr>
    <tr><td><strong>Profile Image</strong></td><td>${
      profileImage
        ? `<a href="/uploads/${profileImage}">View Image</a>`
        : "No image uploaded"
    }</td></tr>
  </table>

  <br>
  <p>You can access the admin panel for further details.</p>

  <p style="color: #555;">Regards,<br><strong>PM Learning Hub</strong></p>
`,
    };

    try {
      const mailer = require('../config/mailer');
      await mailer.notifyAdmin(mailOptions.subject, mailOptions.html, { from: mailOptions.from });
    } catch (err) {
      console.error('Error sending admin email from contact add:', err);
    }

      // Send welcome email to user (best-effort)
      try {
        const mailer = require('../config/mailer');
        await mailer.sendUserRegistrationWelcome({ to: email, name });
      } catch (err) {
        console.warn('Error sending user welcome email from contact add:', err && err.message);
      }

  console.log("Contact created:", contact);

    return res.render("contact-add", {
      success: "Contact added successfully! You can now login to access courses.",
    });
  } catch (err) {
    console.error("Error saving contact:", err);
    return res
      .status(400)
      .json({ error: "Failed to create contact", details: err.message });
  }
};

// Public registration handler: renders `register` view instead of `contact-add`.
const registerPublic = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const categories = await postModel.find().lean();
      return res.render("register", {
        errors: errors.array(),
        message: "Please fix the errors below.",
        Post: categories,
      });
    }

    const { name, fatherName, contactNo, email, password, country, address, CourseId } = req.body;
    const profileImage = req.file?.filename;

    // check existing email across both user and contact collections
    const userModel = require('../models/userModel');
    const existingUser = await userModel.findOne({ email });
    const existingContact = await contactModel.findOne({ email });
    if (existingUser || existingContact) {
      const categories = await postModel.find().lean();
      return res.render('register', {
        message: 'This email is already registered. Please login to access courses.',
        Post: categories
      });
    }

    // hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const contact = await contactModel.create({
      name,
      fatherName,
      contactNo,
      email,
      password: hashedPassword,
      country,
      address,
      profileImage,
      postId: CourseId || null
    });

    // notify admin (best-effort)
    try {
      const mailer = require('../config/mailer');
      const html = `<p>New public registration: ${name} (${email})</p>`;
      await mailer.notifyAdmin('New Public Registration', html);
    } catch (e) {
      console.warn('registerPublic: failed to send admin email', e && e.message);
    }

      // send welcome email to user (best-effort)
      try {
        const mailer = require('../config/mailer');
        await mailer.sendUserRegistrationWelcome({ to: email, name });
      } catch (e) {
        console.warn('registerPublic: failed to send user welcome email', e && e.message);
      }

    const categories = await postModel.find().lean();
    return res.render('register', {
      success: 'Registration successful! You can now login to access courses.',
      Post: categories
    });
  } catch (err) {
    console.error('registerPublic error:', err);
    return res.status(400).render('register', { message: 'Failed to register. Try again later.' });
  }
};

const getContactDataForUpdate = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.render("admin/400", { message: "Invalid contact ID" });
  }
  const contactId = await contactModel.findById(req.params.id);
  res.render("admin/contact-update", { contactId });
};

const postDataforUpdate = async (req, res) => {
  await contactModel.findByIdAndUpdate(req.params.id, req.body);
  console.log("data updated successfully");
  res.redirect("/admin/contacts");
};

const deleteDatabyId = async (req, res) => {
  await contactModel.findByIdAndDelete(req.params.id);
  res.redirect("/admin/contacts");
};

module.exports = {
  AddNewContact,
  getContactAddPage,
  getContacts,
  getContactUpdatePage,
  getContactDataForUpdate,
  postDataforUpdate,
  deleteDatabyId,
  registerPublic,
  contactValidation,
};
