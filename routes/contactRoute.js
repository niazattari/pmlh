const express = require('express')
const upload = require('../config/multer');
const { postValidation } = require('../middlewares/validation');
const { getContactAddPage, AddNewContact } = require("../controllers/contactController");

const Router = express.Router();

Router.get("/", getContactAddPage);

Router.post("/addNewUser", upload.single('profileImage'), AddNewContact);
module.exports =  Router;
