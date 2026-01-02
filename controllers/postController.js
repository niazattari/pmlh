const { validationResult } = require("express-validator");
const postModel = require("../models/postModel");
const categoryModel = require("../models/categoryModel");
const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// ========================================================
// 📌 Get Posts for Main Page
// ========================================================
const getPosts = async (req, res) => {
  try {
    const categoryName = req.query.categoryName || "Courses";
    const category = await categoryModel.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, "i") } });
    let myPosts = [];

    if (category) {
      myPosts = await postModel.find({ category: category._id }).populate("category");
    }

    // 🔹 Testimonials
    const testimonialCategory = await categoryModel.findOne({ name: { $regex: /^Testimonials$/i } });
    let testimonials = [];
    if (testimonialCategory) {
      testimonials = await postModel.find({ category: testimonialCategory._id }).populate("category");
    }

    // 🔹 Associations
    const associationCategory = await categoryModel.findOne({ name: { $regex: /^Associations$/i } });
    let associations = [];
    if (associationCategory) {
      associations = await postModel.find({ category: associationCategory._id }).populate("category");
    }

    // 🔹 Webinars - Updated query
    const webinarCategory = await categoryModel.findOne({ 
      name: { $regex: /^Webinars?$/i } // Match either "Webinar" or "Webinars"
    });
    console.log('Debug - Webinar Category:', webinarCategory);
    
    let webinars = [];
    if (webinarCategory) {
      webinars = await postModel
        .find({ 
          category: webinarCategory._id,
          status: true // Only get published webinars
        })
        .populate("category")
        .lean(); // Convert to plain JavaScript objects
      console.log('Debug - Found Webinars:', webinars.length);
    }

    const user = req.session.user;

    res.render("main", {
      myPosts,
      testimonials,
      associations,
      webinars, // Make sure webinars is included
      user: req.session.user || null,
      categoryName
    });
  } catch (error) {
    console.error("Error in getPosts:", error);
    res.status(500).send("Error loading posts: " + error.message);
  }
};

// ========================================================
// 📌 Add Post Page
// ========================================================
const addPost = async (req, res) => {
  let categories = await categoryModel.find();
  return res.render("admin/add-post", { categories, errors: [] });
};

// ========================================================
// 📌 Create New Post
// ========================================================
const createPost = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      let categories = await categoryModel.find({});
      return res.status(400).render("admin/add-post", { errors: errors.array(), categories });
    }

    const { title, description, categoryId, status } = req.body;
    // support upload.fields: image at req.files.image[0], courseContent at req.files.courseContent[0]
    const image = (req.files && req.files.image && req.files.image[0] && req.files.image[0].filename) || (req.file && req.file.filename);
    const courseContentFile = (req.files && req.files.courseContent && req.files.courseContent[0] && req.files.courseContent[0].filename) || null;
    const token = req.cookies.token;

    // Determine user id: prefer JWT token, fallback to session-based login
    let userId = null;
    let user = null;

    if (token) {
      try {
        const decode = jwt.verify(token, process.env.JWT_KEY);

        // Try multiple possible payload shapes: prefer id, then try email/username fields
        if (decode && decode.id) {
          user = await userModel.findById(decode.id);
          if (user) userId = user._id ? user._id.toString() : (user.id || null);
        } else if (decode && (decode.user || decode.email)) {
          // `user` in older tokens holds email
          const emailToFind = decode.user || decode.email;
          user = await userModel.findOne({ email: emailToFind });
          if (user) userId = user._id ? user._id.toString() : (user.id || null);
        } else if (decode && decode.name) {
          // try username
          user = await userModel.findOne({ username: decode.name });
          if (user) userId = user._id ? user._id.toString() : (user.id || null);
        } else {
          console.warn('createPost: token decoded but missing id/email/name', decode);
        }
      } catch (verifyErr) {
        console.warn('createPost: token verify failed, will try session fallback:', verifyErr && verifyErr.message);
      }
    }

    // Session fallback (many pages use session-based login)
    if (!userId && req.session && req.session.user) {
      userId = req.session.user._id || req.session.user.id || null;
      // Try to fetch full user doc if not already loaded
      if (userId && !user) {
        try { user = await userModel.findById(userId); } catch (e) { /* ignore */ }
      }
    }

    if (!userId) {
      // No authenticated user found — redirect to login instead of failing with TypeError
      console.error('createPost: no authenticated user (no token and no session)');
      return res.status(401).redirect('/user/login');
    }

    const category = categoryId ? await categoryModel.findById(categoryId) : null;

    let postData = {
      title,
      description,
      category: categoryId,
      user: userId,
      image,
      status: status === "Publish",
    };

    // Add course details if category is Courses
    if (category && category.name === 'Courses') {
      const { 
        'courseDetails.duration': duration,
        'courseDetails.startDate': startDate,
        'courseDetails.level': level,
        'courseDetails.mode': mode,
        'courseDetails.fee': fee,
        'courseDetails.language': language,
        'courseDetails.prerequisites': prerequisites,
        'courseDetails.learningOutcomes': learningOutcomes,
        'courseDetails.totalEnrolment': totalEnrolment
      } = req.body;

      postData.courseDetails = {
        duration,
        startDate: new Date(startDate),
        level,
        mode,
        fee,
        language,
        prerequisites: prerequisites ? prerequisites.split(',').map(p => p.trim()) : [],
        learningOutcomes: learningOutcomes ? learningOutcomes.split('\n').map(l => l.trim()) : [],
        totalEnrolment: totalEnrolment || 0,
        syllabusFile: courseContentFile || undefined
      };
    }

    await postModel.create(postData);
    return res.redirect("/admin/post");

  } catch (err) {
    console.error("Create post error:", err);
    res.status(400).json({ error: "Failed to create post", details: err.message });
  }
};

// ========================================================
// 📌 Read All Posts (Admin Panel)
// ========================================================
const allPost = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let posts = [
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$category" },
      { $unwind: "$user" },
      {
        $addFields: {
          formattedDate: {
            $dateToString: { format: "%d-%m-%Y", date: "$date" },
          },
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          formattedDate: 1,
          category: 1,
          user: 1,
          status: 1,
        },
      },
    ];

    const options = {
      page: parseInt(page || 1),
      limit: parseInt(limit || 10),
    };

    const result = await postModel.aggregatePaginate(posts, options);

    return res.render("admin/post", {
      posts: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
      offset,
    });

  } catch (err) {
    res.send(err.message);
  }
};

// ========================================================
// 📌 Edit Post
// ========================================================
const editPost = async (req, res) => {
  let categories = await categoryModel.find({});
  let post = await postModel.findById(req.params.id);

  if (!post) {
    return res.send("Post not found");
  } else {
    return res.render("admin/update-post", { post, categories });
  }
};

// ========================================================
// 📌 Update Post
// ========================================================
const updatePost = async (req, res) => {
  try {
    const { title, description, category, status } = req.body;
    // support upload.fields for update: image and courseContent
    const image = (req.files && req.files.image && req.files.image[0] && req.files.image[0].filename) || (req.file && req.file.filename);
    const courseContentFile = (req.files && req.files.courseContent && req.files.courseContent[0] && req.files.courseContent[0].filename) || null;

    let decode = jwt.verify(req.cookies.token, process.env.JWT_KEY);
    const user = await userModel.findById({ _id: decode.id });
    
    let updateData = {
      title,
      description,
      category,
      user: user._id,
      status: status === "Publish",
    };

    if (image) {
      updateData.image = image;
    }

    // Add course details if category is Courses
    // If category missing in request, try to use existing post's category
    let categoryId = category;
    const existingPost = await postModel.findById(req.params.id).lean();
    if (!categoryId && existingPost) {
      categoryId = existingPost.category;
      updateData.category = categoryId;
    }

    const categoryDoc = categoryId ? await categoryModel.findById(categoryId) : null;
    if (categoryDoc && categoryDoc.name === 'Courses') {
      const { 
        'courseDetails.duration': duration,
        'courseDetails.startDate': startDate,
        'courseDetails.level': level,
        'courseDetails.mode': mode,
        'courseDetails.fee': fee,
        'courseDetails.language': language,
        'courseDetails.prerequisites': prerequisites,
        'courseDetails.learningOutcomes': learningOutcomes,
        'courseDetails.totalEnrolment': totalEnrolment
      } = req.body;

      updateData.courseDetails = {
        duration,
        startDate: new Date(startDate),
        level,
        mode,
        fee,
        language,
        prerequisites: prerequisites ? prerequisites.split(',').map(p => p.trim()) : [],
        learningOutcomes: learningOutcomes ? learningOutcomes.split('\n').map(l => l.trim()) : [],
        totalEnrolment: totalEnrolment || 0,
        syllabusFile: courseContentFile || (existingPost && existingPost.courseDetails ? existingPost.courseDetails.syllabusFile : undefined)
      };
    }

    const updatedPost = await postModel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedPost) return res.status(404).json({ error: "Post not found" });
    return res.redirect("/admin/post");

  } catch (err) {
    console.error("Update post error:", err);
    return res.status(400).json({ error: "Failed to update post", details: err.message });
  }
};

// ========================================================
// 📌 Delete Post
// ========================================================
const deletePost = async (req, res) => {
  try {
    const deletedPost = await postModel.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.send("Post not found");
    return res.redirect("/admin/post");
  } catch (err) {
    res.status(500).send("Error deleting post: " + err.message);
  }
};

// ========================================================
// 📌 Get Testimonials Only
// ========================================================
const getTestimonials = async (req, res) => {
  try {
    const testimonialCategory = await categoryModel.findOne({ name: { $regex: /^Testimonials$/i } });
    let testimonials = [];
    if (testimonialCategory) {
      testimonials = await postModel.find({ category: testimonialCategory._id }).populate("category");
    }
    res.render("testimonials", { testimonials });
  } catch (err) {
    res.status(500).send("Error fetching testimonials");
  }
};

// ========================================================
// 📌 Get Associations Only
// ========================================================
const getAssociations = async (req, res) => {
  try {
    const associationCategory = await categoryModel.findOne({ name: { $regex: /^Associations$/i } });
    let associations = [];
    if (associationCategory) {
      associations = await postModel.find({ category: associationCategory._id }).populate("category");
    }
    res.render("associations", { associations });
  } catch (err) {
    res.status(500).send("Error fetching associations: " + err.message);
  }
};

// ========================================================
// 📌 Get Webinars Only
// ========================================================
const getWebinar = async (req, res) => {
  try {
    console.log('Fetching webinars...');
    const webinarCategory = await categoryModel.findOne({ name: { $regex: /^Webinars$/i } });
    
    if (!webinarCategory) {
      console.log('Webinar category not found');
      return res.render("webinar", { webinars: [], error: "Webinar category not found" });
    }

    const webinars = await postModel.find({ 
      category: webinarCategory._id,
      status: true  // Only show published webinars
    }).populate("category");

    // console.log(`Found ${webinars.length} webinars`);
    
    if (!webinars.length) {
      console.log('No webinars found');
      return res.render("webinar", { webinars: [], error: "No webinars available" });
    }

    res.render("webinar", { 
      webinars,
      error: null,
      user: req.session.user || null // Add user data
    });

  } catch (err) {
    console.error("Error in getWebinar:", err);
    res.status(500).render("webinar", { 
      webinars: [],
      error: "Error loading webinars",
      user: req.session.user || null // Add user data
    });
  }
};

// ========================================================
// 📤 Export
// ========================================================
module.exports = {
  allPost,
  addPost,
  createPost,
  editPost,
  updatePost,
  deletePost,
  getPosts,
  getTestimonials,
  getAssociations,
  getWebinar,
  deletePost,
  getPosts,
  getTestimonials,
  getAssociations,
  getWebinar,
};
