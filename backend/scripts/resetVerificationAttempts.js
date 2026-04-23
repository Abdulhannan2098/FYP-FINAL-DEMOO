const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');

async function resetAttempts() {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = require('../models/user');

    const email = 'abdulhannan05455@gmail.com';

    const result = await User.updateOne(
      { email },
      {
        $set: {
          'vendorVerification.verificationAttempts': 0,
          'vendorVerification.lastAttemptDate': null,
          'vendorStatus': 'pending_verification'
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✓ Verification attempts reset successfully!');
      console.log('✓ Vendor status set to pending_verification');
      console.log('\nYou can now retry verification.');
    } else {
      console.log('No changes made. User may not exist.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetAttempts();
