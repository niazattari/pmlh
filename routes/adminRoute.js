
const express = require('express')
const router = express.Router()
const upload = require('../middlewares/multer')
const { validationResult } = require('express-validator');

const isLoggedIn = require('../middlewares/isLoggedin')
const {createUser,adminLogin,logout, addUser ,allUser,editUser,updateUser,deleteUser , loginPage} = require('../controllers/userController')
const {allCategories, addCategory,createCategory,editCategory,updateCategory, deleteCategory} = require('../controllers/categoryController')
const {allPost,addPost,createPost,editPost, updatePost, deletePost} = require('../controllers/postController')
const {allComments,viewComment, editComment, updateComment, deleteComment} = require('../controllers/commentController')
const {getContacts, getContactUpdatePage, getContactDataForUpdate, postDataforUpdate, deleteDatabyId} = require('../controllers/contactController')
const {userValidation, postValidation, categoryValidation} = require('../middlewares/validation');
const {getMessages, getMessageDataForUpdate, postMessageforUpdate, deleteMessagebyId } = require('../controllers/messageController');


router.get('/', loginPage)
router.post('/index', userValidation, adminLogin)
router.get('/logout', logout) 

router.get('/users', isLoggedIn, allUser)
router.get('/add-user', isLoggedIn,addUser)
router.post('/users', isLoggedIn ,userValidation, createUser)
router.get('/update-user/:id', isLoggedIn, editUser)
router.post('/users/:id', isLoggedIn, userValidation, updateUser)
router.get('/delete-user/:id', isLoggedIn, deleteUser)

router.get('/category', isLoggedIn, allCategories)
router.get('/add-category', isLoggedIn, addCategory)
router.post('/category', isLoggedIn,categoryValidation, createCategory)
router.get('/update-category/:id', isLoggedIn, editCategory)
router.post('/category/:id', isLoggedIn, categoryValidation,updateCategory)
router.get('/delete-category/:id', isLoggedIn, deleteCategory)

router.get('/post', isLoggedIn, allPost)
router.get('/add-post', isLoggedIn, addPost)
router.post('/post', isLoggedIn, upload.single('image') ,postValidation, createPost)
router.get('/update-post/:id', isLoggedIn, editPost)
router.post('/post/:id', isLoggedIn, upload.single('image'), postValidation,updatePost)
router.get('/delete-post/:id', isLoggedIn, deletePost)

router.get('/comments', isLoggedIn, allComments)
router.get('/view-comment/:id', isLoggedIn, viewComment)
router.get('/update-comment/:id', isLoggedIn, editComment)
router.post('/comments/:id', isLoggedIn, updateComment)
router.get('/delete-comment/:id', isLoggedIn, deleteComment)

router.get("/contacts", getContacts );
router.get("/update", getContactUpdatePage);
router.get("/contact-update/:id", getContactDataForUpdate);
router.post("/contact-update/:id",  upload.single('image') ,postValidation, postDataforUpdate);
router.get("/contact-delete/:id", deleteDatabyId);

router.get("/messages", isLoggedIn, getMessages);
router.get("/message-update/:id", getMessageDataForUpdate);
router.post("/message-update/:id" ,postValidation, postMessageforUpdate);
router.get("/message-delete/:id", deleteMessagebyId);


module.exports = router