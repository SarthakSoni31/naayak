/**
 * NAAYAK — Seed Script
 * Run: node seed.js
 *
 * Creates:
 *  1. Default Admin account
 *  2. All standard government departments
 *  3. Sample Adhikari (auto-approved)
 *  4. Sample Citizen
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Admin = require('./models/admin');
const Adhikari = require('./models/adhikari');
const Citizen = require('./models/citizen');
const Department = require('./models/department');

mongoose.connect('mongodb://127.0.0.1:27017/naayak', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => { console.error('❌ DB Error:', err); process.exit(1); });

const DEPARTMENTS = [
  { name: 'Public Works Department', code: 'PWD',        description: 'Roads, bridges, public infrastructure', categories: ['Infrastructure'] },
  { name: 'Health Ministry',         code: 'HEALTH',     description: 'Hospitals, clinics, medical services',  categories: ['Health'] },
  { name: 'Utilities Department',    code: 'UTILITIES',  description: 'Water, electricity, gas supply',        categories: ['Utilities'] },
  { name: 'Education Department',    code: 'EDUCATION',  description: 'Schools, colleges, scholarships',       categories: ['Education'] },
  { name: 'Sanitation Department',   code: 'SANITATION', description: 'Garbage collection, cleanliness',       categories: ['Sanitation'] },
  { name: 'Police Department',       code: 'POLICE',     description: 'Crime, safety, law enforcement',        categories: ['Police'] },
  { name: 'Revenue Department',      code: 'REVENUE',    description: 'Land records, property, taxes',         categories: ['Revenue'] },
  { name: 'Agriculture Department',  code: 'AGRICULTURE',description: 'Farming, irrigation, crop support',     categories: ['Agriculture'] },
  { name: 'General Administration',  code: 'GENERAL',    description: 'Miscellaneous grievances',              categories: ['Other'] },
];

async function seed() {
  try {
    // ─── Clear existing ────────────────────────────────────────────────
    await Promise.all([
      Admin.deleteMany({}),
      Department.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing admin + departments');

    // ─── Create Admin ──────────────────────────────────────────────────
    const admin = await Admin.create({
      name: 'System Administrator',
      email: 'admin@naayak.gov.in',
      password: 'Admin@1234',   // hashed by pre-save hook
      role: 'admin'
    });
    console.log('✅ Admin created');
    console.log('   Email   : admin@naayak.gov.in');
    console.log('   Password: Admin@1234');

    // ─── Create Departments ────────────────────────────────────────────
    const depts = await Department.insertMany(DEPARTMENTS);
    console.log(`✅ ${depts.length} departments created`);

    const pwdDept = depts.find(d => d.code === 'PWD');

    // ─── Sample Citizen ────────────────────────────────────────────────
    const existingCitizen = await Citizen.findOne({ email: 'citizen@test.com' });
    if (!existingCitizen) {
      await Citizen.create({
        name: 'Ramesh Kumar',
        email: 'citizen@test.com',
        phone: '9876543210',
        aadhaar: '123456789012',
        password: 'Citizen@1234',
        state: 'Punjab',
        district: 'Amritsar',
        address: '123 Main Street, Amritsar'
      });
      console.log('✅ Sample citizen created');
      console.log('   Email   : citizen@test.com');
      console.log('   Password: Citizen@1234');
    }

    // ─── Sample Adhikari ───────────────────────────────────────────────
    const existingAdhikari = await Adhikari.findOne({ email: 'officer@naayak.gov.in' });
    if (!existingAdhikari) {
      await Adhikari.create({
        name: 'Suresh Singh',
        email: 'officer@naayak.gov.in',
        phone: '9876500001',
        employeeId: 'GOV-PB-2024-0001',
        password: 'Officer@1234',
        department: pwdDept._id,
        designation: 'Executive Engineer',
        state: 'Punjab',
        district: 'Amritsar',
        isApproved: true
      });
      console.log('✅ Sample adhikari created (pre-approved)');
      console.log('   Email   : officer@naayak.gov.in');
      console.log('   Password: Officer@1234');
    }

    console.log('\n🚀 Seed complete! Run: npm run dev\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' URL     : http://localhost:3000');
    console.log(' Admin   : /login → Admin tab');
    console.log(' Officer : /login → Adhikari tab');
    console.log(' Citizen : /login → Citizen tab');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
