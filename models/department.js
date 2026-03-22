const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String },
  categories: [String], // grievance categories this dept handles
  headOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'Adhikari' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Department', departmentSchema);
