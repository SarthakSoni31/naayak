const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const passport = require('passport');
const cors = require('cors');

const setupPassport = require('./config/passport');

// Route imports
const adminRoutes = require('./src/routes/admin');
const adhikariRoutes = require('./src/routes/adhikari');
const citizenRoutes = require('./src/routes/citizen');
const authRoutes = require('./src/routes/auth');

// API imports
const grievanceApi = require('./src/api/grievances');
const departmentApi = require('./src/api/departments');
const userApi = require('./src/api/users');

const app = express();

// ─── DB ────────────────────────────────────────────────────────────────────────
mongoose.connect('mongodb://127.0.0.1:27017/naayak', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected — Naayak DB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Sessions ─────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'naayak-secret-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: 'mongodb://127.0.0.1:27017/naayak',
    ttl: 14 * 24 * 60 * 60,
    autoRemove: 'native'
  }),
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 14 * 24 * 60 * 60 * 1000
  }
}));

// ─── Passport ─────────────────────────────────────────────────────────────────
setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// ─── Locals ───────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/adhikari', adhikariRoutes);
app.use('/citizen', citizenRoutes);

// API
app.use('/api/grievances', grievanceApi);
app.use('/api/departments', departmentApi);
app.use('/api/users', userApi);

// Root redirect
app.get('/', (req, res) => res.redirect('/login'));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Naayak running at http://localhost:${PORT}`);
});
