const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGODB_URI } = require('../config/env');

async function resetPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = require('../models/user');

    const email = 'abdulhannan05455@gmail.com';
    const newPassword = 'Test@1234';

    const user = await User.findOne({ email });

    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      return;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password directly
    await User.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    console.log('✓ Password reset successful!');
    console.log('');
    console.log('You can now login with:');
    console.log('  Email: abdul.hannan05455@gmail.com');
    console.log('  Password: Test@1234');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetPassword();
