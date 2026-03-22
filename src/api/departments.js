const express = require('express');
const router = express.Router();
const Department = require('../../models/department');
const Adhikari = require('../../models/adhikari');

router.get('/', async (req, res) => {
  const departments = await Department.find({ isActive: true }).lean();
  res.json({ success: true, departments });
});

router.get('/:id/officers', async (req, res) => {
  const adhikaris = await Adhikari.find({ department: req.params.id, isApproved: true })
    .select('name designation').lean();
  res.json({ success: true, adhikaris });
});

module.exports = router;
