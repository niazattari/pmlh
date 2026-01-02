// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { isAuth } = require("../middlewares/auth");
const upload = require("../config/multer");
console.log('courseController:', courseController);
console.log('isAuth:', typeof isAuth);



// ✅ Safe wrapper to prevent crashes if any controller function is missing
function safeHandler(name) {
  if (typeof courseController[name] === "function") {
    return courseController[name];
  }
  return (req, res) => {
    console.error(`[courseRoutes] Missing controller method: ${name}`);
    res
      .status(500)
      .render("error", { message: `Server configuration error: handler "${name}" not found.` });
  };
}

// ✅ Routes
// Allow anyone to view the registration form page (no login required)
router.get("/course-registration/:id", courseController.showRegistrationForm);
// Register (POST) accepts both authenticated and anonymous submissions; multer handles the file
router.post("/register/:id", upload.single('paymentProof'), courseController.registerCourse);
// router.get("/view/:id", courseController.getSingleCourse);

// ✅ Optional 404 handler
router.use((req, res) => {
  res.status(404).render("error", { message: "Course page not found" });
});

module.exports = router;
