const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const citizenSchema = new mongoose.Schema({
  name: { type: String, required: true, match: /^[A-Za-z\s]+$/ },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  aadhaar: { type: String, required: true, unique: true, minlength: 12, maxlength: 12 },
  password: { type: String, required: true, minlength: 6 },
  state: { type: String, required: true },
  district: { type: String, required: true },
  address: { type: String },
  isVerified: { type: Boolean, default: false },
  role: { type: String, default: 'citizen' },
  createdAt: { type: Date, default: Date.now }
});

citizenSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

citizenSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Citizen', citizenSchema);
