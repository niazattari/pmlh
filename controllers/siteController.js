const mongoose = require("mongoose");

const categoryModel = require("../models/categoryModel");
const postModel = require("../models/postModel");
const userModel = require("../models/userModel");
const commentModel = require("../models/commentModel");

const index = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const totalPosts = await postModel.countDocuments();
    let categories = await categoryModel.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "category",
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
    ]);
    let posts = [
      { $match: { status: true } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },

      { $unwind: "$user" },
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
        $sort: { date: -1 },
      },
      {
        $project: {
          title: 1,
          description: 1,
          image: 1,
          user: 1,
          category: 1,
          formattedDate: 1,
        },
      },
    ];
    const options = {
      page: parseInt(page || 1),
      limit: parseInt(limit || 10),
    };
    const result = await postModel.aggregatePaginate(posts, options);

    return res.render("index", {
      categories,
      posts: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
    });
    
  } catch (error) {
    console.log(error);
  }
};

const postByCategories = async (req, res) => {
  const { search } = req.query;
  const { page = 1, limit = 10 } = req.query;
  const categoryName = req.params.name;
  let categories = await categoryModel.aggregate([
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "category",
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
  ]);
  let categoryPost = [
    {
      $match: { name: categoryName },
    },
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "category",
        as: "post",
      },
    },
    {
      $unwind: {
        path: "$post",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "post.user",
        foreignField: "_id",
        as: "user",
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
            date: "$post.date",
          },
        },
      },
    },
    { $sort: { "post._id": -1 } },
  ];
  const posts = await postModel.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
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
    { $sort: { _id: -1 } },
  ]);
  const options = {
    page: parseInt(page || 1),
    limit: parseInt(limit || 10),
  };
  const result = await categoryModel.aggregatePaginate(categoryPost, options);

  if (categories) {
    return res.render("category", {
      search,
      posts,
      categories,
      categoryPost: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
      categoryName,
    });
  } else {
    return res.send("category not found");
  }
};

const singlePost = async (req, res) => {
  let categories = await categoryModel.aggregate([
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "category",
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
  ]);
  let singlePost = await postModel.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.params.id) },
    },
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
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
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "postId",
        as: "comment",
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
  ]);
  let posts = await postModel.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
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
    { $sort: { _id: -1 } },
  ]);
  // console.log(singlePost);

  return res.render("single", { singlePost: singlePost[0], posts, categories });
};

const search = async (req, res) => {
  try {
    let { search } = req.query;

    let categories = await categoryModel.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "category",
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
    ]);
    let searchPost = await postModel.aggregate([
      {
        $match: {
          $or: [
            { title: { $regex: new RegExp(search, "i") } },
            { description: { $regex: new RegExp(search, "i") } },
          ],
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          title: 1,
          description: 1,
          category: 1,
          image: 1,
          date: 1,
          user: 1,
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
      { $sort: { _id: -1 } },
      // {
      //     $sort:{date:-1}
      //   }
    ]);
    let posts = await postModel.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
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
      { $sort: { _id: -1 } },
    ]);
    return res.render("search", {
      search,
      categories,
      posts,
      searchPost,
      posts
    });
  } catch (err) {
    console.log(err);
  }
};

const author = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    let categories = await categoryModel.find({});
    const authorName = req.params.name;
    let authorPost = [
      {
        $match: { username: authorName },
      },

      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "user",
          as: "post",
        },
      },
      { $unwind: "$post" },
      {
        $lookup: {
          from: "categories",
          localField: "post.category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $sort: { "post._id": -1 } },
    ];
    let posts = await postModel.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
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
      { $sort: { _id: -1 } },
    ]);
    const options = {
      page: parseInt(page || 1),
      limit: parseInt(limit || 10),
    };
    const result = await userModel.aggregatePaginate(authorPost, options);

    return res.render("author", {
      posts,
      categories,
      authorPost: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      limit: result.limit,
      authorName,
    });
  } catch (error) {
    return res.send(error.message);
  }
};

const addComment = async (req, res) => {
  try {
    const { name, email, description, postId, date } = req.body;

    const comment = await commentModel.create({
      name,
      email,
      description,
      postId: new Object(postId),
      date,
    });

    return res.redirect(`/course/single/${postId}`);
    // console.log(comment);
  } catch (err) {
    return res.send(err.message);
  }
};

module.exports = {
  index,
  author,
  postByCategories,
  singlePost,
  search,
  addComment,
};
