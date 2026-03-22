const express = require('express');
const router = express.Router();
const passport = require('passport');
const Admin = require('../../models/admin');
const Adhikari = require('../../models/adhikari');
const Citizen = require('../../models/citizen');
const Department = require('../../models/department');
const { redirectIfLoggedIn } = require('../../middleware/auth');

// ─── Landing ───────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    const t = req.user._type;
    return res.redirect(`/${t}/dashboard`);
  }
  res.redirect('/login');
});

// ─── Login Page ────────────────────────────────────────────────────────────────
router.get('/login', redirectIfLoggedIn, (req, res) => {
  const role = req.query.role || 'citizen';
  const error = req.query.error || null;
  res.render('auth/login', { role, error, title: 'Login — Naayak' });
});

// ─── Admin Login ───────────────────────────────────────────────────────────────
router.post('/login/admin', (req, res, next) => {
  passport.authenticate('admin-local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect(`/login?role=admin&error=${encodeURIComponent(info?.message || 'Login failed')}`);
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect('/admin/dashboard');
    });
  })(req, res, next);
});

// ─── Adhikari Login ────────────────────────────────────────────────────────────
router.post('/login/adhikari', (req, res, next) => {
  passport.authenticate('adhikari-local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect(`/login?role=adhikari&error=${encodeURIComponent(info?.message || 'Login failed')}`);
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect('/adhikari/dashboard');
    });
  })(req, res, next);
});

// ─── Citizen Login ─────────────────────────────────────────────────────────────
router.post('/login/citizen', (req, res, next) => {
  passport.authenticate('citizen-local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.redirect(`/login?role=citizen&error=${encodeURIComponent(info?.message || 'Login failed')}`);
    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect('/citizen/dashboard');
    });
  })(req, res, next);
});

// ─── Register Pages ────────────────────────────────────────────────────────────
router.get('/register/citizen', redirectIfLoggedIn, (req, res) => {
  res.render('auth/register-citizen', { error: null, success: null, title: 'Citizen Registration — Naayak' });
});

router.get('/register/adhikari', redirectIfLoggedIn, async (req, res) => {
  const departments = await Department.find({ isActive: true }).lean();
  res.render('auth/register-adhikari', { error: null, success: null, departments, title: 'Adhikari Registration — Naayak' });
});

// ─── Citizen Registration POST ─────────────────────────────────────────────────
router.post('/register/citizen', async (req, res) => {
  const { name, email, phone, aadhaar, password, confirmPassword, state, district, address } = req.body;

  if (password !== confirmPassword) {
    return res.render('auth/register-citizen', {
      error: 'Passwords do not match', success: null, title: 'Citizen Registration — Naayak'
    });
  }
  if (aadhaar.length !== 12 || !/^\d+$/.test(aadhaar)) {
    return res.render('auth/register-citizen', {
      error: 'Aadhaar must be exactly 12 digits', success: null, title: 'Citizen Registration — Naayak'
    });
  }

  try {
    const exists = await Citizen.findOne({ $or: [{ email }, { aadhaar }] });
    if (exists) {
      return res.render('auth/register-citizen', {
        error: 'Email or Aadhaar already registered', success: null, title: 'Citizen Registration — Naayak'
      });
    }
    await Citizen.create({ name, email, phone, aadhaar, password, state, district, address });
    res.render('auth/register-citizen', {
      error: null, success: 'Registration successful! You can now login.', title: 'Citizen Registration — Naayak'
    });
  } catch (err) {
    console.error(err);
    res.render('auth/register-citizen', {
      error: err.message || 'Registration failed. Try again.', success: null, title: 'Citizen Registration — Naayak'
    });
  }
});

// ─── Adhikari Registration POST ────────────────────────────────────────────────
router.post('/register/adhikari', async (req, res) => {
  const { name, email, phone, employeeId, password, confirmPassword, department, designation, state, district } = req.body;
  const departments = await Department.find({ isActive: true }).lean();

  if (password !== confirmPassword) {
    return res.render('auth/register-adhikari', {
      error: 'Passwords do not match', success: null, departments, title: 'Adhikari Registration — Naayak'
    });
  }

  try {
    const exists = await Adhikari.findOne({ $or: [{ email }, { employeeId }] });
    if (exists) {
      return res.render('auth/register-adhikari', {
        error: 'Email or Employee ID already registered', success: null, departments, title: 'Adhikari Registration — Naayak'
      });
    }
    await Adhikari.create({ name, email, phone, employeeId, password, department, designation, state, district });
    res.render('auth/register-adhikari', {
      error: null,
      success: 'Registration submitted! Await Admin approval before you can login.',
      departments,
      title: 'Adhikari Registration — Naayak'
    });
  } catch (err) {
    console.error(err);
    res.render('auth/register-adhikari', {
      error: err.message || 'Registration failed.', success: null, departments, title: 'Adhikari Registration — Naayak'
    });
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────────
router.get('/logout', (req, res, next) => {
  const type = req.user?._type || 'citizen';
  req.logout(err => {
    if (err) return next(err);
    res.redirect(`/login?role=${type}`);
  });
});

module.exports = router;
