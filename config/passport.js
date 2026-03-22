const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Admin = require('../models/admin');
const Adhikari = require('../models/adhikari');
const Citizen = require('../models/citizen');

module.exports = function setupPassport() {

  // ─── Admin Strategy ────────────────────────────────────────────────
  passport.use('admin-local', new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) return done(null, false, { message: 'Invalid credentials' });
        const match = await admin.comparePassword(password);
        if (!match) return done(null, false, { message: 'Invalid credentials' });
        return done(null, { ...admin.toObject(), _type: 'admin' });
      } catch (err) {
        return done(err);
      }
    }
  ));

  // ─── Adhikari Strategy ─────────────────────────────────────────────
  passport.use('adhikari-local', new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const adhikari = await Adhikari.findOne({ email: email.toLowerCase() }).populate('department');
        if (!adhikari) return done(null, false, { message: 'Invalid credentials' });
        if (!adhikari.isApproved) return done(null, false, { message: 'Account pending admin approval' });
        const match = await adhikari.comparePassword(password);
        if (!match) return done(null, false, { message: 'Invalid credentials' });
        return done(null, { ...adhikari.toObject(), _type: 'adhikari' });
      } catch (err) {
        return done(err);
      }
    }
  ));

  // ─── Citizen Strategy ──────────────────────────────────────────────
  passport.use('citizen-local', new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const citizen = await Citizen.findOne({ email: email.toLowerCase() });
        if (!citizen) return done(null, false, { message: 'Invalid credentials' });
        const match = await citizen.comparePassword(password);
        if (!match) return done(null, false, { message: 'Invalid credentials' });
        return done(null, { ...citizen.toObject(), _type: 'citizen' });
      } catch (err) {
        return done(err);
      }
    }
  ));

  // ─── Serialize / Deserialize ───────────────────────────────────────
  passport.serializeUser((user, done) => {
    done(null, { id: user._id, type: user._type });
  });

  passport.deserializeUser(async ({ id, type }, done) => {
    try {
      let user;
      if (type === 'admin') user = await Admin.findById(id);
      else if (type === 'adhikari') user = await Adhikari.findById(id).populate('department');
      else if (type === 'citizen') user = await Citizen.findById(id);
      if (!user) return done(null, false);
      done(null, { ...user.toObject(), _type: type });
    } catch (err) {
      done(err);
    }
  });
};
