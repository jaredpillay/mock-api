const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const ACCESS_TOKEN_TTL = "1h";

function cryptoRandomId() {
  return uuidv4();
}

function signToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = {
  cryptoRandomId,
  signToken,
  validate,
};