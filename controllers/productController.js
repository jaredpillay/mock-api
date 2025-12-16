const db = require("../services/db");
const { cryptoRandomId } = require("../utils/helpers");

function getAllProducts(req, res) {
  res.json(db.products);
}

function getProductById(req, res) {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });
  }
  res.json(product);
}

function createProduct(req, res) {
  const product = {
    id: cryptoRandomId(),
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  db.products.push(product);
  res.status(201).json(product);
}

function updateProduct(req, res) {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });
  }
  Object.assign(product, req.body);
  res.json(product);
}

function deleteProduct(req, res) {
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Product not found" } });
  }
  db.products.splice(idx, 1);
  res.status(204).send();
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};