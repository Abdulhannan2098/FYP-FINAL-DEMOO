const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');

async function testLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = require('../models/user');

    const email = 'abdul.hannan05455@gmail.com';
    const password = 'Test@1234';

    // Normalize email like the login function does
    const normalizedEmail = email.toLowerCase().split('@')[0].replace(/\./g, '').split('+')[0] + '@gmail.com';

    console.log('Testing login for:', normalizedEmail);
    console.log('Password:', password);
    console.log('');

    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.log('❌ User NOT FOUND');
      await mongoose.disconnect();
      return;
    }

    console.log('✓ User found:', user.name);
    console.log('  Has password hash:', !!user.password);

    // Test password
    const isMatch = await user.comparePassword(password);

    if (isMatch) {
      console.log('✓ Password is CORRECT!');
      console.log('\nLogin should work. The issue is likely on the frontend.');
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('\nThe password "Test@1234" does not match what was set during registration.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testLogin();
