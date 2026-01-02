
// models/PasswordReset.js
const mongoose = require('mongoose');

const PasswordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    codeHash: { type: String, required: true }, // hash of 6-digit code
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }, // when code/token expire
    attempts: { type: Number, default: 0 },    // OTP attempts counter
  },
  { timestamps: true }
);

// Auto-delete the doc after expiration time
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordReset', PasswordResetSchema);
