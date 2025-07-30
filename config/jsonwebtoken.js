var jwt = require('jsonwebtoken');

const generateToken = (user) =>{
    return jwt.sign({ user : user.email, name: user.username, id : user.id }, process.env.JWT_KEY, {expiresIn: '3h'} )
}
module.exports = generateToken;