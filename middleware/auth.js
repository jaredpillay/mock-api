const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({
      error: { code: "AUTH_MISSING", message: "Missing or invalid Authorization header" },
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded; // { sub, email, role, iat, exp }
    return next();
  } catch {
    return res.status(401).json({
      error: { code: "AUTH_INVALID", message: "Invalid or expired token" },
    });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      });
    }
    next();
  };
}

module.exports = {
  authRequired,
  requireRole,
};