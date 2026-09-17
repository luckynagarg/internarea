const express = require('express');
const router = express.Router();

const asyncHandler = require('../middleware/asyncHandler');
const LoginHistoryModel = require('../Model/LoginHistory');
const { generateCsv, generateExcelLikeHtmlTable } = require('../utils/exportLoginHistory');

function parseIntSafe(v, fallback) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toDateOrNull(s) {
  if (!s) return null;
  const d = new Date(String(s));
  return Number.isFinite(d.getTime()) ? d : null;
}

function buildQueryFromReqQuery(q) {
  const {
    search,

    browser,
    operatingSystem,
    deviceType,
    status,
    loginMethod,

    from,
    to,
  } = q || {};

  const query = {};

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

  if (browser) query.browser = String(browser);
  if (operatingSystem) query.operatingSystem = String(operatingSystem);
  if (deviceType) query.deviceType = String(deviceType);
  if (status) query.status = String(status);
  if (loginMethod) query.loginMethod = String(loginMethod);

  const fromDate = toDateOrNull(from);
  const toDate = toDateOrNull(to);
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = fromDate;
    if (toDate) query.createdAt.$lte = toDate;
  }

  return query;
}

function mapRow(x) {
  return {
    user: x.name || x.fullName || '',
    email: x.email || x.emailAddress || '',
    loginTime: x.loginTime || '',
    browser: x.browser || x.browserType || '',
    browserVersion: x.browserVersion || '',
    device: x.deviceType || '',
    operatingSystem: x.operatingSystem || '',
    ip: x.ipAddress || '',
    country: x.country || '',
    city: x.city || '',
    loginMethod: x.loginMethod || x.loginMethodRaw || '',
    status: x.status || x.loginStatus || '',
    otpVerified: x.otpVerified ? 'true' : 'false',
    failureReason: x.failureReason || '',
  };
}

const columns = [
  'user',
  'email',
  'loginTime',
  'browser',
  'browserVersion',
  'device',
  'operatingSystem',
  'ip',
  'country',
  'city',
  'loginMethod',
  'status',
  'otpVerified',
  'failureReason',
];

router.get(
  '/export/csv',

  asyncHandler(async (req, res) => {
    const query = buildQueryFromReqQuery(req.query);

    const rows = await LoginHistoryModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const mapped = rows.map(mapRow);
    const csv = generateCsv(mapped, columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="login-history.csv"');
    return res.send(csv);
  })
);

router.get(
  '/export/excel',
  asyncHandler(async (req, res) => {
    const query = buildQueryFromReqQuery(req.query);

    const rows = await LoginHistoryModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const mapped = rows.map(mapRow);
    const html = generateExcelLikeHtmlTable(mapped, columns);

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="login-history.xls"');
    return res.send(html);
  })
);

module.exports = router;

