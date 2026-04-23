const mongoose = require('mongoose');
const env = require('../config/env');
const Product = require('../models/Product');

const run = async () => {
  const uri = env.MONGODB_URI || 'mongodb://127.0.0.1:27017/AutoSphere_db';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    const products = await Product.find({
      $or: [
        { 'model3D.glbFile': { $ne: null } },
        { 'model3D.usdzFile': { $ne: null } },
      ],
    })
      .select('name model3D.glbFile model3D.usdzFile')
      .sort({ createdAt: -1 })
      .lean();

    const rows = products.map((product) => ({
      Product: product.name,
      GLB_URL: product.model3D?.glbFile || null,
      USDZ_URL: product.model3D?.usdzFile || null,
    }));

    if (rows.length === 0) {
      console.log('No products currently have stored 3D model URLs.');
    } else {
      console.table(rows);
    }
  } catch (error) {
    console.error('Failed to list 3D model URLs:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

run();
