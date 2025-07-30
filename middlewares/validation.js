const { body } = require('express-validator');
const userModel = require('../models/userModel');
const categoryModel = require('../models/categoryModel');

const userValidation = [
  body('username')
    .isString()
    .isLength({ min:5, max: 10 })
    .trim()
    .withMessage('Username must be between 5 and 10 characters long.'),
  body('email')
    .isEmail()
    .withMessage('Enter a valid email address')
    .custom(async (value) => {
      const existingUser = await userModel.findOne({ email: value });
      if (existingUser) {
          throw new Error('Email already exists. Please use a different Email.');
      }
      return true; 
    }),
  body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
];


const postValidation = [
  body('title')
    .notEmpty()
    .isLength({min:5, max:50 })
    .trim()
    .withMessage('Title must be between 5 and 50 characters long.'),
  body('description')
   .notEmpty()
   .isLength({ min:10,max: 1000 })
   .withMessage('Description must be between 10 and 1000 characters long.')
   .trim(),

]

const categoryValidation = [
    body('name')
      .trim()
      .isString()
      .custom(value => {
        if (!/^[A-Za-z\s]+$/.test(value)) {
            throw new Error('Category should contain only letters and spaces');
        }
        return true; // Validation pass
       })
       .notEmpty()
       .isLength({ min:5, max: 20 })
       .withMessage('Category must be between 5 and 20 characters long.')
       .custom(async (value) => {
         const existingCategory = await categoryModel.findOne({ name: value });
         if (existingCategory) {
           throw new Error('Category name is already exists. Please use a different category name.');
          }
          return true; 
        })
        
]


module.exports = {userValidation, postValidation, categoryValidation}