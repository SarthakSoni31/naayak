const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  status: { type: String },
  message: { type: String },
  updatedBy: { type: String },
  updatedByRole: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const grievanceSchema = new mongoose.Schema({
  grievanceId: { type: String, unique: true }, // e.g. NKG-2024-00001
  citizen: { type: mongoose.Schema.Types.ObjectId, ref: 'Citizen', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  language: { type: String, default: 'en' },
  originalText: { type: String }, // original if non-English
  
  // AI Classification
  category: {
    type: String,
    enum: ['Infrastructure', 'Health', 'Utilities', 'Education', 'Sanitation', 'Police', 'Revenue', 'Agriculture', 'Other'],
    default: 'Other'
  },
  urgency: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'LOW'
  },
  aiConfidence: { type: Number, default: 0 }, // 0-100

  // Routing
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Adhikari' },

  // Status
  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'ESCALATED'],
    default: 'PENDING'
  },

  // Location
  state: { type: String },
  district: { type: String },
  location: { type: String },

  // Attachments
  attachments: [String],

  // Resolution
  resolutionNote: { type: String },
  resolvedAt: { type: Date },

  // Timeline
  timeline: [timelineSchema],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate grievanceId
grievanceSchema.pre('save', async function (next) {
  if (!this.grievanceId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Grievance').countDocuments();
    this.grievanceId = `NKG-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Grievance', grievanceSchema);
