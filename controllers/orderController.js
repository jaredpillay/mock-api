const db = require("../services/db");
const { cryptoRandomId } = require("../utils/helpers");

function createOrder(req, res) {
  const { items } = req.body;

  let total = 0;
  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) {
      return res.status(400).json({
        error: {
          code: "INVALID_PRODUCT",
          message: `Invalid productId: ${item.productId}`,
        },
      });
    }
    total += product.price * item.qty;
  }

  const order = {
    id: cryptoRandomId(),
    userId: req.auth.sub,
    items,
    total: Number(total.toFixed(2)),
    createdAt: new Date().toISOString(),
  };

  db.orders.push(order);
  res.status(201).json(order);
}

function getMyOrders(req, res) {
  const myOrders = db.orders.filter((o) => o.userId === req.auth.sub);
  res.json(myOrders);
}

module.exports = {
  createOrder,
  getMyOrders,
};