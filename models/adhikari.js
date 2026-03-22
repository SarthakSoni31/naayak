const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adhikariSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  designation: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  isApproved: { type: Boolean, default: false }, // Admin must approve
  role: { type: String, default: 'adhikari' },
  createdAt: { type: Date, default: Date.now }
});

adhikariSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adhikariSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Adhikari', adhikariSchema);
