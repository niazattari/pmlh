var jwt = require('jsonwebtoken');

const generateToken = (user) =>{
    // Ensure we include a dependable id in the token payload.
    const idValue = (user && (user._id || user.id)) ? (user._id ? user._id.toString() : user.id) : null;
    return jwt.sign({ user: user && user.email, name: user && user.username, id: idValue }, process.env.JWT_KEY, { expiresIn: '3h' });
}
module.exports = generateToken;