const bcrypt = require("bcryptjs");
const { cryptoRandomId, signToken } = require("../utils/helpers");
const db = require("../services/db");

async function register(req, res) {
  const { name, email, password, role } = req.body;

  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({
      error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" },
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: cryptoRandomId(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role ?? "user",
  };

  db.users.push(user);

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  const user = db.users.find((u) => u.email === email.toLowerCase());
  if (!user) {
    return res.status(400).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(400).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    });
  }

  const token = signToken(user);

  return res.json({
    message: "Login successful",
    token,
    expiresIn: "1h",
  });
}

function getMe(req, res) {
  const user = db.users.find((u) => u.id === req.auth.sub);
  if (!user) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

module.exports = {
  register,
  login,
  getMe,
};