require('dotenv').config();
const mongoose = require('mongoose');
const db = require('../config/mongoose-connection');

const Category = require('../models/categoryModel');
const Certificate = require('../models/certificateModel');
const Comment = require('../models/commentModel');
const Contact = require('../models/contactModel');
const Message = require('../models/messageModel');
const Post = require('../models/postModel');
const Registration = require('../models/registrationModel');
const User = require('../models/userModel');

async function main() {
  try {
    const conn = mongoose.connection;
    await new Promise((resolve, reject) => {
      if (conn.readyState === 1) return resolve();
      conn.once('connected', resolve);
      conn.once('error', reject);
    });
    const dbName = conn.name || conn.db?.databaseName;
    console.log(`Connected. Active DB: ${dbName}`);

    const models = [
      ['category', Category],
      ['certificate', Certificate],
      ['comment', Comment],
      ['contact', Contact],
      ['message', Message],
      ['post', Post],
      ['registration', Registration],
      ['user', User],
    ];

    for (const [name, Model] of models) {
      try {
        const count = await Model.countDocuments();
        console.log(`${name}: ${count}`);
      } catch (err) {
        console.log(`${name}: error -> ${err.message}`);
      }
    }
  } catch (err) {
    console.error('DB check failed:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
