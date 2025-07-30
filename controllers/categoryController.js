const { validationResult } = require('express-validator');
const categoryModel = require('../models/categoryModel')
const postModel = require('../models/postModel')

//addCategory
const addCategory = (req, res) => {
  return res.render('admin/add-category', {errors:[]})
}

const createCategory = async (req, res) => {
  try {
    const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).render('admin/add-category', {
            errors: errors.array(),
            
          });
      }
    let { name } = req.body
    let newCategory = await categoryModel.create({ name })
    return res.redirect('/admin/category',)
  } catch (err) {
    return res.send(err.message)
  }
}

// read all categories
const allCategories = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  try {
    let categories = [
        {
          $lookup: {
            from: 'posts',
            localField: '_id',
            foreignField: 'category',
            as: 'posts'
          }
        },
        {
          $addFields:{
            postLength:{
              $size:'$posts'
            }
          }
        },
        {$sort:{createdAt:-1}}
      ]
      const options = {
        page: parseInt(page || 1),  
        limit: parseInt(limit || 10),
      } 
    const result = await categoryModel.aggregatePaginate(categories, options)
     const offset = (page-1)*limit;
    
    return res.render('admin/category', {
       categories:result.docs,
       currentPage : result.page,
       totalPages : result.totalPages,
       limit: result.limit,
       offset
      })
  }
  catch (err) {
    console.log(err);
  }
}



//single 
const editCategory = async (req, res) => {
  let category = await categoryModel.findById({ _id : req.params.id })
  return res.render('admin/update-category', { category })
}

// update
const updateCategory = async (req, res) => {
  const errors = validationResult(req);
      if (!errors.isEmpty()) {
          return res.status(400).render('admin/add-category', {
            errors: errors.array(),
            
          });
      }
      console.log(errors);
      
  let { name } = req.body;
  let category = await categoryModel.findByIdAndUpdate(req.params.id, { name }, { new: true })
  return res.redirect('/admin/category')
}

// delete
const deleteCategory = async (req, res) => {
  let { name } = req.body;
  await categoryModel.findByIdAndDelete(req.params.id, { name })
  return res.redirect('/admin/category')
}

module.exports = { addCategory, allCategories, createCategory, editCategory, updateCategory, deleteCategory }
