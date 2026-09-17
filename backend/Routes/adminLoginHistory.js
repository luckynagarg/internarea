const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const LoginHistoryModel = require('../Model/LoginHistory');


function parseIntSafe(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toDateOrNull(s) {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isFinite(d.getTime()) ? d : null;
}

router.get(
  '/login-history',


  asyncHandler(async (req, res) => {
    const {
      page,
      pageSize,
      search,

      browser,
      operatingSystem,
      deviceType,
      status,
      loginMethod,

      from,
      to,
    } = req.query || {};

    // Admin auth is already handled by parent /admin middleware chain.

    const p = Math.max(parseIntSafe(page, 1), 1);
    const ps = Math.min(Math.max(parseIntSafe(pageSize, 10), 1), 100);
    const skip = (p - 1) * ps;

    const query = {};

    // Search support: name/email/ip
    if (search) {
      const s = String(search).trim();
      if (s) {
        query.$or = [
          { name: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { ipAddress: { $regex: s, $options: 'i' } },
          { fullName: { $regex: s, $options: 'i' } },
          { emailAddress: { $regex: s, $options: 'i' } },
        ];
      }
    }

    // Filters
    if (browser) query.browser = String(browser);
    if (operatingSystem) query.operatingSystem = String(operatingSystem);
    if (deviceType) query.deviceType = String(deviceType);
    if (status) query.status = String(status);
    if (loginMethod) query.loginMethod = String(loginMethod);

    // Date range on createdAt
    const fromDate = toDateOrNull(from);
    const toDate = toDateOrNull(to);
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = fromDate;
      if (toDate) query.createdAt.$lte = toDate;
    }

    const sort = { createdAt: -1 };

    const total = await LoginHistoryModel.countDocuments(query);
    const items = await LoginHistoryModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(ps)
      .lean();

    const formatted = items.map((x) => ({
      id: x._id,
      userName: x.name || x.fullName || '',
      email: x.email || x.emailAddress || '',

      loginTime: x.loginTime,
      logoutTime: x.logoutTime || null,

      browser: x.browser || x.browserType || '',
      browserVersion: x.browserVersion || '',
      deviceType: x.deviceType || '',
      deviceName: x.deviceName || '',
      operatingSystem: x.operatingSystem || '',

      ipAddress: x.ipAddress || '',
      country: x.country || '',
      city: x.city || '',

      loginMethod: x.loginMethod || x.loginMethodRaw || '',
      status: x.status || x.loginStatus || '',
      otpVerified: !!x.otpVerified,
      failureReason: x.failureReason || '',

      createdAt: x.createdAt,
    }));

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.max(Math.ceil(total / ps), 1),
      },
    });
  })
);

module.exports = router;

