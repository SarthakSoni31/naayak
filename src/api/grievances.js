const express = require('express');
const router = express.Router();
const Grievance = require('../../models/grievance');
const Department = require('../../models/department');
const { ensureAuthenticated } = require('../../middleware/auth');

router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const filter = {};
    if (req.user._type === 'citizen') filter.citizen = req.user._id;
    else if (req.user._type === 'adhikari') {
      filter.$or = [
        { assignedTo: req.user._id },
        { department: req.user.department?._id || req.user.department }
      ];
    }
    const grievances = await Grievance.find(filter).populate('citizen', 'name').populate('department', 'name').lean();
    res.json({ success: true, grievances });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/stats', ensureAuthenticated, async (req, res) => {
  try {
    const stats = await Grievance.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
