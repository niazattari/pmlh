const express = require('express')
const { index,  postByCategories, singlePost, search,author, addComment } = require('../controllers/siteController')
const router = express.Router()

// const logIn = require('../middlewares/isLoggedin')

router.get('/', index)
router.get('/main', index) // This can be used to render the main page with posts
router.get('/category/:name', postByCategories)
router.get('/single/:id', singlePost)
router.get('/search', search)
router.get('/author/:name', author)

// router.get('/single/:id/comment', comment)
router.post('/single/:id', addComment)
// router.get('//:id/comment/:id', deleteComment)

module.exports = router 