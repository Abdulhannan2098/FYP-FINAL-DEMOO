const UAParser = require('ua-parser-js');

// Parse device information from User-Agent
const parseDeviceInfo = (userAgent) => {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown',
      deviceType: 'Unknown',
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType = 'Desktop';
  if (result.device.type === 'mobile') {
    deviceType = 'Mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'Tablet';
  }

  return {
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    device: result.device.model || result.device.vendor || 'Unknown',
    deviceType,
  };
};

// Get IP address from request
const getIpAddress = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'Unknown'
  );
};

// Parse location from IP (basic implementation - can be enhanced with GeoIP service)
const parseLocation = async (ip) => {
  // For development/basic implementation
  // In production, use services like MaxMind GeoIP2, IP2Location, or ipapi.co

  // Remove IPv6 prefix if present
  const cleanIp = ip.replace('::ffff:', '');

  // Check if it's localhost
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return {
      ip: cleanIp,
      country: 'Local',
      city: 'Localhost',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  // For production, implement actual GeoIP lookup here
  // Example with ipapi.co (free tier):
  // try {
  //   const response = await fetch(`https://ipapi.co/${cleanIp}/json/`);
  //   const data = await response.json();
  //   return {
  //     ip: cleanIp,
  //     country: data.country_name || 'Unknown',
  //     city: data.city || 'Unknown',
  //     timezone: data.timezone || 'Unknown',
  //   };
  // } catch (error) {
  //   console.error('GeoIP lookup failed:', error);
  // }

  return {
    ip: cleanIp,
    country: 'Unknown',
    city: 'Unknown',
    timezone: 'Unknown',
  };
};

// Extract session info from request
const extractSessionInfo = async (req) => {
  const userAgent = req.headers['user-agent'];
  const ip = getIpAddress(req);

  const deviceInfo = parseDeviceInfo(userAgent);
  const location = await parseLocation(ip);

  return {
    deviceInfo,
    location,
  };
};

// Format session for display
const formatSessionDisplay = (session) => {
  const { deviceInfo, location, lastActivity, loginAt, isTrusted } = session;

  // Format device name
  let deviceName = deviceInfo.browser;
  if (deviceInfo.os !== 'Unknown') {
    deviceName += ` on ${deviceInfo.os}`;
  }

  // Format location
  let locationStr = 'Unknown location';
  if (location.city !== 'Unknown' && location.country !== 'Unknown') {
    locationStr = `${location.city}, ${location.country}`;
  } else if (location.country !== 'Unknown') {
    locationStr = location.country;
  } else if (location.ip !== 'Unknown') {
    locationStr = location.ip;
  }

  // Time ago helper
  const getTimeAgo = (date) => {
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return new Date(date).toLocaleDateString();
  };

  return {
    id: session._id,
    deviceName,
    deviceType: deviceInfo.deviceType,
    location: locationStr,
    ipAddress: location.ip,
    lastActive: getTimeAgo(lastActivity),
    loginDate: new Date(loginAt).toLocaleDateString(),
    isCurrent: false, // Will be set by controller
    isTrusted,
    isActive: session.isActive,
  };
};

module.exports = {
  parseDeviceInfo,
  getIpAddress,
  parseLocation,
  extractSessionInfo,
  formatSessionDisplay,
};
