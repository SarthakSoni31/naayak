const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../../middleware/auth');
const Admin = require('../../models/admin');
const Citizen = require('../../models/citizen');
const Adhikari = require('../../models/adhikari');
const Grievance = require('../../models/grievance');
const Department = require('../../models/department');

// All admin routes require admin auth
router.use(ensureAdmin);

// ─── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalGrievances, pendingGrievances, resolvedGrievances, highUrgency,
      totalCitizens, totalAdhikari, pendingAdhikari,
      recentGrievances, deptStats
    ] = await Promise.all([
      Grievance.countDocuments(),
      Grievance.countDocuments({ status: 'PENDING' }),
      Grievance.countDocuments({ status: 'RESOLVED' }),
      Grievance.countDocuments({ urgency: 'HIGH', status: { $nin: ['RESOLVED', 'REJECTED'] } }),
      Citizen.countDocuments(),
      Adhikari.countDocuments({ isApproved: true }),
      Adhikari.countDocuments({ isApproved: false }),
      Grievance.find().sort({ createdAt: -1 }).limit(8).populate('citizen', 'name district').populate('department', 'name').lean(),
      Grievance.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.render('admin/dashboard', {
      user: req.user,
      stats: { totalGrievances, pendingGrievances, resolvedGrievances, highUrgency, totalCitizens, totalAdhikari, pendingAdhikari },
      recentGrievances,
      deptStats,
      title: 'Admin Dashboard — Naayak'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading dashboard');
  }
});

// ─── Grievances ────────────────────────────────────────────────────────────────
router.get('/grievances', async (req, res) => {
  try {
    const { status, urgency, category, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (urgency) filter.urgency = urgency;
    if (category) filter.category = category;

    const limit = 15;
    const skip = (parseInt(page) - 1) * limit;

    const [grievances, total, departments] = await Promise.all([
      Grievance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('citizen', 'name phone district')
        .populate('department', 'name code')
        .populate('assignedTo', 'name')
        .lean(),
      Grievance.countDocuments(filter),
      Department.find({ isActive: true }).lean()
    ]);

    res.render('admin/grievances', {
      user: req.user, grievances, departments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      filters: { status, urgency, category },
      title: 'Grievances — Naayak Admin'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading grievances');
  }
});

// Single grievance detail + action
router.get('/grievances/:id', async (req, res) => {
  try {
    const grievance = await Grievance.findById(req.params.id)
      .populate('citizen', 'name email phone district state aadhaar')
      .populate('department', 'name code')
      .populate('assignedTo', 'name email designation')
      .lean();
    if (!grievance) return res.redirect('/admin/grievances');

    const departments = await Department.find({ isActive: true }).lean();
    const adhikaris = grievance.department
      ? await Adhikari.find({ department: grievance.department._id, isApproved: true }).lean()
      : [];

    res.render('admin/grievance-detail', {
      user: req.user, grievance, departments, adhikaris,
      title: `${grievance.grievanceId} — Naayak Admin`
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/grievances');
  }
});

// Assign grievance to dept + officer
router.post('/grievances/:id/assign', async (req, res) => {
  try {
    const { department, assignedTo, urgency } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    if (!grievance) return res.redirect('/admin/grievances');

    grievance.department = department;
    grievance.assignedTo = assignedTo || null;
    if (urgency) grievance.urgency = urgency;
    grievance.status = 'ASSIGNED';
    grievance.timeline.push({
      status: 'ASSIGNED',
      message: `Assigned to department by Admin. Officer: ${assignedTo ? 'Assigned' : 'Pending'}`,
      updatedBy: req.user.name,
      updatedByRole: 'admin'
    });

    await grievance.save();
    res.redirect(`/admin/grievances/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.redirect('/admin/grievances');
  }
});

// Update status
router.post('/grievances/:id/status', async (req, res) => {
  try {
    const { status, message } = req.body;
    const grievance = await Grievance.findById(req.params.id);
    grievance.status = status;
    if (status === 'RESOLVED') grievance.resolvedAt = new Date();
    grievance.timeline.push({
      status,
      message: message || `Status updated to ${status}`,
      updatedBy: req.user.name,
      updatedByRole: 'admin'
    });
    await grievance.save();
    res.redirect(`/admin/grievances/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.redirect('/admin/grievances');
  }
});

// ─── Adhikari Management ───────────────────────────────────────────────────────
router.get('/adhikaris', async (req, res) => {
  try {
    const { approved } = req.query;
    const filter = {};
    if (approved === 'false') filter.isApproved = false;
    else if (approved === 'true') filter.isApproved = true;

    const adhikaris = await Adhikari.find(filter).populate('department', 'name code').lean();
    res.render('admin/adhikaris', { user: req.user, adhikaris, filters: { approved }, title: 'Officers — Naayak Admin' });
  } catch (err) {
    res.status(500).send('Error loading adhikaris');
  }
});

// Approve adhikari
router.post('/adhikaris/:id/approve', async (req, res) => {
  await Adhikari.findByIdAndUpdate(req.params.id, { isApproved: true });
  res.redirect('/admin/adhikaris?approved=false');
});

// Reject/delete adhikari
router.post('/adhikaris/:id/reject', async (req, res) => {
  await Adhikari.findByIdAndDelete(req.params.id);
  res.redirect('/admin/adhikaris?approved=false');
});

// ─── Citizens ──────────────────────────────────────────────────────────────────
router.get('/citizens', async (req, res) => {
  try {
    const citizens = await Citizen.find().sort({ createdAt: -1 }).lean();
    res.render('admin/citizens', { user: req.user, citizens, title: 'Citizens — Naayak Admin' });
  } catch (err) {
    res.status(500).send('Error');
  }
});

// ─── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find().lean();
    const withCounts = await Promise.all(departments.map(async d => ({
      ...d,
      grievanceCount: await Grievance.countDocuments({ department: d._id }),
      officerCount: await Adhikari.countDocuments({ department: d._id, isApproved: true })
    })));
    res.render('admin/departments', { user: req.user, departments: withCounts, title: 'Departments — Naayak Admin' });
  } catch (err) {
    res.status(500).send('Error');
  }
});

router.get('/departments/new', (req, res) => {
  res.render('admin/department-form', { user: req.user, department: null, error: null, title: 'New Department — Naayak Admin' });
});

router.post('/departments/new', async (req, res) => {
  try {
    const { name, code, description, categories } = req.body;
    const cats = Array.isArray(categories) ? categories : categories ? [categories] : [];
    await Department.create({ name, code: code.toUpperCase(), description, categories: cats });
    res.redirect('/admin/departments');
  } catch (err) {
    res.render('admin/department-form', { user: req.user, department: req.body, error: err.message, title: 'New Department' });
  }
});

router.get('/departments/edit/:id', async (req, res) => {
  const department = await Department.findById(req.params.id).lean();
  res.render('admin/department-form', { user: req.user, department, error: null, title: 'Edit Department — Naayak Admin' });
});

router.post('/departments/edit/:id', async (req, res) => {
  try {
    const { name, code, description, categories, isActive } = req.body;
    const cats = Array.isArray(categories) ? categories : categories ? [categories] : [];
    await Department.findByIdAndUpdate(req.params.id, {
      name, code: code.toUpperCase(), description, categories: cats,
      isActive: isActive === 'on'
    });
    res.redirect('/admin/departments');
  } catch (err) {
    res.redirect('/admin/departments');
  }
});

// ─── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics', async (req, res) => {
  try {
    const [byCategory, byUrgency, byStatus, byDistrict, monthly] = await Promise.all([
      Grievance.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $group: { _id: '$urgency', count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Grievance.aggregate([{ $group: { _id: '$district', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Grievance.aggregate([
        { $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ])
    ]);

    res.render('admin/analytics', {
      user: req.user,
      byCategory: JSON.stringify(byCategory),
      byUrgency: JSON.stringify(byUrgency),
      byStatus: JSON.stringify(byStatus),
      byDistrict: JSON.stringify(byDistrict),
      monthly: JSON.stringify(monthly),
      title: 'Analytics — Naayak Admin'
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading analytics');
  }
});

module.exports = router;
