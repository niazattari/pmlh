const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: false },
  registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: false },
  name: { type: String, required: true },
  email: { type: String, required: true },
  batchNo: { type: String },
  dateOfCompletion: { type: Date },
  certificateNumber: { type: String, required: true, unique: true },
  certificateFile: { type: String }, // filename stored in /uploads
  verificationLink: String,
  qrCode: String,
  adminNotes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

CertificateSchema.index({ certificateNumber: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
