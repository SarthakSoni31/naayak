const express = require('express');
const router = express.Router();
const { ensureAdhikari } = require('../../middleware/auth');
const Grievance = require('../../models/grievance');
const Adhikari = require('../../models/adhikari');

router.use(ensureAdhikari);

// ─── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const adhikariId = req.user._id;
    const deptId = req.user.department?._id || req.user.department;

    const [assigned, inProgress, resolved, highUrgency, recentGrievances] = await Promise.all([
      Grievance.countDocuments({ assignedTo: adhikariId, status: 'ASSIGNED' }),
      Grievance.countDocuments({ assignedTo: adhikariId, status: 'IN_PROGRESS' }),
      Grievance.countDocuments({ assignedTo: adhikariId, status: 'RESOLVED' }),
      Grievance.countDocuments({ department: deptId, urgency: 'HIGH', status: { $nin: ['RESOLVED', 'REJECTED'] } }),
      Grievance.find({ $or: [{ assignedTo: adhikariId }, { department: deptId }] })
        .sort({ createdAt: -1 }).limit(8)
        .populate('citizen', 'name district').lean()
    ]);

    res.render('adhikari/dashboard', {
      user: req.user,
      stats: { assigned, inProgress, resolved, highUrgency },
      recentGrievances,
      title: 'Adhikari Dashboard — Naayak'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
});

// ─── My Grievances ─────────────────────────────────────────────────────────────
router.get('/grievances', async (req, res) => {
  try {
    const adhikariId = req.user._id;
    const deptId = req.user.department?._id || req.user.department;
    const { status, urgency, view = 'mine' } = req.query;

    const filter = view === 'dept'
      ? { department: deptId }
      : { assignedTo: adhikariId };

    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;

    const grievances = await Grievance.find(filter)
      .sort({ urgency: 1, createdAt: -1 })  // HIGH urgency first
      .populate('citizen', 'name phone district')
      .lean();

    res.render('adhikari/grievances', {
      user: req.user, grievances,
      filters: { status, urgency, view },
      title: 'Grievances — Naayak Adhikari'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

// ─── Grievance Detail + Actions ────────────────────────────────────────────────
router.get('/grievances/:id', async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id)
      .populate('citizen', 'name email phone district state address')
      .populate('department', 'name')
      .populate('assignedTo', 'name designation')
      .lean();
    if (!grievance) return res.redirect('/adhikari/grievances');

    res.render('adhikari/grievance-detail', {
      user: req.user, grievance,
      title: `${grievance.grievanceId} — Naayak`
    });
  } catch (err) {
    res.redirect('/adhikari/grievances');
  }
});

// ─── Update Status ─────────────────────────────────────────────────────────────
router.post('/grievances/:id/update', async (req, res) => {
  try {
    const { status, message, resolutionNote } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.redirect('/adhikari/grievances');

    grievance.status = status;
    if (resolutionNote) grievance.resolutionNote = resolutionNote;
    if (status === 'RESOLVED') grievance.resolvedAt = new Date();
    if (status === 'IN_PROGRESS' && grievance.status === 'ASSIGNED') {
      // First time pickup
    }

    grievance.timeline.push({
      status,
      message: message || `Status updated to ${status}`,
      updatedBy: req.user.name,
      updatedByRole: 'adhikari'
    });

    await grievance.save();
    res.redirect(`/adhikari/grievances/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.redirect('/adhikari/grievances');
  }
});

// ─── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile', (req, res) => {
  res.render('adhikari/profile', { user: req.user, error: null, success: null, title: 'Profile — Naayak' });
});

module.exports = router;
