const mongoose = require('mongoose')
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true,
        },
    },
)
userSchema.plugin(aggregatePaginate);

module.exports = mongoose.model('user', userSchema)
