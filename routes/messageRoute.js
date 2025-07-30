const express = require('express');
const upload = require('../config/multer');
const { postValidation } = require('../middlewares/validation');
const { getMessageAddPage, AddNewMessage } = require("../controllers/messageController");
const Router = express.Router();

Router.get("/", getMessageAddPage);
Router.post('/addNewMessage', AddNewMessage);

module.exports = Router;