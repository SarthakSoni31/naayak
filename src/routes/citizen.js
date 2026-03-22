const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { ensureCitizen } = require('../../middleware/auth');
const Grievance = require('../../models/grievance');
const Department = require('../../models/department');
const { classifyGrievance } = require('../../helpers/classifier');

// Multer for attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/grievances'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only images and PDFs allowed'));
  }
});

router.use(ensureCitizen);

// ─── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const citizenId = req.user._id;
    const [total, pending, resolved, inProgress, recent] = await Promise.all([
      Grievance.countDocuments({ citizen: citizenId }),
      Grievance.countDocuments({ citizen: citizenId, status: 'PENDING' }),
      Grievance.countDocuments({ citizen: citizenId, status: 'RESOLVED' }),
      Grievance.countDocuments({ citizen: citizenId, status: 'IN_PROGRESS' }),
      Grievance.find({ citizen: citizenId }).sort({ createdAt: -1 }).limit(5)
        .populate('department', 'name').lean()
    ]);

    res.render('citizen/dashboard', {
      user: req.user,
      stats: { total, pending, resolved, inProgress },
      recent,
      title: 'My Dashboard — Naayak'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
});

// ─── File New Grievance ────────────────────────────────────────────────────────
router.get('/grievance/new', (req, res) => {
  res.render('citizen/new-grievance', { user: req.user, error: null, title: 'File Grievance — Naayak' });
});

router.post('/grievance/new', upload.array('attachments', 3), async (req, res) => {
  try {
    const { title, description, language, state, district, location } = req.body;
    const citizenId = req.user._id;

    // AI Classification
    const classification = classifyGrievance(`${title} ${description}`);

    // Auto-find department
    const dept = await Department.findOne({ code: classification.suggestedDeptCode, isActive: true });

    const attachments = req.files ? req.files.map(f => '/uploads/grievances/' + f.filename) : [];

    const grievance = await Grievance.create({
      citizen: citizenId,
      title,
      description,
      language: language || 'en',
      category: classification.category,
      urgency: classification.urgency,
      aiConfidence: classification.confidence,
      department: dept?._id || null,
      state: state || req.user.state,
      district: district || req.user.district,
      location,
      attachments,
      status: dept ? 'ASSIGNED' : 'PENDING',
      timeline: [{
        status: dept ? 'ASSIGNED' : 'PENDING',
        message: `Grievance filed. AI classified as: ${classification.category} (${classification.urgency} urgency). ${dept ? `Auto-routed to ${dept.name}` : 'Awaiting admin routing'}`,
        updatedBy: req.user.name,
        updatedByRole: 'citizen'
      }]
    });

    res.redirect(`/citizen/grievance/${grievance._id}?success=Grievance filed successfully! ID: ${grievance.grievanceId}`);
  } catch (err) {
    console.error(err);
    res.render('citizen/new-grievance', {
      user: req.user, error: err.message || 'Failed to file grievance', title: 'File Grievance — Naayak'
    });
  }
});

// ─── AI Preview (AJAX) ─────────────────────────────────────────────────────────
router.post('/grievance/classify', (req, res) => {
  const { text } = req.body;
  const result = classifyGrievance(text || '');
  res.json(result);
});

// ─── My Grievances ─────────────────────────────────────────────────────────────
router.get('/grievances', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { citizen: req.user._id };
    if (status) filter.status = status;

    const grievances = await Grievance.find(filter)
      .sort({ createdAt: -1 })
      .populate('department', 'name code')
      .lean();

    res.render('citizen/grievances', {
      user: req.user, grievances,
      filters: { status },
      title: 'My Grievances — Naayak'
    });
  } catch (err) {
    res.status(500).send('Error');
  }
});

// ─── Track Single ──────────────────────────────────────────────────────────────
router.get('/grievance/:id', async (req, res) => {
  try {
    const grievance = await Grievance.findOne({ _id: req.params.id, citizen: req.user._id })
      .populate('department', 'name code')
      .populate('assignedTo', 'name designation')
      .lean();
    if (!grievance) return res.redirect('/citizen/grievances');

    const success = req.query.success || null;
    res.render('citizen/grievance-detail', {
      user: req.user, grievance, success,
      title: `${grievance.grievanceId} — Naayak`
    });
  } catch (err) {
    res.redirect('/citizen/grievances');
  }
});

// ─── Track by ID (public style) ────────────────────────────────────────────────
router.get('/track', (req, res) => {
  res.render('citizen/track', { user: req.user, grievance: null, error: null, title: 'Track Grievance — Naayak' });
});

router.post('/track', async (req, res) => {
  try {
    const { grievanceId } = req.body;
    const grievance = await Grievance.findOne({ grievanceId: grievanceId.trim().toUpperCase() })
      .populate('department', 'name')
      .lean();

    res.render('citizen/track', {
      user: req.user,
      grievance: grievance || null,
      error: grievance ? null : 'No grievance found with this ID',
      title: 'Track Grievance — Naayak'
    });
  } catch (err) {
    res.render('citizen/track', { user: req.user, grievance: null, error: 'Error tracking grievance', title: 'Track — Naayak' });
  }
});

// ─── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile', (req, res) => {
  res.render('citizen/profile', { user: req.user, error: null, success: null, title: 'My Profile — Naayak' });
});

module.exports = router;
