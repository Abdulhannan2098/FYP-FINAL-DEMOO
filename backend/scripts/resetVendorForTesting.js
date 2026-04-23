const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MONGODB_URI } = require('../config/env');

async function resetVendorForTesting() {
  try {
    await mongoose.connect(MONGODB_URI);
    const User = require('../models/user');

    const email = 'abdulhannan05455@gmail.com';

    const user = await User.findOne({ email });

    if (!user) {
      console.log('❌ User not found with email:', email);
      await mongoose.disconnect();
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('RESETTING VENDOR FOR FRESH VERIFICATION TEST');
    console.log('='.repeat(60));
    console.log('User:', user.name);
    console.log('Email:', user.email);
    console.log('Current Status:', user.vendorStatus);

    // Clear all verification data
    const result = await User.updateOne(
      { email },
      {
        $set: {
          vendorStatus: 'pending_verification',
          vendorVerification: {
            cnicFront: null,
            cnicBack: null,
            selfieImage: null,
            ntnDocument: null,
            extractedCnicNumber: null,
            extractedCnicName: null,
            ocrConfidence: null,
            nameMatchScore: null,
            faceMatchScore: null,
            verificationAttempts: 0,
            lastAttemptDate: null,
            attemptLog: [],
            rejectionReason: null,
          },
        },
      }
    );

    // Also delete uploaded verification images
    const uploadsDir = path.join(__dirname, '../uploads/verification');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const userFiles = files.filter(f => f.startsWith(user._id.toString()));

      userFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        fs.unlinkSync(filePath);
        console.log('✓ Deleted:', file);
      });

      if (userFiles.length === 0) {
        console.log('No uploaded files found for this user');
      }
    }

    if (result.modifiedCount > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('✓ VENDOR RESET SUCCESSFULLY');
      console.log('='.repeat(60));
      console.log('• Vendor status: pending_verification');
      console.log('• Verification attempts: 0');
      console.log('• All verification data cleared');
      console.log('• Uploaded images deleted');
      console.log('\nYou can now test verification from scratch.');
    } else {
      console.log('No changes made.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

resetVendorForTesting();
