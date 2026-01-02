const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    // matches model name exported in models/postModel.js
    ref: 'post',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    // matches model name exported in models/userModel.js
    ref: 'user',
    // make optional so anonymous registrations can be stored with registrant info
    // required: true
  },
  registrantName: {
    type: String,
    default: null
  },
  registrantEmail: {
    type: String,
    default: null
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'deleted', 'cancelled'],
    default: 'pending'
  }
  ,
  paymentMethod: {
    type: String,
    enum: ['JazzCash', 'EasyPaisa', 'Card', 'Other'],
    default: 'Other'
  },
  paymentProof: {
    // stored filename or relative path under /uploads
    type: String,
    default: null
  },
  certificate: {
    // filename stored under /uploads/certificates or /uploads
    type: String,
    default: null
  },
  certificateNumber: {
    // if admin issues a certificate, store the public cert number here for quick lookup & verification
    type: String,
    default: null
  },
  courseContent: {
    // filename for course content PDF uploaded by admin after confirmation
    type: String,
    default: null
  },
  emailSent: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Registration', registrationSchema);
