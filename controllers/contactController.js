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

const postValidation = [
  check("name").not().isEmpty().withMessage("Name is required"),
  check("fatherName").not().isEmpty().withMessage("Father name is required"),
  check("contactNo").not().isEmpty().withMessage("Contact number is required"),
  check("email").isEmail().withMessage("Invalid email"),
  check("password").not().isEmpty().withMessage("Password is required"),
  // check('country').not().isEmpty().withMessage('Country is required'),
  // check('qualification').not().isEmpty().withMessage('Qualification is required'),
  // check('address').not().isEmpty().withMessage('Address is required'),
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

    const { name, fatherName, contactNo, email, password } = req.body;
    const profileImage = req.file?.filename;

    const contact = await contactModel.create({
      name,
      fatherName,
      contactNo,
      email,
      password,
      profileImage,
    });

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
    <tr><td><strong>Profile Image</strong></td><td>${profileImage ? `<a href="/uploads/${profileImage}">View Image</a>` : 'No image uploaded'}</td></tr>
  </table>

  <br>
  <p>You can access the admin panel for further details.</p>

  <p style="color: #555;">Regards,<br><strong>PM Learning Hub</strong></p>
`,

    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email to admin:", error);
      } else {
        console.log("Email sent to admin: " + info.response);
      }
    });

    console.log("Contact created:", contact);

    return res.render("contact-add", {
      message: "Contact added successfully!",
    });
  } catch (err) {
    console.error("Error saving contact:", err);
    return res
      .status(400)
      .json({ error: "Failed to create contact", details: err.message });
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
};
