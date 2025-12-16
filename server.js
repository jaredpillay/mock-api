const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { z } = require("zod");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/**
 * Config
 */
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const ACCESS_TOKEN_TTL = "1h";

/**
 * In-memory "DB"
 * (Perfect for Postman practice; no external services required)
 */
const db = {
  users: [],      // { id, name, email, passwordHash, role }
  products: [],   // { id, name, description, price, inStock, createdAt }
  orders: []      // { id, userId, items: [{productId, qty}], total, createdAt }
};

const id = () => cryptoRandomId();
function cryptoRandomId() {
  // small dependency-free id generator
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/**
 * Helpers
 */
function signToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({
      error: { code: "AUTH_MISSING", message: "Missing or invalid Authorization header" }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.auth = decoded; // { sub, email, role, iat, exp }
    return next();
  } catch {
    return res.status(401).json({
      error: { code: "AUTH_INVALID", message: "Invalid or expired token" }
    });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.auth?.role !== role) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Insufficient permissions" }
      });
    }
    next();
  };
}

/**
 * Validation Schemas
 */
const RegisterSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(["user", "admin"]).optional()
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const ProductCreateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(0).max(500).optional().default(""),
  price: z.number().positive(),
  inStock: z.boolean().optional().default(true)
});

const ProductUpdateSchema = ProductCreateSchema.partial();

const OrderCreateSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      qty: z.number().int().positive()
    })
  ).min(1)
});

/**
 * Standard error wrapper for Zod
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: result.error.issues.map(i => ({
            path: i.path.join("."),
            message: i.message
          }))
        }
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Health
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

/**
 * Auth
 */
app.post("/auth/register", validate(RegisterSchema), async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({
      error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" }
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: id(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role ?? "user"
  };

  db.users.push(user);

  return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

app.post("/auth/login", validate(LoginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = db.users.find(u => u.email === email.toLowerCase());
  if (!user) {
    return res.status(400).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(400).json({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
    });
  }

  const token = signToken(user);

  return res.json({
    message: "Login successful",
    token,
    expiresIn: ACCESS_TOKEN_TTL
  });
});

app.get("/auth/me", authRequired, (req, res) => {
  const user = db.users.find(u => u.id === req.auth.sub);
  if (!user) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

/**
 * Products (read is public; write is protected)
 */
app.get("/products", (req, res) => {
  res.json(db.products);
});

app.get("/products/:id", (req, res) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });
  res.json(product);
});

app.post("/products", authRequired, requireRole("admin"), validate(ProductCreateSchema), (req, res) => {
  const product = {
    id: id(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  db.products.push(product);
  res.status(201).json(product);
});

app.patch("/products/:id", authRequired, requireRole("admin"), validate(ProductUpdateSchema), (req, res) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });

  Object.assign(product, req.body);
  res.json(product);
});

app.delete("/products/:id", authRequired, requireRole("admin"), (req, res) => {
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });

  db.products.splice(idx, 1);
  res.status(204).send();
});

/**
 * Orders (user must be logged in)
 */
app.post("/orders", authRequired, validate(OrderCreateSchema), (req, res) => {
  const { items } = req.body;

  // Validate products exist + compute total
  let total = 0;
  for (const item of items) {
    const product = db.products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({
        error: {
          code: "INVALID_PRODUCT",
          message: `Invalid productId: ${item.productId}`
        }
      });
    }
    total += product.price * item.qty;
  }

  const order = {
    id: id(),
    userId: req.auth.sub,
    items,
    total: Number(total.toFixed(2)),
    createdAt: new Date().toISOString()
  };

  db.orders.push(order);
  res.status(201).json(order);
});

app.get("/orders/me", authRequired, (req, res) => {
  const myOrders = db.orders.filter(o => o.userId === req.auth.sub);
  res.json(myOrders);
});

/**
 * 404 fallback
 */
app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.listen(PORT, () => console.log(`Mock API running on http://localhost:${PORT}`));
