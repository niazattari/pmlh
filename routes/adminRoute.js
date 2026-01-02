const express = require('express')
const router = express.Router()
const upload = require('../middlewares/multer')
const multerLib = require('multer');
const path = require('path');
// create a local adminUpload instance to avoid unexpected-field errors from other multer configs
const adminStorage = multerLib.diskStorage({
	destination: (req, file, cb) => cb(null, 'uploads/'),
	filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const adminUpload = multerLib({ storage: adminStorage });
const { validationResult } = require('express-validator');

const isLoggedIn = require('../middlewares/isLoggedin')
const {createUser,adminLogin,logout, addUser ,allUser,editUser,updateUser,deleteUser , loginPage} = require('../controllers/userController')
const {allCategories, addCategory,createCategory,editCategory,updateCategory, deleteCategory} = require('../controllers/categoryController')
const {allPost,addPost,createPost,editPost, updatePost, deletePost} = require('../controllers/postController')
const {allComments,viewComment, editComment, updateComment, deleteComment} = require('../controllers/commentController')
const {getContacts, getContactUpdatePage, getContactDataForUpdate, postDataforUpdate, deleteDatabyId} = require('../controllers/contactController')
const {userValidation, postValidation, categoryValidation} = require('../middlewares/validation');
const {getMessages, getMessageDataForUpdate, postMessageforUpdate, deleteMessagebyId } = require('../controllers/messageController');
const { allRegistrations, updateRegistrationStatus, summaryDashboard } = require('../controllers/adminController');
const { getCertificates, getCertificatesDataForUpdate, postCertificatesforUpdate, deleteCertificatesbyId } = require('../controllers/certificateController');

router.get('/', loginPage)
router.post('/index', userValidation, adminLogin)
router.get('/logout', logout) 

router.get('/users', isLoggedIn, allUser)
router.get('/add-user', isLoggedIn,addUser)
// accept optional profile image for admin/instructor
router.post('/users', isLoggedIn, upload.single('profileImage'), userValidation, createUser)
router.get('/update-user/:id', isLoggedIn, editUser)
// accept optional profile image on update
router.post('/users/:id', isLoggedIn, upload.single('profileImage'), userValidation, updateUser)
router.get('/delete-user/:id', isLoggedIn, deleteUser)

router.get('/category', isLoggedIn, allCategories)
router.get('/add-category', isLoggedIn, addCategory)
router.post('/category', isLoggedIn,categoryValidation, createCategory)
router.get('/update-category/:id', isLoggedIn, editCategory)
router.post('/category/:id', isLoggedIn, categoryValidation,updateCategory)
router.get('/delete-category/:id', isLoggedIn, deleteCategory)

router.get('/post', isLoggedIn, allPost)
router.get('/add-post', isLoggedIn, addPost)
// accept image and optional courseContent PDF for courses
router.post('/create-post', isLoggedIn, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'courseContent', maxCount: 1 }]) ,postValidation, createPost)
router.get('/update-post/:id', isLoggedIn, editPost)
// accept image and optional courseContent PDF on update
router.post('/post/:id', isLoggedIn, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'courseContent', maxCount: 1 }]), postValidation, updatePost)
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


router.get("/certificates", isLoggedIn, getCertificates);
router.get("/certificates-update/:id", isLoggedIn, getCertificatesDataForUpdate);
// accept a single certificate file optionally
router.post("/certificates-update/:id" , isLoggedIn, adminUpload.single('certificateFile'), postValidation, postCertificatesforUpdate);
router.get("/certificates-delete/:id", isLoggedIn, deleteCertificatesbyId);

// Course registrations management
// Support both /admin/registrations and legacy /admin/courses link in admin header
router.get('/courses', isLoggedIn, allRegistrations);
router.get('/registrations', isLoggedIn, allRegistrations);
// allow uploading files when admin updates status
// Use upload.any() to avoid Multer 'Unexpected field' errors when browsers include fields differently
router.post('/registrations/:id/status', isLoggedIn, adminUpload.any(), updateRegistrationStatus);

// Admin summary dashboard
router.get('/summary', isLoggedIn, summaryDashboard);


module.exports = router