const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-aggregate-paginate-v2");
const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    fatherName: {
      type: String,
    },
    contactNo: {
      type: String,
    },
    qualificaiton: {
      type: String,
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    country: {
      type: String,
    },
    address: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    profileImage:{
        type:String,
        required:true
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

contactSchema.plugin(mongoosePaginate);
const contact = mongoose.model("contactModel", contactSchema);

module.exports = contact;
