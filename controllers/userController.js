const { validationResult } = require("express-validator");
const generateToken = require("../config/jsonwebtoken");
const postModel = require("../models/postModel");
const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Render Login Page
const UserloginPage = (req, res) => {
  res.render('login', { error: null });
};

// Handle User Login
const UserLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid email or password' });
    }

    // Set session
    req.session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image
    };

    console.log("User logged in:", req.session.user);
    res.redirect('/main');  // or wherever you want

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


// Logout
const Userlogout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log("Logout Error:", err);
      return res.redirect('/main');
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.redirect('login'); // Go to login page
  });
};




// Main Page (after login)
const mainPage = (req, res) => {
  const user = req.session.user;
  console.log(user)
  res.render('main', {user: req.session.user});
};

// Example inside userController.js

const loginPage = (req, res) => {
  return res.render("admin/index");
};

const adminLogin = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;
  try {
    let { email, password } = req.body;
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
      {
        $unwind: {
          path: "$category",
        },
      },
      {
        $unwind: {
          path: "$user",
        },
      },
      {
        $addFields: {
          formattedDate: {
            $dateToString: {
              format: "%d-%m-%Y",
              date: "$date",
            },
          },
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          formattedDate: -1,
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
    let user = await userModel.findOne({ email });
    if (!user) {
      return res.send(`
            <script type="text/javascript">
              alert('incorrect username  or password!');
              window.location = 'http://localhost:3000/admin'; 
            </script>
          `);
    }
    // let userResult = await bcrypt.compare("admin@email.com" , user.email)

    if ((user.email = "imransarvarkhan@gmai.com")) {
      let token = generateToken(user);

      res.cookie("token", token);
      return res.render("admin/post", {
        posts: result.docs,
        currentPage: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
        offset,
      });
    } else {
      return res.send(`
                    <script type="text/javascript">
                      alert('Incorrect username or password!');
                      window.location = 'http://localhost:3000/admin'; 
                    </script>
                  `);
      // console.error('email or password incorrect')
    }
  } catch (error) {
    console.log("adminLogin : " + error.message);
  }
};

const logout = (req, res) => {
  res.clearCookie("token");
  return res.redirect("/admin");
};

const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    let { username, password, email } = req.body;
    if (!errors.isEmpty()) {
      return res.status(400).render("admin/add-user", {
        errors: errors.array(),
      });
    }

    let user = await userModel.findOne({ email });
    if (user)
      return res.render("admin/add-user", {
        errors: [{ msg: "Email is already registered" }],
      });
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(password, salt, async (err, hash) => {
        if (err) {
          return res.send(err.message);
        } else {
          let user = await userModel.create({
            username,
            email,
            password: hash,
          });
          return res.redirect("/admin/users");
        }
      });
    });
  } catch (err) {
    res.send(err.message);
  }
};

const addUser = (req, res) => {
  const errors = validationResult(req);
  return res.render("admin/add-user", { errors: [] });
};

// read all user
const allUser = async (req, res) => {
  const { page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;
  try {
    let users = [
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "user",
          as: "posts",
        },
      },
      {
        $addFields: {
          postLength: {
            $size: "$posts",
          },
        },
      },
    ];
    const options = {
      page: parseInt(page || 1),
      limit: parseInt(limit || 10),
    };
    const result = await userModel.aggregatePaginate(users, options);

    return res.render("admin/users", {
      users: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
      offset,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server Error");
  }
};

//single user
const editUser = async (req, res) => {
  let user = await userModel.findById({ _id: req.params.id });
  return res.render("admin/update-user", { user });
};

// update
const updateUser = async (req, res) => {
  let { username, email } = req.body;
  const user = await userModel.findByIdAndUpdate(
    req.params.id,
    { username, email },
    { new: true }
  );
  return res.redirect("/admin/users");
};

// delete
const deleteUser = async (req, res) => {
  let { username, password, email, role } = req.body;
  await userModel.findByIdAndDelete(req.params.id, {
    username,
    password,
    email,
    role,
  });
  return res.redirect("/admin/users");
};

module.exports = {
  mainPage,
  UserloginPage,
  UserLogin,
  Userlogout,
  createUser,
  adminLogin,
  logout,
  addUser,
  editUser,
  allUser,
  updateUser,
  deleteUser,
  loginPage,
}
