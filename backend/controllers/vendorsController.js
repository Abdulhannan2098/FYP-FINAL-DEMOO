const User = require('../models/user');

// @desc    Get vendor options for filters
// @route   GET /api/vendors
// @access  Public
exports.getVendorOptions = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 200 } = req.query;

    const normalizedSearch = String(search).trim();
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      role: 'vendor',
      ...(normalizedSearch && {
        name: { $regex: normalizedSearch, $options: 'i' },
      }),
    };

    const [vendors, total] = await Promise.all([
      User.find(query)
        .select('_id name')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      User.countDocuments(query).exec(),
    ]);

    const mappedVendors = vendors.map((vendor) => ({
      id: String(vendor._id),
      name: vendor.name,
    }));

    res.status(200).json(mappedVendors);
  } catch (error) {
    next(error);
  }
};
