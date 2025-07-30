const mongoose = require("mongoose");
const express = require("express");
const contactModel = require("../models/contactModel");
const categoryModel = require("../models/categoryModel");
const messageModel = require("../models/messageModel");
const { check, validationResult } = require("express-validator");

const postModel = require("../models/postModel");
const router = express.Router();
const upload = require("../config/multer");
const transporter = require("../config/mailer"); // import the mailer

const postValidation = [
  check("name").not().isEmpty().withMessage("Name is required"),
  check("email").isEmail().withMessage("Invalid email"),
  // Add more validation rules as needed
];

const mongoosePaginate = require("mongoose-aggregate-paginate-v2");
// const getMessages = async (req, res) => {
//   try {
//     const messages = await messageModel.find();
//     res.render("admin/messages", { messages }); // pass messages to the view
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Error fetching messages");
//   }
// };
const getMessages = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const allmessages = [
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
    const result = await messageModel.aggregatePaginate(allmessages, options);
    const messages = await messageModel.find();

    return res.render("admin/messages", {
      messages,
      allmessages: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
      offset,
    });
  } catch (err) {
    console.log(err);
  }
};

// This function renders the contact add page
const getMessageAddPage = async (req, res) => {
  // let posts = await postModel.find();
  return res.render("/main");
};

const AddNewMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render("main", {
        errors: errors.array(),
        message: "Please fix the errors below.",
      });
    }

    const { name, email, message, status } = req.body;
    const profileImage = req.file?.filename;

    // Save message to DB
    await messageModel.create({ name, email, message, status });

    // Send email to admin
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: "New Client Inquiry Received – Please Review",
      html: `
    <h2>New Client Contact Notification</h2>

    <p>Dear Admin,</p>

    <p>A new user has just submitted a message through your website. Please review the details below:</p>

    <table style="border-collapse: collapse; width: 100%;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc;"><strong>Name:</strong></td>
        <td style="padding: 8px; border: 1px solid #ccc;">${name}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc;"><strong>Email:</strong></td>
        <td style="padding: 8px; border: 1px solid #ccc;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc;"><strong>Status:</strong></td>
        <td style="padding: 8px; border: 1px solid #ccc;">${status}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc;"><strong>Message:</strong></td>
        <td style="padding: 8px; border: 1px solid #ccc;">${message}</td>
      </tr>
    </table>

    <p>Please log in to the admin panel to respond or take necessary action.</p>

    <p style="margin-top: 30px;">Best regards,<br>Your Website Notification System</p>
  `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("Email sent successfully");
    } catch (err) {
      console.error("Failed to send email:", err.message);
    }

    res.redirect("/main");
  } catch (err) {
    res.status(400).json({
      error: "Failed to create contact",
      details: err.message,
    });
  }
};

const getMessageDataForUpdate = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.render("admin/400", { message: "Invalid contact ID" });
  }
  const messageId = await messageModel.findById(req.params.id);
  res.render("admin/message-update", { contactId });
};

const postMessageforUpdate = async (req, res) => {
  await messageModel.findByIdAndUpdate(req.params.id, req.body);
  console.log("data updated successfully");
  res.redirect("/admin/messaages");
};

const deleteMessagebyId = async (req, res) => {
  await messageModel.findByIdAndDelete(req.params.id);
  res.redirect("/admin/messages");
};

module.exports = {
  AddNewMessage,
  getMessageAddPage,
  getMessages,
  getMessageDataForUpdate,
  postMessageforUpdate,
  deleteMessagebyId,
};
