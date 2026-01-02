const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-aggregate-paginate-v2');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        maxlength: [70, 'title must be less than 70 characters long']
    },
    description: {
        type: String,
        required: true,
        maxlength: [1000, 'description must be less than 1000 characters long']
    },
    date: {
        type: Date,
        default: Date.now
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category"
    },
    image: {
        type: String,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },
    status: {
        type: Boolean,
        default: true
    },
    // Course-specific fields
    courseDetails: {
        duration: String,
        startDate: Date,
        level: String,
        mode: String,
        fee: String,
        language: String,
        prerequisites: [String],
        syllabusFile: String,
        totalEnrolment: {
            type: Number,
            default: 0
        },
        courseDescription: String
    }
});

postSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('post', postSchema);