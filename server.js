const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { authRequired, requireRole } = require("./middleware/auth");
const { RegisterSchema, LoginSchema, ProductCreateSchema, ProductUpdateSchema, OrderCreateSchema } = require("./models/validationSchemas");
const { validate } = require("./utils/helpers");
const authController = require("./controllers/authController");
const productController = require("./controllers/productController");
const orderController = require("./controllers/orderController");
const db = require("./services/db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/**
 * Config
 */
const PORT = process.env.PORT || 3000;

/**
 * Routes
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Auth routes
app.post("/auth/register", validate(RegisterSchema), authController.register);
app.post("/auth/login", validate(LoginSchema), authController.login);
app.get("/auth/me", authRequired, authController.getMe);

// Product routes
app.get("/products", productController.getAllProducts);
app.get("/products/:id", productController.getProductById);
app.post("/products", authRequired, requireRole("admin"), validate(ProductCreateSchema), productController.createProduct);
app.patch("/products/:id", authRequired, requireRole("admin"), validate(ProductUpdateSchema), productController.updateProduct);
app.delete("/products/:id", authRequired, requireRole("admin"), productController.deleteProduct);

// Order routes
app.post("/orders", authRequired, validate(OrderCreateSchema), orderController.createOrder);
app.get("/orders/me", authRequired, orderController.getMyOrders);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.listen(PORT, () => console.log(`Mock API running on http://localhost:${PORT}`));
