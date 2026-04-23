const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MONGODB_URI } = require('../config/env');

async function run() {
  await mongoose.connect(MONGODB_URI);
  const User = require('../models/user');
  const Product = require('../models/Product');
  const Order = require('../models/Order');
  const Review = require('../models/Review');
  const Wishlist = require('../models/Wishlist');
  const Session = require('../models/Session');
  const Conversation = require('../models/Conversation');
  const Message = require('../models/Message');

  const targetEmail = 'abdul.hannan05455@gmail.com';

  // 1. Search broadly for the user
  console.log('=== Searching for user ===');
  
  // Exact match
  let user = await User.findOne({ email: targetEmail });
  
  if (!user) {
    // Try regex - Gmail ignores dots, so abdulhannan05455 == abdul.hannan05455
    const allUsers = await User.find({
      email: { $regex: /hannan/i }
    }).select('name email role vendorStatus emailVerified phone cnicNumber');
    
    console.log('\nAll users with "hannan" in email:');
    if (allUsers.length === 0) {
      console.log('  (none found)');
    }
    allUsers.forEach(u => {
      console.log(`  ${u.email} | role: ${u.role} | vendorStatus: ${u.vendorStatus} | verified: ${u.emailVerified} | id: ${u._id}`);
    });

    // Also list ALL vendors
    const allVendors = await User.find({ role: 'vendor' }).select('name email role vendorStatus emailVerified');
    console.log('\nAll vendors in DB:');
    if (allVendors.length === 0) {
      console.log('  (none found)');
    }
    allVendors.forEach(v => {
      console.log(`  ${v.email} | status: ${v.vendorStatus} | verified: ${v.emailVerified} | name: ${v.name}`);
    });

    // Check without dot (Gmail treats dots as irrelevant)
    const noDotEmail = 'abdulhannan05455@gmail.com';
    user = await User.findOne({ email: noDotEmail });
    if (user) {
      console.log(`\nFound user with no-dot variant: ${noDotEmail}`);
    }
  }

  if (!user) {
    // Last resort: list ALL users
    const allUsers = await User.find({}).select('name email role vendorStatus').limit(30);
    console.log('\nFirst 30 users in DB:');
    allUsers.forEach(u => {
      console.log(`  ${u.email} | role: ${u.role} | vendorStatus: ${u.vendorStatus || 'N/A'} | name: ${u.name}`);
    });
    
    console.log('\nUser not found. Nothing to delete.');
    await mongoose.disconnect();
    return;
  }

  console.log('\n=== Found user to delete ===');
  console.log('  Name:', user.name);
  console.log('  Email:', user.email);
  console.log('  Role:', user.role);
  console.log('  Vendor Status:', user.vendorStatus);
  console.log('  Email Verified:', user.emailVerified);
  console.log('  ID:', user._id);

  const userId = user._id;

  // 2. Delete all related data
  console.log('\n=== Deleting related data ===');

  const prodResult = await Product.deleteMany({ vendor: userId });
  console.log(`  Products deleted: ${prodResult.deletedCount}`);

  const orderResult = await Order.deleteMany({
    $or: [{ customer: userId }, { vendor: userId }]
  });
  console.log(`  Orders deleted: ${orderResult.deletedCount}`);

  const reviewResult = await Review.deleteMany({ user: userId });
  console.log(`  Reviews deleted: ${reviewResult.deletedCount}`);

  const wishlistResult = await Wishlist.deleteMany({ user: userId });
  console.log(`  Wishlist entries deleted: ${wishlistResult.deletedCount}`);

  const sessionResult = await Session.deleteMany({ userId: userId });
  console.log(`  Sessions deleted: ${sessionResult.deletedCount}`);

  // Delete conversations and messages
  const conversations = await Conversation.find({ participants: userId });
  const convIds = conversations.map(c => c._id);
  if (convIds.length > 0) {
    const msgResult = await Message.deleteMany({ conversation: { $in: convIds } });
    console.log(`  Messages deleted: ${msgResult.deletedCount}`);
    const convResult = await Conversation.deleteMany({ _id: { $in: convIds } });
    console.log(`  Conversations deleted: ${convResult.deletedCount}`);
  } else {
    console.log('  Messages deleted: 0');
    console.log('  Conversations deleted: 0');
  }

  // Delete uploaded files
  const uploadsDir = path.join(__dirname, '../uploads/verification');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    const userFiles = files.filter(f => f.startsWith(userId.toString()));
    userFiles.forEach(file => {
      fs.unlinkSync(path.join(uploadsDir, file));
      console.log(`  Deleted file: ${file}`);
    });
    if (userFiles.length === 0) {
      console.log('  No verification files found');
    }
  }

  // Delete profile images
  const profileDir = path.join(__dirname, '../uploads/profiles');
  if (fs.existsSync(profileDir)) {
    const files = fs.readdirSync(profileDir);
    const userFiles = files.filter(f => f.startsWith(userId.toString()));
    userFiles.forEach(file => {
      fs.unlinkSync(path.join(profileDir, file));
      console.log(`  Deleted profile file: ${file}`);
    });
  }

  // 3. Delete the user
  await User.deleteOne({ _id: userId });
  console.log('\n=== USER DELETED SUCCESSFULLY ===');
  console.log(`Email ${user.email} is now free for fresh registration.`);

  await mongoose.disconnect();
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
