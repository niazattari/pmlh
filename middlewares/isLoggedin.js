const jwt = require('jsonwebtoken')
const userModel = require("../models/userModel")


const isLoggedIn = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    let decode = jwt.verify(token, process.env.JWT_KEY)
    
    if (!req.cookies.token || !decode) {
        return res.redirect('/')
    }
    next();
  }
  catch (error) {
    console.log(error)
    return res.redirect('/')
  }
}

module.exports = isLoggedIn