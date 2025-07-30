const mongoose = require('mongoose')
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const commentSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default: Date.now
    },
    postId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'post'
    }
}
)
commentSchema.plugin(aggregatePaginate);

module.exports = mongoose.model('comment', commentSchema)