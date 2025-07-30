const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");
const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    message: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

contactSchema.plugin(mongoosePaginate);
const message = mongoose.model("messageModel", contactSchema);

module.exports = message;
