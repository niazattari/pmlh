const express = require('express')
const upload = require('../config/multer');
const { getContactAddPage, AddNewContact, contactValidation } = require("../controllers/contactController");

const Router = express.Router();

Router.get("/", getContactAddPage);

Router.post("/addNewUser", upload.single('profileImage'), contactValidation, AddNewContact);
module.exports =  Router;
