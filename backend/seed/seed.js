const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/user');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');
const Session = require('../models/Session');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ChatNotification = require('../models/ChatNotification');
const env = require('../config/env');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    await Promise.all([
      ChatNotification.deleteMany(),
      Message.deleteMany(),
      Conversation.deleteMany(),
      Review.deleteMany(),
      Wishlist.deleteMany(),
      Order.deleteMany(),
      Session.deleteMany(),
      Product.deleteMany(),
      User.deleteMany(),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin123@autosphere.com',
      password: 'Admin@123',
      role: 'admin',
      phone: '+92 300 0000000',
      address: {
        street: '1-A, Gulberg III',
        city: 'Islamabad',
        state: 'ICT',
        zipCode: '44000',
        country: 'Pakistan',
      },
    });

    // Create Vendors
    const vendor1 = await User.create({
      name: 'Ali Hammad',
      email: 'ali.hammad@autosphere.pk',
      password: 'Vendor@123',
      role: 'vendor',
      phone: '+92 321 1112233',
      address: {
        street: 'Shop 12, Montgomery Road',
        city: 'Islamabad',
        state: 'ICT',
        zipCode: '44000',
        country: 'Pakistan',
      },
    });

    const vendor2 = await User.create({
      name: 'Ahmad',
      email: 'ahmad@autosphere.pk',
      password: 'Vendor@123',
      role: 'vendor',
      phone: '+92 333 9876543',
      address: {
        street: 'Office 7, I-8 Markaz',
        city: 'Islamabad',
        state: 'ICT',
        zipCode: '44000',
        country: 'Pakistan',
      },
    });

    // Create Customers
    const customer1 = await User.create({
      name: 'Ayesha Khan',
      email: 'ayesha.khan@example.pk',
      password: 'Customer@123',
      role: 'customer',
      phone: '+92 300 1234567',
      address: {
        street: 'House 22, Block B',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '74000',
        country: 'Pakistan',
      },
    });

    const customer2 = await User.create({
      name: 'Bilal Ahmed',
      email: 'bilal.ahmed@example.pk',
      password: 'Customer@123',
      role: 'customer',
      phone: '+92 301 7654321',
      address: {
        street: 'Street 4, Satellite Town',
        city: 'Rawalpindi',
        state: 'Punjab',
        zipCode: '46000',
        country: 'Pakistan',
      },
    });

    console.log('✅ Created users');

    // Create Demo Products (PKR pricing) — 12 items, unique images, category-matched
    // Price tweak for demo: assign each product a random PKR price in a fixed range.
    const randomInt = (min, max) => {
      const minInt = Math.ceil(min);
      const maxInt = Math.floor(max);
      return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
    };
    const randomPrice = () => randomInt(5000, 15000);

    const now = new Date();
    const products = [
      {
        name: 'Civic X Carbon Style Trunk Spoiler (Gloss Black)',
        description: 'Aerodynamic trunk spoiler for Honda Civic 10th Gen. Durable ABS with gloss finish — perfect for daily drive in Islamabad traffic.',
        price: randomPrice(),
        category: 'Spoilers',
        stock: 22,
        vendor: vendor1._id,
        images: ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'Corolla Altis Ducktail Spoiler (Matte Black)',
        description: 'Clean ducktail look for Toyota Corolla Altis. Includes 3M tape + mounting guide. Weather-resistant for Karachi coastal humidity.',
        price: randomPrice(),
        category: 'Spoilers',
        stock: 18,
        vendor: vendor2._id,
        images: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: '18" Alloy Wheels — Gunmetal (Set of 4)',
        description: 'Premium gunmetal alloy wheels, 18-inch. Balanced for comfort + stance on Pakistani roads. Ideal for Civic/Corolla bolt patterns.',
        price: randomPrice(),
        category: 'Rims & Wheels',
        stock: 7,
        vendor: vendor1._id,
        images: ['https://images.unsplash.com/photo-1513267048331-5611cad62e41?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: '17" Chrome Finish Wheels — Street Edition (Set of 4)',
        description: 'Chrome finish street wheels, 17-inch. Great for daily use and weekend meets in Islamabad.',
        price: randomPrice(),
        category: 'Rims & Wheels',
        stock: 9,
        vendor: vendor2._id,
        images: ['https://images.unsplash.com/photo-1546768292-fb12f6c92568?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'Sport Body Kit — Civic X (Front Lip + Side Skirts)',
        description: 'ABS sport kit for Honda Civic X. Adds aggressive stance while keeping ground clearance reasonable for speed breakers.',
        price: randomPrice(),
        category: 'Body Kits',
        stock: 10,
        vendor: vendor1._id,
        images: ['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'Universal Side Skirts — Durable ABS (Pair)',
        description: 'Universal side skirts (pair). Trim-to-fit design. Great upgrade for Swift/City/Corolla builds.',
        price: randomPrice(),
        category: 'Body Kits',
        stock: 26,
        vendor: vendor2._id,
        images: ['https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'Bonnet (Hood) — Vent Style (Gloss Black)',
        description: 'Aftermarket bonnet/hood with vent styling. Lightweight and designed to improve airflow aesthetics for track-inspired builds.',
        price: randomPrice(),
        category: 'Hoods',
        stock: 4,
        vendor: vendor1._id,
        images: ['https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'Hood Struts Kit — Smooth Lift (Pair)',
        description: 'Gas struts for smoother hood lift. Easy install with brackets. Keeps your engine bay access convenient.',
        price: randomPrice(),
        category: 'Hoods',
        stock: 35,
        vendor: vendor2._id,
        images: ['https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'RGB LED Underglow Kit — Waterproof (4 Bars)',
        description: 'RGB underglow kit with app control. Bright, waterproof, and perfect for night drives and car meets.',
        price: randomPrice(),
        category: 'LED Lights',
        stock: 40,
        vendor: vendor1._id,
        images: ['https://images.unsplash.com/photo-1469285994282-454ceb49e63c?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'LED Projector Headlights — White Beam (Pair)',
        description: 'Projector-style headlights with crisp white beam. Better night visibility on highways and city roads.',
        price: randomPrice(),
        category: 'LED Lights',
        stock: 6,
        vendor: vendor2._id,
        images: ['https://images.unsplash.com/photo-1485463611174-f302f6a5c1c9?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'Cat-Back Exhaust — Deep Tone (Stainless Steel)',
        description: 'Stainless cat-back exhaust with deep tone (not too loud). Great for Civic/City builds while keeping daily comfort.',
        price: randomPrice(),
        category: 'Exhaust Systems',
        stock: 8,
        vendor: vendor1._id,
        images: ['https://images.unsplash.com/photo-1486006920555-c77dcf18193b?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
      {
        name: 'Premium Seat Covers — Black/Red Stitch (Set)',
        description: 'Comfortable seat covers with red stitching. Designed for Pakistani weather; easy to clean after long drives.',
        price: randomPrice(),
        category: 'Interior Accessories',
        stock: 28,
        vendor: vendor2._id,
        images: ['https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=1200&h=800&fit=crop'],
        isApproved: true,
        approvalStatus: 'Approved',
        approvedBy: admin._id,
        approvedAt: now,
      },
    ];

    await Product.insertMany(products);
    console.log('✅ Created sample products');

    console.log('\n🎉 Database seeded successfully!\n');
    console.log('📧 Test Accounts:');
    console.log('─────────────────────────────────────');
    console.log('Admin:');
    console.log('  Email: admin123@autosphere.com');
    console.log('  Password: Admin@123\n');
    console.log('Vendors:');
    console.log('  Email: ali.hammad@autosphere.pk | Password: Vendor@123');
    console.log('  Email: ahmad@autosphere.pk | Password: Vendor@123\n');
    console.log('Customers:');
    console.log('  Email: ayesha.khan@example.pk | Password: Customer@123');
    console.log('  Email: bilal.ahmed@example.pk | Password: Customer@123');
    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error(`❌ Seeding Error: ${error.message}`);
    process.exit(1);
  }
};

// Run seeder
connectDB().then(() => seedData());