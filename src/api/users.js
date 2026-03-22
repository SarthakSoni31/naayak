const express = require('express');
const router = express.Router();
const Citizen = require('../../models/citizen');
const Adhikari = require('../../models/adhikari');
const { ensureAdmin } = require('../../middleware/auth');

router.get('/citizens', ensureAdmin, async (req, res) => {
  const citizens = await Citizen.find().select('-password').lean();
  res.json({ success: true, citizens });
});

router.get('/adhikaris', ensureAdmin, async (req, res) => {
  const adhikaris = await Adhikari.find().populate('department', 'name').select('-password').lean();
  res.json({ success: true, adhikaris });
});

module.exports = router;
