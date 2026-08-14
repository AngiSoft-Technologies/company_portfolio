const jwt = require('jsonwebtoken');

// LEGACY file (kept for Dockerfile compat). Not imported by any route —
// all routes use src/middleware/auth.ts. No fallback secret: if JWT_SECRET
// is unset, verification fails closed instead of using a known-insecure key.
const JWT_SECRET = process.env.JWT_SECRET;

function requireAdminAuth(req, res, next) {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET not configured' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAdminAuth }; 