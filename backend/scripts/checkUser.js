const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');

async function checkUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = require('../models/user');

    // Email normalization for Gmail
    const email = 'abdul.hannan05455@gmail.com';
    const normalizedEmail = email.toLowerCase().split('@')[0].replace(/\./g, '').split('+')[0] + '@gmail.com';

    console.log('Searching for:');
    console.log('  Original:', email);
    console.log('  Normalized:', normalizedEmail);
    console.log('');

    // Search by both original and normalized
    const user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { email: normalizedEmail }
      ]
    });

    if (!user) {
      console.log('USER NOT FOUND!');
      console.log('\nThe user with this email does not exist in the database.');
      console.log('Please register first using the vendor registration flow.');
    } else {
      console.log('USER FOUND:');
      console.log('  ID:', user._id);
      console.log('  Name:', user.name);
      console.log('  Email (stored):', user.email);
      console.log('  Role:', user.role);
      console.log('  Email Verified:', user.emailVerified);
      console.log('  Phone:', user.phone);
      console.log('  Phone Verified:', user.phoneVerified);
      console.log('  Vendor Status:', user.vendorStatus);
      console.log('  Auth Provider:', user.authProvider || 'local');

      // Diagnose login issues
      console.log('\n--- LOGIN DIAGNOSIS ---');
      if (user.role === 'vendor') {
        if (!user.emailVerified) {
          console.log('❌ ISSUE: Email is NOT verified');
          console.log('   Solution: Verify email first before logging in');
        } else {
          console.log('✓ Email is verified');
        }

        if (!user.phoneVerified) {
          console.log('❌ ISSUE: Phone is NOT verified');
          console.log('   Solution: Verify phone number before logging in');
        } else {
          console.log('✓ Phone is verified');
        }

        if (user.emailVerified && user.phoneVerified) {
          console.log('\n✓ All verifications passed. Login should work.');
          console.log('  If still failing, check password is correct.');
        }
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkUser();
