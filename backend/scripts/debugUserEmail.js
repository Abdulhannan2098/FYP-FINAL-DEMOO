require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildLooseEmailRegex = (rawEmail) => {
  const normalized = (rawEmail || '').trim().toLowerCase();
  return new RegExp(`^\\s*${escapeRegex(normalized)}\\s*$`, 'i');
};

(async () => {
  const emails = process.argv.slice(2);
  if (!emails.length) {
    console.error('Usage: node scripts/debugUserEmail.js <email1> <email2> ...');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  for (const inputEmail of emails) {
    const normalized = (inputEmail || '').trim().toLowerCase();
    const regex = buildLooseEmailRegex(inputEmail);

    const exact = await User.findOne({ email: normalized }).select('email role authProvider isActive');
    const loose = await User.find({ email: { $regex: regex } }).select('email role authProvider isActive');

    console.log('\n====', inputEmail, '====');
    console.log('normalized:', normalized);
    console.log('exactMatch:', exact ? { id: String(exact._id), email: exact.email, role: exact.role } : null);
    console.log('looseMatches:', loose.map((u) => ({ id: String(u._id), email: u.email, role: u.role })));
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
