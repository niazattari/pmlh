const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-aggregate-paginate-v2');

const categorySchema = mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    post:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"post"
    }
},
{timestamps: true}
)

categorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model('category', categorySchema)
