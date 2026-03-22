// middleware/auth.js

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user._type === 'admin') return next();
  if (req.xhr || req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/login?role=admin&error=Please login as Admin');
};

const ensureAdhikari = (req, res, next) => {
  if (req.isAuthenticated() && req.user._type === 'adhikari') return next();
  if (req.xhr || req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/login?role=adhikari&error=Please login as Adhikari');
};

const ensureCitizen = (req, res, next) => {
  if (req.isAuthenticated() && req.user._type === 'citizen') return next();
  if (req.xhr || req.path.startsWith('/api')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/login?role=citizen&error=Please login to continue');
};

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

// Redirect logged-in users away from login/register pages
const redirectIfLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) return next();
  const type = req.user._type;
  if (type === 'admin') return res.redirect('/admin/dashboard');
  if (type === 'adhikari') return res.redirect('/adhikari/dashboard');
  if (type === 'citizen') return res.redirect('/citizen/dashboard');
  next();
};

module.exports = { ensureAdmin, ensureAdhikari, ensureCitizen, ensureAuthenticated, redirectIfLoggedIn };
